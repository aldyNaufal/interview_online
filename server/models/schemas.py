# models/schemas.py - Enhanced models

from pydantic import BaseModel
from typing import Optional, List
from database.models import UserRole

# Enhanced Room models with password security
class CreateRoomRequest(BaseModel):
    roomName: str
    maxParticipants: Optional[int] = 10
    metadata: Optional[str] = None
    password: Optional[str] = None  # NEW: Room password
    isPrivate: bool = False  # NEW: Private room flag

class RoomInfo(BaseModel):
    name: str
    numParticipants: int
    participants: List[str]
    creationTime: int
    metadata: Optional[str] = None
    isPrivate: bool = False  # NEW: Indicates if room requires password
    hasPassword: bool = False  # NEW: Indicates if room has password protection

class RoomResponse(BaseModel):
    roomName: str
    sid: str
    maxParticipants: int
    creationTime: int
    metadata: Optional[str] = None
    status: str
    roomId: str  # NEW: Public room ID for sharing
    isPrivate: bool = False
    hasPassword: bool = False

# Enhanced Token Request with room credentials
class TokenRequestWithAuth(BaseModel):
    roomName: str
    participantName: str
    metadata: Optional[str] = None
    roomPassword: Optional[str] = None  # NEW: Password for room access
    roomId: Optional[str] = None  # NEW: Room ID for access

class TokenResponse(BaseModel):
    token: str
    wsUrl: str
    roomName: str
    participantName: str
    roomInfo: Optional[dict] = None  # NEW: Room information