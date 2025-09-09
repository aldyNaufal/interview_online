# database/models.py - Added plain password storage
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum as SQLEnum, Text, ForeignKey, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum as PyEnum
import datetime
import uuid
from auth.password_utils import get_password_hash, verify_password

Base = declarative_base()

class UserRole(PyEnum):
    ADMIN = "admin"
    USER = "user"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # NEW: Plain password storage (consider security implications)
    plain_password = Column(String(255), nullable=True)
    
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationship to rooms created by this user
    created_rooms = relationship("Room", back_populates="creator")

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    
    # NEW: Plain password storage (consider security implications)
    plain_password = Column(String(255), nullable=True)
    
    is_private = Column(Boolean, default=False, nullable=False)
    max_participants = Column(Integer, default=10, nullable=False)
    
    # Use room_metadata instead of metadata to avoid SQLAlchemy reserved name
    room_metadata = Column(Text, nullable=True)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationship
    creator = relationship("User", back_populates="created_rooms")
    
    def __init__(self, **kwargs):
        # Generate room_id if not provided
        if 'room_id' not in kwargs:
            kwargs['room_id'] = self.generate_room_id()
        super().__init__(**kwargs)
    
    @staticmethod
    def generate_room_id() -> str:
        """Generate unique room ID for sharing"""
        return str(uuid.uuid4()).replace('-', '')[:12].upper()  # 12-char room ID
    
    def set_password(self, password: str):
        """Hash and set room password using bcrypt, also store plain password"""
        if password:
            self.password_hash = get_password_hash(password)
            self.plain_password = password  # Store plain password
        else:
            self.password_hash = None
            self.plain_password = None
    
    def verify_password(self, password: str) -> bool:
        """Verify room password using bcrypt"""
        if not self.password_hash:
            return True  # No password required
        if not password:
            return False  # Password required but not provided
        
        return verify_password(password, self.password_hash)
    
    @property
    def has_password(self) -> bool:
        """Check if room has password protection"""
        return bool(self.password_hash)
    

class ConversationStatus(PyEnum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PROCESSING = "processing"

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    conversation_id = Column(String(50), unique=True, index=True, nullable=False)
    status = Column(SQLEnum(ConversationStatus), default=ConversationStatus.ACTIVE)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    room = relationship("Room", back_populates="conversations")
    transcriptions = relationship("Transcription", back_populates="conversation")
    summaries = relationship("ConversationSummary", back_populates="conversation")
    
    def __init__(self, **kwargs):
        if 'conversation_id' not in kwargs:
            kwargs['conversation_id'] = self.generate_conversation_id()
        super().__init__(**kwargs)
    
    @staticmethod
    def generate_conversation_id() -> str:
        return str(uuid.uuid4()).replace('-', '')[:16].upper()

class Transcription(Base):
    __tablename__ = "transcriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    participant_identity = Column(String(100), nullable=False)
    participant_name = Column(String(100), nullable=False)
    
    # Audio data
    audio_chunk = Column(LargeBinary, nullable=True)  # Store small audio chunks
    audio_duration = Column(Integer, nullable=True)  # Duration in seconds
    
    # Transcription results
    transcribed_text = Column(Text, nullable=False)
    confidence_score = Column(String(10), nullable=True)  # Store as string for flexibility
    language_detected = Column(String(10), default="id", nullable=False)
    
    # Timing
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    start_time = Column(Integer, nullable=True)  # Seconds from conversation start
    end_time = Column(Integer, nullable=True)
    
    # Metadata
    processing_time = Column(Integer, nullable=True)  # Processing time in ms
    model_version = Column(String(50), default="wav2vec2-indonesian")
    
    # Relationships
    conversation = relationship("Conversation", back_populates="transcriptions")

class ConversationSummary(Base):
    __tablename__ = "conversation_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    
    # Summary content
    summary_text = Column(Text, nullable=False)
    key_points = Column(Text, nullable=True)  # JSON string of key points
    action_items = Column(Text, nullable=True)  # JSON string of action items
    participants_summary = Column(Text, nullable=True)  # JSON string of participant contributions
    
    # Metadata
    total_duration = Column(Integer, nullable=True)  # Total conversation duration
    total_words = Column(Integer, nullable=True)
    language_used = Column(String(10), default="id")
    
    # Processing info
    model_used = Column(String(100), nullable=False)  # LLM model used for summarization
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processing_time = Column(Integer, nullable=True)  # Processing time in ms
    
    # Relationships
    conversation = relationship("Conversation", back_populates="summaries")