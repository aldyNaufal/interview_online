from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel

from routers.websocket import connection_manager, room_service
from models.room import RoomSettings
from utils.logger import logger

router = APIRouter(prefix="/api")

# Request models
class CreateRoomRequest(BaseModel):
    name: str
    host_id: str
    settings: Optional[RoomSettings] = None

class UpdateRoomRequest(BaseModel):
    name: Optional[str] = None
    is_locked: Optional[bool] = None
    password: Optional[str] = None

class CreateBreakoutRoomRequest(BaseModel):
    name: str
    max_participants: int = 10
    allowed_users: List[str] = []


@router.post("/rooms")
async def create_room(request: CreateRoomRequest):
    """Create a new room"""
    try:
        room_id = await room_service.create_room(
            name=request.name,
            host_id=request.host_id,
            settings=request.settings
        )
        
        room_info = room_service.get_room_info(room_id)
        if not room_info:
            raise HTTPException(status_code=500, detail="Failed to create room")
        
        return {
            "room_id": room_id,
            "room_info": room_info["room_info"],
            "message": "Room created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating room: {e}")
        raise HTTPException(status_code=500, detail="Failed to create room")


@router.get("/rooms/{room_id}")
async def get_room(room_id: str):
    """Get room information"""
    room_info = room_service.get_room_info(room_id)
    if not room_info:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return room_info


@router.put("/rooms/{room_id}")
async def update_room(room_id: str, request: UpdateRoomRequest):
    """Update room settings"""
    if room_id not in connection_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    try:
        room_info = connection_manager.rooms[room_id]
        
        # Update room properties
        if request.name is not None:
            room_info.name = request.name
        if request.is_locked is not None:
            room_info.is_locked = request.is_locked
        if request.password is not None:
            room_info.password = request.password
        
        # Notify participants of changes
        await connection_manager.broadcast_to_room({
            "type": "room_updated",
            "room_info": room_info.dict()
        }, room_id)
        
        return {
            "room_info": room_info.dict(),
            "message": "Room updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating room {room_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update room")


@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str):
    """Delete a room"""
    success = await room_service.delete_room(room_id)
    if not success:
        raise HTTPException(status_code=404, detail="Room not found")
    
    return {"message": "Room deleted successfully"}


@router.get("/rooms/{room_id}/participants")
async def get_room_participants(room_id: str):
    """Get room participants"""
    if room_id not in connection_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    participants = connection_manager.get_room_participants(room_id)
    return {"participants": participants}


@router.get("/rooms/{room_id}/chat")
async def get_chat_messages(room_id: str, limit: int = 50):
    """Get chat messages for a room"""
    if room_id not in connection_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    messages = room_service.get_chat_messages(room_id, limit)
    return {
        "messages": [msg.dict() for msg in messages],
        "total": len(messages)
    }


@router.post("/rooms/{room_id}/breakout-rooms")
async def create_breakout_room(room_id: str, request: CreateBreakoutRoomRequest):
    """Create a breakout room"""
    if room_id not in connection_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # For API calls, we'll assume the host is the room creator
    room_info = connection_manager.rooms[room_id]
    host_id = room_info.host_id
    
    breakout_id = await room_service.create_breakout_room(
        room_id=room_id,
        host_id=host_id,
        name=request.name,
        max_participants=request.max_participants,
        allowed_users=request.allowed_users
    )
    
    if not breakout_id:
        raise HTTPException(status_code=500, detail="Failed to create breakout room")
    
    return {
        "breakout_id": breakout_id,
        "message": "Breakout room created successfully"
    }


@router.get("/rooms/{room_id}/breakout-rooms")
async def get_breakout_rooms(room_id: str):
    """Get all breakout rooms for a room"""
    if room_id not in connection_manager.rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    
    breakout_rooms = [
        br.dict() for br in connection_manager.breakout_rooms.values()
        if br.room_id == room_id
    ]
    
    return {"breakout_rooms": breakout_rooms}


@router.delete("/breakout-rooms/{breakout_id}")
async def delete_breakout_room(breakout_id: str):
    """Delete a breakout room"""
    success = await room_service.delete_breakout_room(breakout_id)
    if not success:
        raise HTTPException(status_code=404, detail="Breakout room not found")
    
    return {"message": "Breakout room deleted successfully"}


@router.get("/rooms")
async def get_all_rooms():
    """Get all active rooms"""
    active_rooms = connection_manager.get_active_rooms()
    return {"rooms": active_rooms}


@router.get("/stats")
async def get_server_stats():
    """Get server statistics"""
    stats = connection_manager.get_connection_stats()
    return {
        "server_stats": stats,
        "timestamp": "2024-01-01T00:00:00"  # You can use datetime.now().isoformat()
    }


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    stats = connection_manager.get_connection_stats()
    return {
        "status": "healthy",
        "active_connections": stats["active_connections"],
        "active_rooms": stats["active_rooms"]
    }