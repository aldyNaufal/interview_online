# routes/participant_management.py - Fixed to use AsyncSession consistently
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from livekit import api
import logging
from datetime import timedelta, datetime
import os
import json

from models.schemas import TokenRequestWithAuth, TokenResponse
from config.livekit_config import get_livekit_api
from auth.security import require_user_or_admin, require_admin
from auth.schemas import TokenData
from database.models import UserRole, Room
from database.connection import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

# routes/participant_management.py - Enhanced token endpoint
@router.post("/token", response_model=TokenResponse)
async def generate_livekit_token(
    request: TokenRequestWithAuth, 
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    try:
        logger.info(f"Token request received: {request}")
        logger.info(f"Current user: {current_user}")
        # Enhanced validation
        if not request.roomName or not request.roomName.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room name cannot be empty"
            )
        
        if not request.participantName or not request.participantName.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Participant name cannot be empty"
            )
        
        db_room = None
        room_name = request.roomName.strip()
        
        # Handle admin vs user access differently
        if current_user.role == UserRole.ADMIN:
            # Admins can access any room by name or create new ones
            result = await db.execute(
                select(Room).where(
                    Room.name == room_name,
                    Room.is_active == True
                )
            )
            db_room = result.scalar_one_or_none()
            
            # Create room if doesn't exist (admin privilege)
            if not db_room:
                await ensure_room_exists(room_name, max_participants=100)
                db_room = Room(
                    name=room_name,
                    max_participants=100,
                    created_by=current_user.user_id,
                    is_active=True
                )
                db.add(db_room)
                await db.commit()
                await db.refresh(db_room)
                logger.info(f"Created new room: {room_name} for admin")
        else:
            # Users must provide valid room access
            if request.roomId:
                # Access by room ID (primary method for users)
                result = await db.execute(
                    select(Room).where(
                        Room.room_id == request.roomId,
                        Room.is_active == True
                    )
                )
                db_room = result.scalar_one_or_none()
                
                if db_room:
                    room_name = db_room.name  # Use actual room name
            else:
                # Fallback: access public room by name
                result = await db.execute(
                    select(Room).where(
                        Room.name == room_name,
                        Room.is_active == True,
                        Room.is_private == False
                    )
                )
                db_room = result.scalar_one_or_none()
            
            # Room validation for users
            if not db_room:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Room not found. Please verify your room ID or contact the meeting organizer."
                )
            
            # Password verification
            if db_room.has_password:
                if not request.roomPassword:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="This room requires a password"
                    )
                
                if not db_room.verify_password(request.roomPassword):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Incorrect room password"
                    )
        
        # Verify LiveKit room exists
        room_exists = await check_room_exists(room_name)
        if not room_exists:
            if current_user.role == UserRole.ADMIN:
                await ensure_room_exists(room_name, max_participants=db_room.max_participants)
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Room is temporarily unavailable. Please try again shortly."
                )
        
        # Generate token with proper error handling
        api_key = os.getenv("LIVEKIT_API_KEY")
        api_secret = os.getenv("LIVEKIT_API_SECRET")
        ws_url = os.getenv("LIVEKIT_URL")
        
        if not all([api_key, api_secret, ws_url]):
            logger.error("Missing LiveKit configuration")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Video service configuration error"
            )
        
        # Create and configure token
        token = api.AccessToken(api_key, api_secret)
        token.with_identity(request.participantName.strip())
        token.with_name(request.participantName.strip())
        token.with_grants(get_role_based_grants(current_user.role, room_name))
        token.with_ttl(timedelta(hours=24))
        
        # Enhanced metadata
        metadata = {
            "role": current_user.role.value,
            "username": current_user.username,
            "user_id": current_user.user_id,
            "room_id": db_room.room_id if db_room else None,
            "joined_at": datetime.utcnow().isoformat()
        }
        if request.metadata:
            metadata.update(request.metadata)
        
        token.with_metadata(json.dumps(metadata))
        jwt_token = token.to_jwt()
        
        logger.info(f"Token generated successfully for {request.participantName} in {room_name}")
        
        return TokenResponse(
            token=jwt_token,
            wsUrl=ws_url,
            roomName=room_name,
            participantName=request.participantName.strip(),
            roomInfo={
                "roomId": db_room.room_id if db_room else None,
                "isPrivate": db_room.is_private if db_room else False,
                "hasPassword": db_room.has_password if db_room else False,
                "maxParticipants": db_room.max_participants if db_room else 100
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate access token. Please try again."
        )

@router.post("/join-room")
async def join_room_by_id(
    request: dict,  # Accept JSON body
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)  # FIXED: Use AsyncSession
):
    """Join room by room ID"""
    try:
        room_id = request.get("room_id")
        password = request.get("password")
        
        if not room_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room ID is required"
            )
        
        # Find room by ID
        result = await db.execute(
            select(Room).where(
                Room.room_id == room_id,
                Room.is_active == True
            )
        )
        db_room = result.scalar_one_or_none()
        
        if not db_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found"
            )
        
        # Check password if required
        if db_room.has_password:
            if not password:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Room password required"
                )
            
            if not db_room.verify_password(password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid room password"
                )
        
        return {
            "roomName": db_room.name,
            "roomId": db_room.room_id,
            "maxParticipants": db_room.max_participants,
            "isPrivate": db_room.is_private,
            "hasPassword": db_room.has_password,
            "message": "Room access granted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Join room error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join room: {str(e)}"
        )

