from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class BreakoutRoomStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"
    FULL = "full"

class BreakoutRoom(BaseModel):
    id: str
    name: str
    room_id: str  # Parent room ID
    participants: List[str] = []
    max_participants: int = 10
    host_assigned: bool = False
    assigned_host: Optional[str] = None
    status: BreakoutRoomStatus = BreakoutRoomStatus.OPEN
    created_at: datetime
    duration_minutes: Optional[int] = None  # Auto-close after duration
    allowed_users: List[str] = []  # If empty, all users can join
    
    class Config:
        use_enum_values = True

class BreakoutRoomAssignment(BaseModel):
    user_id: str
    breakout_room_id: str
    assigned_at: datetime
    auto_assigned: bool = False