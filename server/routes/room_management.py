# routes/room_management.py - Fixed to use room_metadata consistently
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from livekit import api
import logging

from models.schemas import CreateRoomRequest, RoomInfo, RoomResponse
from config.livekit_config import get_livekit_api
from auth.security import require_admin, require_user_or_admin
from auth.schemas import TokenData
from database.models import UserRole, Room
from database.connection import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/admin/room", response_model=RoomResponse)
async def create_room(
    request: CreateRoomRequest, 
    current_user: TokenData = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    try:
        logger.info(f"Admin {current_user.username} creating room: {request.roomName}")
        
        # Check if room already exists in database
        result = await db.execute(
            select(Room).where(Room.name == request.roomName, Room.is_active == True)
        )
        existing_room = result.scalar_one_or_none()
        
        if existing_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room '{request.roomName}' already exists"
            )
        
        # Create room in LiveKit first
        async with get_livekit_api() as lk_api:
            room_opts = api.CreateRoomRequest(
                name=request.roomName,
                max_participants=request.maxParticipants or 50,
                metadata=request.metadata or ""
            )
            
            livekit_room = await lk_api.room.create_room(room_opts)
        
        # Create room record in database
        db_room = Room(
            name=request.roomName,
            max_participants=request.maxParticipants or 50,
            room_metadata=request.metadata,  # FIXED: Use room_metadata
            is_private=request.isPrivate or False,
            created_by=current_user.user_id
        )
        
        # Set password if provided
        if request.password:
            db_room.set_password(request.password)
        
        db.add(db_room)
        await db.commit()
        await db.refresh(db_room)
        
        logger.info(f"Room created: {request.roomName} (ID: {db_room.room_id}) by {current_user.username}")
        
        return RoomResponse(
            roomName=db_room.name,
            sid=livekit_room.sid,
            maxParticipants=db_room.max_participants,
            creationTime=livekit_room.creation_time,
            metadata=db_room.room_metadata,  # FIXED: Use room_metadata
            status="created",
            roomId=db_room.room_id,
            isPrivate=db_room.is_private,
            hasPassword=db_room.has_password
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Room creation error: {e}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create room: {str(e)}"
        )

@router.get("/rooms")
async def list_rooms(
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """List available rooms (users only see public rooms)"""
    try:
        # Get rooms from database
        query = select(Room).where(Room.is_active == True)
        
        # Users only see public rooms
        if current_user.role == UserRole.USER:
            query = query.filter(Room.is_private == False)
        
        result = await db.execute(query)
        db_rooms = result.scalars().all()
        
        # Get LiveKit room data for active rooms
        async with get_livekit_api() as lk_api:
            list_request = api.ListRoomsRequest()
            livekit_rooms = await lk_api.room.list_rooms(list_request)
            
            # Create lookup for LiveKit rooms
            livekit_room_map = {room.name: room for room in livekit_rooms.rooms}
        
        room_list = []
        for db_room in db_rooms:
            livekit_room = livekit_room_map.get(db_room.name)
            
            room_info = {
                "name": db_room.name,
                "roomId": db_room.room_id,
                "numParticipants": livekit_room.num_participants if livekit_room else 0,
                "maxParticipants": db_room.max_participants,
                "creationTime": db_room.created_at.timestamp(),
                "isPrivate": db_room.is_private,
                "hasPassword": db_room.has_password,
                "isActive": bool(livekit_room)  # Room exists in LiveKit
            }
            
            # Only admins see sensitive info
            if current_user.role == UserRole.ADMIN:
                room_info.update({
                    "sid": livekit_room.sid if livekit_room else None,
                    "metadata": db_room.room_metadata,  # FIXED: Use room_metadata
                    "createdBy": db_room.creator.username if db_room.creator else None
                })
            
            room_list.append(room_info)
        
        return {
            "rooms": room_list,
            "total": len(room_list),
            "viewerRole": current_user.role.value
        }
        
    except Exception as e:
        logger.error(f"List rooms error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list rooms: {str(e)}"
        )

@router.get("/room/{room_identifier}")
async def get_room_info(
    room_identifier: str,  # Can be room name or room ID
    current_user: TokenData = Depends(require_user_or_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get room information by name or ID"""
    try:
        # Find room by name or ID
        result = await db.execute(
            select(Room)
            .options(selectinload(Room.creator))
            .where(
                (Room.name == room_identifier) | (Room.room_id == room_identifier),
                Room.is_active == True
            )
        )
        db_room = result.scalar_one_or_none()
        
        if not db_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room '{room_identifier}' not found"
            )
        
        # Users cannot access private rooms without proper access
        if (current_user.role == UserRole.USER and 
            db_room.is_private and 
            room_identifier != db_room.room_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to private room"
            )
        
        # Get LiveKit room data
        async with get_livekit_api() as lk_api:
            list_request = api.ListRoomsRequest()
            rooms_response = await lk_api.room.list_rooms(list_request)
            
            livekit_room = None
            for room in rooms_response.rooms:
                if room.name == db_room.name:
                    livekit_room = room
                    break
            
            participants = []
            if livekit_room:
                participants_request = api.ListParticipantsRequest(room=db_room.name)
                participants_response = await lk_api.room.list_participants(participants_request)
                participants = [p.name for p in participants_response.participants]
        
        room_info = {
            "name": db_room.name,
            "roomId": db_room.room_id,
            "numParticipants": livekit_room.num_participants if livekit_room else 0,
            "participants": participants,
            "maxParticipants": db_room.max_participants,
            "creationTime": db_room.created_at.timestamp(),
            "isPrivate": db_room.is_private,
            "hasPassword": db_room.has_password,
            "isActive": bool(livekit_room)
        }
        
        # Only admins see full details
        if current_user.role == UserRole.ADMIN:
            room_info.update({
                "sid": livekit_room.sid if livekit_room else None,
                "metadata": db_room.room_metadata,  # FIXED: Use room_metadata
                "createdBy": db_room.creator.username if db_room.creator else None
            })
        
        return room_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get room info error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get room info: {str(e)}"
        )

@router.delete("/admin/room/{room_identifier}")
async def delete_room(
    room_identifier: str,  # Can be room name or room ID
    current_user: TokenData = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: Delete a room"""
    try:
        # Find room by name or ID
        result = await db.execute(
            select(Room).where(
                (Room.name == room_identifier) | (Room.room_id == room_identifier),
                Room.is_active == True
            )
        )
        db_room = result.scalar_one_or_none()
        
        if not db_room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room '{room_identifier}' not found"
            )
        
        # Delete from LiveKit
        async with get_livekit_api() as lk_api:
            try:
                delete_request = api.DeleteRoomRequest(room=db_room.name)
                await lk_api.room.delete_room(delete_request)
            except Exception as e:
                logger.warning(f"LiveKit room deletion warning: {e}")
        
        # Mark as inactive in database (soft delete)
        await db.execute(
            update(Room).where(Room.id == db_room.id).values(is_active=False)
        )
        await db.commit()
        
        logger.info(f"Admin {current_user.username} deleted room: {db_room.name} (ID: {db_room.room_id})")
        
        return {
            "roomName": db_room.name,
            "roomId": db_room.room_id,
            "status": "deleted",
            "message": f"Room '{db_room.name}' has been deleted",
            "deletedBy": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete room error: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete room: {str(e)}"
        )