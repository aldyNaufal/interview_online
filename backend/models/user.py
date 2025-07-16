from pydantic import BaseModel
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    PARTICIPANT = "participant"
    MODERATOR = "moderator"

class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole = UserRole.PARTICIPANT
    avatar: Optional[str] = None
    is_online: bool = True
    
    class Config:
        use_enum_values = True

class MediaState(BaseModel):
    audio_enabled: bool = True
    video_enabled: bool = True
    screen_sharing: bool = False

class UserConnection(BaseModel):
    user_info: UserInfo
    media_state: MediaState = MediaState()
    current_room: Optional[str] = None
    current_breakout_room: Optional[str] = None