def get_role_based_grants(role: UserRole, room_name: str) -> api.VideoGrants:
    """Generate LiveKit grants based on user role"""
    
    if role == UserRole.ADMIN:
        # Admins have full permissions
        return api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_update_own_metadata=True,
            room_admin=True,
            room_create=True
        )
    else:
        # Users have basic permissions
        return api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            can_update_own_metadata=False
        )

async def check_room_exists(room_name: str) -> bool:
    """Check if a room exists"""
    try:
        async with get_livekit_api() as lk_api:
            list_request = api.ListRoomsRequest()
            rooms_response = await lk_api.room.list_rooms(list_request)
            
            for room in rooms_response.rooms:
                if room.name == room_name:
                    return True
            return False
    except Exception as e:
        logger.error(f"Error checking room existence: {e}")
        return False

async def ensure_room_exists(room_name: str, max_participants: int = 100):
    """Ensure room exists (admin only)"""
    try:
        async with get_livekit_api() as lk_api:
            list_request = api.ListRoomsRequest()
            rooms_response = await lk_api.room.list_rooms(list_request)
            
            # Check if room exists
            for room in rooms_response.rooms:
                if room.name == room_name:
                    logger.info(f"Room {room_name} already exists")
                    return
            
            # Create room
            room_opts = api.CreateRoomRequest(
                name=room_name,
                max_participants=max_participants,
                metadata=""
            )
            
            room = await lk_api.room.create_room(room_opts)
            logger.info(f"Room created: {room_name} (SID: {room.sid})")
            
    except Exception as e:
        logger.error(f"Error ensuring room exists: {e}")
        raise

# Admin-only participant management endpoints
@router.post("/admin/room/{room_name}/mute/{participant_identity}")
async def admin_mute_participant(
    room_name: str, 
    participant_identity: str,
    current_user: TokenData = Depends(require_admin)
):
    """Admin only: Mute participant"""
    try:
        async with get_livekit_api() as lk_api:
            mute_request = api.MuteRoomTrackRequest(
                room=room_name,
                identity=participant_identity,
                track_sid="",
                muted=True
            )
            await lk_api.room.mute_published_track(mute_request)
            
            logger.info(f"Admin {current_user.username} muted {participant_identity} in {room_name}")
            
            return {
                "roomName": room_name,
                "participantIdentity": participant_identity,
                "status": "muted",
                "moderator": current_user.username
            }
        
    except Exception as e:
        logger.error(f"Mute error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mute participant: {str(e)}"
        )

@router.post("/admin/room/{room_name}/kick/{participant_identity}")
async def admin_kick_participant(
    room_name: str, 
    participant_identity: str,
    current_user: TokenData = Depends(require_admin)
):
    """Admin only: Kick participant"""
    try:
        async with get_livekit_api() as lk_api:
            remove_request = api.RoomParticipantIdentity(
                room=room_name,
                identity=participant_identity
            )
            await lk_api.room.remove_participant(remove_request)
            
            logger.info(f"Admin {current_user.username} kicked {participant_identity} from {room_name}")
            
            return {
                "roomName": room_name,
                "participantIdentity": participant_identity,
                "status": "removed",
                "moderator": current_user.username
            }
        
    except Exception as e:
        logger.error(f"Kick error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to kick participant: {str(e)}"
        )

@router.get("/room/{room_name}/participants")
async def get_room_participants(
    room_name: str,
    current_user: TokenData = Depends(require_user_or_admin)
):
    """Get room participants"""
    try:
        async with get_livekit_api() as lk_api:
            participants_request = api.ListParticipantsRequest(room=room_name)
            participants_response = await lk_api.room.list_participants(participants_request)
            
            participant_list = []
            for p in participants_response.participants:
                participant_info = {
                    "identity": p.identity,
                    "name": p.name,
                    "sid": p.sid,
                    "state": p.state.name if hasattr(p.state, 'name') else str(p.state),
                    "joinedAt": p.joined_at,
                    "metadata": p.metadata
                }
                
                # Only admins see full details
                if current_user.role == UserRole.ADMIN:
                    participant_info["permission"] = {
                        "canPublish": p.permission.can_publish,
                        "canSubscribe": p.permission.can_subscribe,
                        "canPublishData": p.permission.can_publish_data
                    }
                
                participant_list.append(participant_info)
            
            return {
                "roomName": room_name,
                "participants": participant_list,
                "total": len(participant_list),
                "viewerRole": current_user.role.value
            }
        
    except Exception as e:
        logger.error(f"Get participants error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get participants: {str(e)}"
        )

