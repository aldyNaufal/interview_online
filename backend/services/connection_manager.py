from fastapi import WebSocket
from typing import Dict, Set, Optional, List
import json
import asyncio
from datetime import datetime

from models.user import UserInfo, UserConnection, MediaState
from models.room import RoomInfo, ChatMessage
from models.breakout_room import BreakoutRoom
from utils.logger import logger


class ConnectionManager:
    def __init__(self):
        # WebSocket connections: user_id -> websocket
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Room participants: room_id -> set of user_ids
        self.room_participants: Dict[str, Set[str]] = {}
        
        # User connections: user_id -> UserConnection
        self.user_connections: Dict[str, UserConnection] = {}
        
        # Room info: room_id -> RoomInfo
        self.rooms: Dict[str, RoomInfo] = {}
        
        # Breakout rooms: breakout_id -> BreakoutRoom
        self.breakout_rooms: Dict[str, BreakoutRoom] = {}
        
        # Chat messages: room_id -> List[ChatMessage]
        self.chat_messages: Dict[str, List[ChatMessage]] = {}

    async def connect(self, websocket: WebSocket, user_id: str) -> bool:
        """Connect a user to WebSocket"""
        try:
            await websocket.accept()
            self.active_connections[user_id] = websocket
            logger.info(f"User {user_id} connected")
            return True
        except Exception as e:
            logger.error(f"Failed to connect user {user_id}: {e}")
            return False

    async def disconnect(self, user_id: str):
        """Disconnect a user and clean up"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        # Remove from all rooms
        rooms_to_clean = []
        for room_id, participants in self.room_participants.items():
            if user_id in participants:
                participants.remove(user_id)
                if len(participants) == 0:
                    rooms_to_clean.append(room_id)
                else:
                    # Notify other participants
                    await self.broadcast_to_room({
                        "type": "user_left",
                        "user_id": user_id,
                        "room_id": room_id
                    }, room_id)
        
        # Clean up empty rooms
        for room_id in rooms_to_clean:
            del self.room_participants[room_id]
        
        # Remove user connection
        if user_id in self.user_connections:
            del self.user_connections[user_id]
        
        logger.info(f"User {user_id} disconnected")

    async def send_personal_message(self, message: dict, user_id: str) -> bool:
        """Send message to specific user"""
        if user_id not in self.active_connections:
            return False
        
        websocket = self.active_connections[user_id]
        try:
            await websocket.send_text(json.dumps(message))
            return True
        except Exception as e:
            logger.error(f"Failed to send message to {user_id}: {e}")
            await self.disconnect(user_id)
            return False

    async def broadcast_to_room(self, message: dict, room_id: str, exclude_user: str = None) -> int:
        """Broadcast message to all users in a room"""
        if room_id not in self.room_participants:
            return 0
        
        sent_count = 0
        for user_id in self.room_participants[room_id]:
            if user_id != exclude_user:
                success = await self.send_personal_message(message, user_id)
                if success:
                    sent_count += 1
        
        return sent_count

    async def join_room(self, user_id: str, room_id: str, user_info: UserInfo) -> bool:
        """Add user to room"""
        try:
            # Initialize room participants if needed
            if room_id not in self.room_participants:
                self.room_participants[room_id] = set()
            
            # Add user to room
            self.room_participants[room_id].add(user_id)
            
            # Store user connection
            self.user_connections[user_id] = UserConnection(
                user_info=user_info,
                current_room=room_id
            )
            
            # Update room info
            if room_id in self.rooms:
                if user_id not in self.rooms[room_id].participants:
                    self.rooms[room_id].participants.append(user_id)
            
            # Notify others in room
            await self.broadcast_to_room({
                "type": "user_joined",
                "user_id": user_id,
                "user_info": user_info.dict(),
                "room_id": room_id
            }, room_id, exclude_user=user_id)
            
            logger.info(f"User {user_id} joined room {room_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to join room {room_id} for user {user_id}: {e}")
            return False

    async def leave_room(self, user_id: str, room_id: str) -> bool:
        """Remove user from room"""
        try:
            if room_id in self.room_participants:
                self.room_participants[room_id].discard(user_id)
                
                # Update room info
                if room_id in self.rooms:
                    if user_id in self.rooms[room_id].participants:
                        self.rooms[room_id].participants.remove(user_id)
                
                # Update user connection
                if user_id in self.user_connections:
                    self.user_connections[user_id].current_room = None
                
                # Notify others in room
                await self.broadcast_to_room({
                    "type": "user_left",
                    "user_id": user_id,
                    "room_id": room_id
                }, room_id)
                
                logger.info(f"User {user_id} left room {room_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to leave room {room_id} for user {user_id}: {e}")
            return False

    def get_room_participants(self, room_id: str) -> List[dict]:
        """Get all participants in a room"""
        participants = []
        if room_id in self.room_participants:
            for user_id in self.room_participants[room_id]:
                if user_id in self.user_connections:
                    user_conn = self.user_connections[user_id]
                    participants.append({
                        "id": user_id,
                        **user_conn.user_info.dict(),
                        "media_state": user_conn.media_state.dict()
                    })
        return participants

    def get_active_rooms(self) -> List[dict]:
        """Get all active rooms"""
        active_rooms = []
        for room_id, room_info in self.rooms.items():
            if room_id in self.room_participants and len(self.room_participants[room_id]) > 0:
                active_rooms.append({
                    **room_info.dict(),
                    "active_participants": len(self.room_participants[room_id])
                })
        return active_rooms

    def update_user_media_state(self, user_id: str, media_state: MediaState):
        """Update user's media state"""
        if user_id in self.user_connections:
            self.user_connections[user_id].media_state = media_state

    def is_user_online(self, user_id: str) -> bool:
        """Check if user is online"""
        return user_id in self.active_connections

    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "active_connections": len(self.active_connections),
            "active_rooms": len([r for r in self.room_participants.values() if len(r) > 0]),
            "total_rooms": len(self.rooms),
            "breakout_rooms": len(self.breakout_rooms),
            "total_participants": sum(len(participants) for participants in self.room_participants.values())
        }