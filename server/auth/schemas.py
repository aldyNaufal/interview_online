from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
from database.models import UserRole

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[UserRole] = UserRole.USER
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if len(v) > 50:
            raise ValueError('Username must be less than 50 characters')
        if not v.isalnum():
            raise ValueError('Username must contain only alphanumeric characters')
        return v
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    # NOTE: We don't include plain_password in responses for security
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Compatibility method for older Pydantic versions"""
        return cls.model_validate(obj)

# NEW: Admin-only response that includes plain password
class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime
    plain_password: Optional[str] = None  # Only for admin access
    
    class Config:
        from_attributes = True

class RoomResponse(BaseModel):
    id: int
    room_id: str
    name: str
    is_private: bool
    max_participants: int
    has_password: bool  # Don't expose actual password
    room_metadata: Optional[str] = None
    created_by: int
    created_at: datetime
    creator: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

# NEW: Admin-only room response that includes plain password
class RoomAdminResponse(BaseModel):
    id: int
    room_id: str
    name: str
    is_private: bool
    max_participants: int
    has_password: bool
    plain_password: Optional[str] = None  # Only for admin access
    room_metadata: Optional[str] = None
    created_by: int
    created_at: datetime
    creator: Optional[UserResponse] = None
    
    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    name: str
    password: Optional[str] = None
    is_private: bool = False
    max_participants: int = 10
    metadata: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        if len(v) < 1:
            raise ValueError('Room name is required')
        if len(v) > 100:
            raise ValueError('Room name must be less than 100 characters')
        return v

class RoomJoin(BaseModel):
    identifier: str  # Can be room name or room ID
    password: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    user_id: Optional[int] = None
