from typing import Dict, List, Optional
import uuid
from datetime import datetime

from models.room import RoomInfo, RoomStatus, RoomSettings, ChatMessage
from models.breakout_room import BreakoutRoom, BreakoutRoomStatus
from services.connection_manager import ConnectionManager
from utils.logger import logger


class RoomService:
    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager

    async def create_room(self, name: str, host_id: str, settings: Optional[RoomSettings] = None) -> str:
        """Create a new room"""
        room_id = str(uuid.uuid4())
        room_info = RoomInfo(
            id=room_id,
            name=name,
            host_id=host_id,
            created_at=datetime.now(),
            participants=[]
        )
        
        self.connection_manager.rooms[room_id] = room_info
        self.connection_manager.chat_messages[room_id] = []
        
        logger.info(f"Room {room_id} created by host {host_id}")
        return room_id

    async def delete_room(self, room_id: str) -> bool:
        """Delete a room and notify participants"""
        if room_id not in self.connection_manager.rooms:
            return False
        
        try:
            # Notify all participants
            await self.connection_manager.broadcast_to_room({
                "type": "room_ended",
                "room_id": room_id,
                "timestamp": datetime.now().isoformat()
            }, room_id)
            
            # Clean up room participants
            if room_id in self.connection_manager.room_participants:
                del self.connection_manager.room_participants[room_id]
            
            # Remove room info
            del self.connection_manager.rooms[room_id]
            
            # Remove chat messages
            if room_id in self.connection_manager.chat_messages:
                del self.connection_manager.chat_messages[room_id]
            
            # Remove related breakout rooms
            breakout_rooms_to_remove = [
                br_id for br_id, br in self.connection_manager.breakout_rooms.items() 
                if br.room_id == room_id
            ]
            
            for br_id in breakout_rooms_to_remove:
                await self.delete_breakout_room(br_id)
            
            logger.info(f"Room {room_id} deleted successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete room {room_id}: {e}")
            return False

    def get_room_info(self, room_id: str) -> Optional[dict]:
        """Get room information with participants"""
        if room_id not in self.connection_manager.rooms:
            return None
        
        room_info = self.connection_manager.rooms[room_id]
        participants = self.connection_manager.get_room_participants(room_id)
        
        breakout_rooms = [
            br.dict() for br in self.connection_manager.breakout_rooms.values() 
            if br.room_id == room_id
        ]
        
        return {
            "room_info": room_info.dict(),
            "participants": participants,
            "breakout_rooms": breakout_rooms
        }

    async def update_recording_state(self, room_id: str, user_id: str, is_recording: bool) -> bool:
        """Update room recording state"""
        if room_id not in self.connection_manager.rooms:
            return False
        
        # Check if user is admin
        if user_id not in self.connection_manager.user_connections:
            return False
        
        user_conn = self.connection_manager.user_connections[user_id]
        if user_conn.user_info.role != "admin":
            return False
        
        try:
            # Update room recording state
            self.connection_manager.rooms[room_id].is_recording = is_recording
            
            # Notify all participants
            await self.connection_manager.broadcast_to_room({
                "type": "recording_state_update",
                "is_recording": is_recording,
                "timestamp": datetime.now().isoformat()
            }, room_id)
            
            logger.info(f"Recording state updated for room {room_id}: {is_recording}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update recording state for room {room_id}: {e}")
            return False

    async def send_chat_message(self, room_id: str, sender_id: str, message: str) -> bool:
        """Send chat message to room"""
        if room_id not in self.connection_manager.rooms:
            return False
        
        if sender_id not in self.connection_manager.user_connections:
            return False
        
        try:
            user_conn = self.connection_manager.user_connections[sender_id]
            sender_name = user_conn.user_info.name
            
            # Create chat message
            chat_message = ChatMessage(
                id=str(uuid.uuid4()),
                room_id=room_id,
                sender_id=sender_id,
                sender_name=sender_name,
                message=message,
                timestamp=datetime.now()
            )
            
            # Store message
            if room_id not in self.connection_manager.chat_messages:
                self.connection_manager.chat_messages[room_id] = []
            
            self.connection_manager.chat_messages[room_id].append(chat_message)
            
            # Broadcast to room
            await self.connection_manager.broadcast_to_room({
                "type": "chat_message",
                "message": chat_message.dict()
            }, room_id)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send chat message in room {room_id}: {e}")
            return False

    async def create_breakout_room(self, room_id: str, host_id: str, name: str, 
                                 max_participants: int = 10, 
                                 allowed_users: List[str] = None) -> Optional[str]:
        """Create breakout room"""
        if room_id not in self.connection_manager.rooms:
            return None
        
        # Check if host is admin
        if host_id not in self.connection_manager.user_connections:
            return None
        
        user_conn = self.connection_manager.user_connections[host_id]
        if user_conn.user_info.role != "admin":
            return None
        
        try:
            breakout_id = str(uuid.uuid4())
            breakout_room = BreakoutRoom(
                id=breakout_id,
                name=name,
                room_id=room_id,
                max_participants=max_participants,
                created_at=datetime.now(),
                allowed_users=allowed_users or []
            )
            
            self.connection_manager.breakout_rooms[breakout_id] = breakout_room
            
            # Notify main room participants
            await self.connection_manager.broadcast_to_room({
                "type": "breakout_room_created",
                "breakout_room": breakout_room.dict()
            }, room_id)
            
            logger.info(f"Breakout room {breakout_id} created in room {room_id}")
            return breakout_id
            
        except Exception as e:
            logger.error(f"Failed to create breakout room in {room_id}: {e}")
            return None

    async def delete_breakout_room(self, breakout_id: str) -> bool:
        """Delete breakout room"""
        if breakout_id not in self.connection_manager.breakout_rooms:
            return False
        
        try:
            breakout_room = self.connection_manager.breakout_rooms[breakout_id]
            
            # Notify participants to return to main room
            await self.connection_manager.broadcast_to_room({
                "type": "breakout_room_closed",
                "breakout_id": breakout_id,
                "main_room_id": breakout_room.room_id
            }, f"breakout_{breakout_id}")
            
            # Clean up breakout room participants
            breakout_room_id = f"breakout_{breakout_id}"
            if breakout_room_id in self.connection_manager.room_participants:
                del self.connection_manager.room_participants[breakout_room_id]
            
            # Remove breakout room
            del self.connection_manager.breakout_rooms[breakout_id]
            
            logger.info(f"Breakout room {breakout_id} deleted")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete breakout room {breakout_id}: {e}")
            return False

    async def join_breakout_room(self, user_id: str, breakout_id: str) -> bool:
        """Join user to breakout room"""
        if breakout_id not in self.connection_manager.breakout_rooms:
            return False
        
        if user_id not in self.connection_manager.user_connections:
            return False
        
        try:
            breakout_room = self.connection_manager.breakout_rooms[breakout_id]
            user_conn = self.connection_manager.user_connections[user_id]
            
            # Check if room is full
            if len(breakout_room.participants) >= breakout_room.max_participants:
                return False
            
            # Check if user is allowed
            if breakout_room.allowed_users and user_id not in breakout_room.allowed_users:
                return False
            
            # Add user to breakout room
            if user_id not in breakout_room.participants:
                breakout_room.participants.append(user_id)
            
            # Join breakout room namespace
            breakout_room_id = f"breakout_{breakout_id}"
            await self.connection_manager.join_room(user_id, breakout_room_id, user_conn.user_info)
            
            # Update user's current breakout room
            user_conn.current_breakout_room = breakout_id
            
            # Notify main room
            await self.connection_manager.broadcast_to_room({
                "type": "user_joined_breakout",
                "user_id": user_id,
                "breakout_id": breakout_id,
                "breakout_name": breakout_room.name
            }, breakout_room.room_id)
            
            logger.info(f"User {user_id} joined breakout room {breakout_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to join breakout room {breakout_id}: {e}")
            return False

    def get_chat_messages(self, room_id: str, limit: int = 50) -> List[ChatMessage]:
        """Get chat messages for a room"""
        if room_id not in self.connection_manager.chat_messages:
            return []
        
        messages = self.connection_manager.chat_messages[room_id]
        return messages[-limit:] if len(messages) > limit else messages