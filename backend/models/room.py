from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class RoomStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    PAUSED = "paused"

class RoomInfo(BaseModel):
    id: str
    name: str
    host_id: str
    created_at: datetime
    status: RoomStatus = RoomStatus.ACTIVE
    is_recording: bool = False
    is_locked: bool = False
    password: Optional[str] = None
    max_participants: int = 100
    participants: List[str] = []
    breakout_rooms: List[str] = []
    
    class Config:
        use_enum_values = True

class RoomSettings(BaseModel):
    allow_recording: bool = True
    allow_breakout_rooms: bool = True
    allow_chat: bool = True
    allow_screen_sharing: bool = True
    mute_participants_on_join: bool = False
    waiting_room_enabled: bool = False

class ChatMessage(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    message: str
    timestamp: datetime
    is_system_message: bool = False