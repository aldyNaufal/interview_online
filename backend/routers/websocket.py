from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json

from services.connection_manager import ConnectionManager
from services.room_service import RoomService
from services.message_handler import MessageHandler
from utils.logger import logger

router = APIRouter()

# Initialize services
connection_manager = ConnectionManager()
room_service = RoomService(connection_manager)
message_handler = MessageHandler(connection_manager, room_service)


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time communication"""
    
    # Connect user
    connected = await connection_manager.connect(websocket, user_id)
    if not connected:
        return
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await message_handler.handle_message(message, user_id)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from user {user_id}")
                await connection_manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, user_id)
            except Exception as e:
                logger.error(f"Error processing message from user {user_id}: {e}")
                await connection_manager.send_personal_message({
                    "type": "error",
                    "message": "Failed to process message"
                }, user_id)
                
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected normally")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        await connection_manager.disconnect(user_id)


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return connection_manager.get_connection_stats()


# Export instances for use in other modules
__all__ = ["router", "connection_manager", "room_service", "message_handler"]