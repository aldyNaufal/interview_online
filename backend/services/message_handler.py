from typing import Dict, Any
from datetime import datetime

from models.user import UserInfo, MediaState
from services.connection_manager import ConnectionManager
from services.room_service import RoomService
from utils.logger import logger


class MessageHandler:
    def __init__(self, connection_manager: ConnectionManager, room_service: RoomService):
        self.connection_manager = connection_manager
        self.room_service = room_service
        
        # Message type handlers
        self.handlers: Dict[str, callable] = {
            "join_room": self._handle_join_room,
            "leave_room": self._handle_leave_room,
            "offer": self._handle_offer,
            "answer": self._handle_answer,
            "ice_candidate": self._handle_ice_candidate,
            "media_state": self._handle_media_state,
            "chat_message": self._handle_chat_message,
            "recording_state": self._handle_recording_state,
            "create_breakout_room": self._handle_create_breakout_room,
            "join_breakout_room": self._handle_join_breakout_room,
            "leave_breakout_room": self._handle_leave_breakout_room,
            "screen_share": self._handle_screen_share,
            "ping": self._handle_ping,
        }

    async def handle_message(self, websocket, message: Dict[str, Any]):
        """Main message handler that routes messages to appropriate handlers"""
        try:
            message_type = message.get("type")
            if message_type in self.handlers:
                await self.handlers[message_type](websocket, message)
            else:
                logger.warning(f"Unknown message type: {message_type}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self._send_error(websocket, str(e))

    async def _handle_join_room(self, websocket, message: Dict[str, Any]):
        """Handle user joining a room"""
        try:
            room_id = message.get("room_id")
            user_info = UserInfo(**message.get("user_info", {}))
            
            # Add user to room
            await self.room_service.add_user_to_room(room_id, websocket, user_info)
            
            # Get current room state
            room_users = await self.room_service.get_room_users(room_id)
            
            # Send room joined confirmation
            await self._send_message(websocket, {
                "type": "room_joined",
                "room_id": room_id,
                "users": [user.dict() for user in room_users.values()],
                "timestamp": datetime.now().isoformat()
            })
            
            # Notify other users in the room
            await self._broadcast_to_room(room_id, {
                "type": "user_joined",
                "user": user_info.dict(),
                "timestamp": datetime.now().isoformat()
            }, exclude_websocket=websocket)
            
            logger.info(f"User {user_info.user_id} joined room {room_id}")
            
        except Exception as e:
            logger.error(f"Error handling join_room: {e}")
            await self._send_error(websocket, f"Failed to join room: {str(e)}")

    async def _handle_leave_room(self, websocket, message: Dict[str, Any]):
        """Handle user leaving a room"""
        try:
            room_id = message.get("room_id")
            user_id = message.get("user_id")
            
            # Remove user from room
            await self.room_service.remove_user_from_room(room_id, websocket)
            
            # Notify other users in the room
            await self._broadcast_to_room(room_id, {
                "type": "user_left",
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            }, exclude_websocket=websocket)
            
            logger.info(f"User {user_id} left room {room_id}")
            
        except Exception as e:
            logger.error(f"Error handling leave_room: {e}")

    async def _handle_offer(self, websocket, message: Dict[str, Any]):
        """Handle WebRTC offer"""
        try:
            target_user_id = message.get("target_user_id")
            offer = message.get("offer")
            sender_id = message.get("sender_id")
            
            target_websocket = await self.connection_manager.get_user_connection(target_user_id)
            if target_websocket:
                await self._send_message(target_websocket, {
                    "type": "offer",
                    "offer": offer,
                    "sender_id": sender_id,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                await self._send_error(websocket, f"User {target_user_id} not found")
                
        except Exception as e:
            logger.error(f"Error handling offer: {e}")
            await self._send_error(websocket, f"Failed to send offer: {str(e)}")

    async def _handle_answer(self, websocket, message: Dict[str, Any]):
        """Handle WebRTC answer"""
        try:
            target_user_id = message.get("target_user_id")
            answer = message.get("answer")
            sender_id = message.get("sender_id")
            
            target_websocket = await self.connection_manager.get_user_connection(target_user_id)
            if target_websocket:
                await self._send_message(target_websocket, {
                    "type": "answer",
                    "answer": answer,
                    "sender_id": sender_id,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                await self._send_error(websocket, f"User {target_user_id} not found")
                
        except Exception as e:
            logger.error(f"Error handling answer: {e}")
            await self._send_error(websocket, f"Failed to send answer: {str(e)}")

    async def _handle_ice_candidate(self, websocket, message: Dict[str, Any]):
        """Handle ICE candidate"""
        try:
            target_user_id = message.get("target_user_id")
            candidate = message.get("candidate")
            sender_id = message.get("sender_id")
            
            target_websocket = await self.connection_manager.get_user_connection(target_user_id)
            if target_websocket:
                await self._send_message(target_websocket, {
                    "type": "ice_candidate",
                    "candidate": candidate,
                    "sender_id": sender_id,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                await self._send_error(websocket, f"User {target_user_id} not found")
                
        except Exception as e:
            logger.error(f"Error handling ice_candidate: {e}")
            await self._send_error(websocket, f"Failed to send ICE candidate: {str(e)}")

    async def _handle_media_state(self, websocket, message: Dict[str, Any]):
        """Handle media state changes (mute/unmute video/audio)"""
        try:
            room_id = message.get("room_id")
            user_id = message.get("user_id")
            media_state = MediaState(**message.get("media_state", {}))
            
            # Update user's media state
            await self.room_service.update_user_media_state(room_id, user_id, media_state)
            
            # Broadcast media state change to all users in the room
            await self._broadcast_to_room(room_id, {
                "type": "media_state_changed",
                "user_id": user_id,
                "media_state": media_state.dict(),
                "timestamp": datetime.now().isoformat()
            }, exclude_websocket=websocket)
            
            logger.info(f"User {user_id} updated media state in room {room_id}")
            
        except Exception as e:
            logger.error(f"Error handling media_state: {e}")
            await self._send_error(websocket, f"Failed to update media state: {str(e)}")

    async def _handle_chat_message(self, websocket, message: Dict[str, Any]):
        """Handle chat messages"""
        try:
            room_id = message.get("room_id")
            user_id = message.get("user_id")
            content = message.get("content")
            
            # Broadcast chat message to all users in the room
            await self._broadcast_to_room(room_id, {
                "type": "chat_message",
                "user_id": user_id,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"Chat message from {user_id} in room {room_id}")
            
        except Exception as e:
            logger.error(f"Error handling chat_message: {e}")
            await self._send_error(websocket, f"Failed to send chat message: {str(e)}")

    async def _handle_recording_state(self, websocket, message: Dict[str, Any]):
        """Handle recording state changes"""
        try:
            room_id = message.get("room_id")
            user_id = message.get("user_id")
            is_recording = message.get("is_recording")
            
            # Broadcast recording state to all users in the room
            await self._broadcast_to_room(room_id, {
                "type": "recording_state_changed",
                "user_id": user_id,
                "is_recording": is_recording,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"Recording state changed by {user_id} in room {room_id}: {is_recording}")
            
        except Exception as e:
            logger.error(f"Error handling recording_state: {e}")
            await self._send_error(websocket, f"Failed to update recording state: {str(e)}")

    async def _handle_create_breakout_room(self, websocket, message: Dict[str, Any]):
        """Handle breakout room creation"""
        try:
            main_room_id = message.get("room_id")
            user_id = message.get("user_id")
            
            # Create breakout room
            breakout_room_id = await self.room_service.create_breakout_room(main_room_id)
            
            # Send confirmation to creator
            await self._send_message(websocket, {
                "type": "breakout_room_created",
                "breakout_room_id": breakout_room_id,
                "main_room_id": main_room_id,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"Breakout room {breakout_room_id} created by {user_id}")
            
        except Exception as e:
            logger.error(f"Error handling create_breakout_room: {e}")
            await self._send_error(websocket, f"Failed to create breakout room: {str(e)}")

    async def _handle_join_breakout_room(self, websocket, message: Dict[str, Any]):
        """Handle joining breakout room"""
        try:
            breakout_room_id = message.get("breakout_room_id")
            user_info = UserInfo(**message.get("user_info", {}))
            
            # Add user to breakout room
            await self.room_service.add_user_to_room(breakout_room_id, websocket, user_info)
            
            # Send confirmation
            await self._send_message(websocket, {
                "type": "breakout_room_joined",
                "breakout_room_id": breakout_room_id,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"User {user_info.user_id} joined breakout room {breakout_room_id}")
            
        except Exception as e:
            logger.error(f"Error handling join_breakout_room: {e}")
            await self._send_error(websocket, f"Failed to join breakout room: {str(e)}")

    async def _handle_leave_breakout_room(self, websocket, message: Dict[str, Any]):
        """Handle leaving breakout room"""
        try:
            breakout_room_id = message.get("breakout_room_id")
            user_id = message.get("user_id")
            
            # Remove user from breakout room
            await self.room_service.remove_user_from_room(breakout_room_id, websocket)
            
            # Send confirmation
            await self._send_message(websocket, {
                "type": "breakout_room_left",
                "breakout_room_id": breakout_room_id,
                "timestamp": datetime.now().isoformat()
            })
            
            logger.info(f"User {user_id} left breakout room {breakout_room_id}")
            
        except Exception as e:
            logger.error(f"Error handling leave_breakout_room: {e}")

    async def _handle_screen_share(self, websocket, message: Dict[str, Any]):
        """Handle screen sharing"""
        try:
            room_id = message.get("room_id")
            user_id = message.get("user_id")
            is_sharing = message.get("is_sharing")
            
            # Broadcast screen share state to all users in the room
            await self._broadcast_to_room(room_id, {
                "type": "screen_share_changed",
                "user_id": user_id,
                "is_sharing": is_sharing,
                "timestamp": datetime.now().isoformat()
            }, exclude_websocket=websocket)
            
            logger.info(f"Screen sharing changed by {user_id} in room {room_id}: {is_sharing}")
            
        except Exception as e:
            logger.error(f"Error handling screen_share: {e}")
            await self._send_error(websocket, f"Failed to update screen share: {str(e)}")

    async def _handle_ping(self, websocket, message: Dict[str, Any]):
        """Handle ping messages for connection health check"""
        try:
            await self._send_message(websocket, {
                "type": "pong",
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Error handling ping: {e}")

    # Helper methods
    async def _send_message(self, websocket, message: Dict[str, Any]):
        """Send message to a specific websocket"""
        await self.connection_manager.send_personal_message(message, websocket)

    async def _send_error(self, websocket, error_message: str):
        """Send error message to websocket"""
        await self._send_message(websocket, {
            "type": "error",
            "message": error_message,
            "timestamp": datetime.now().isoformat()
        })

    async def _broadcast_to_room(self, room_id: str, message: Dict[str, Any], exclude_websocket=None):
        """Broadcast message to all users in a room"""
        room_users = await self.room_service.get_room_users(room_id)
        for websocket in room_users.keys():
            if websocket != exclude_websocket:
                try:
                    await self._send_message(websocket, message)
                except Exception as e:
                    logger.error(f"Error broadcasting to user: {e}")
                    # Remove disconnected user
                    await self.room_service.remove_user_from_room(room_id, websocket)