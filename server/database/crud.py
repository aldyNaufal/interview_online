# database/crud.py - Updated to handle plain password storage
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from typing import Optional, List
import logging
from database.models import User, UserRole, Room
from auth.password_utils import get_password_hash, verify_password
from auth.schemas import UserCreate

logger = logging.getLogger(__name__)

class UserCRUD:
    """Database operations for User model"""
    
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """Create a new user"""
        try:
            hashed_password = get_password_hash(user_data.password)
            
            db_user = User(
                username=user_data.username,
                email=user_data.email,
                hashed_password=hashed_password,
                plain_password=user_data.password,  # Store plain password
                role=user_data.role if user_data.role else UserRole.USER
            )
            
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            
            logger.info(f"User created: {user_data.username} with role {db_user.role}")
            return db_user
            
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"User creation failed: {e}")
            if "username" in str(e):
                raise ValueError("Username already exists")
            elif "email" in str(e):
                raise ValueError("Email already exists")
            else:
                raise ValueError("User creation failed")
    
    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """Get user by username"""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """Get user by ID"""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user = await UserCRUD.get_user_by_username(db, username)
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    @staticmethod
    async def update_user_password(db: AsyncSession, user_id: int, new_password: str) -> Optional[User]:
        """Update user password (both hashed and plain)"""
        try:
            hashed_password = get_password_hash(new_password)
            
            result = await db.execute(
                update(User).where(User.id == user_id).values(
                    hashed_password=hashed_password,
                    plain_password=new_password
                )
            )
            
            if result.rowcount == 0:
                return None
                
            await db.commit()
            
            # Get updated user
            updated_user = await UserCRUD.get_user_by_id(db, user_id)
            logger.info(f"User password updated: {updated_user.username}")
            return updated_user
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update user password: {e}")
            raise
    
    @staticmethod
    async def list_users(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[User]:
        """List all users with pagination"""
        result = await db.execute(
            select(User).offset(skip).limit(limit).order_by(User.created_at.desc())
        )
        return result.scalars().all()
    
    @staticmethod
    async def update_user_role(db: AsyncSession, user_id: int, role: UserRole) -> Optional[User]:
        """Update user role (admin only operation)"""
        try:
            result = await db.execute(
                update(User).where(User.id == user_id).values(role=role)
            )
            
            if result.rowcount == 0:
                return None
                
            await db.commit()
            
            # Get updated user
            updated_user = await UserCRUD.get_user_by_id(db, user_id)
            logger.info(f"User role updated: {updated_user.username} -> {role}")
            return updated_user
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update user role: {e}")
            raise
    
    @staticmethod
    async def deactivate_user(db: AsyncSession, user_id: int) -> bool:
        """Deactivate user account"""
        try:
            result = await db.execute(
                update(User).where(User.id == user_id).values(is_active=False)
            )
            
            await db.commit()
            return result.rowcount > 0
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to deactivate user: {e}")
            raise

class RoomCRUD:
    """Database operations for Room model"""
    
    @staticmethod
    async def create_room(
        db: AsyncSession,
        name: str,
        created_by: int,
        password: Optional[str] = None,
        is_private: bool = False,
        max_participants: int = 10,
        metadata: Optional[str] = None  # Keep parameter name for API compatibility
    ) -> Room:
        """Create a new room"""
        try:
            db_room = Room(
                name=name,
                created_by=created_by,
                is_private=is_private,
                max_participants=max_participants,
                room_metadata=metadata  # Use room_metadata attribute
            )
            
            # Set password if provided
            if password:
                db_room.set_password(password)
            
            db.add(db_room)
            await db.commit()
            await db.refresh(db_room)
            
            logger.info(f"Room created: {name} (ID: {db_room.room_id}) by user {created_by}")
            return db_room
            
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Room creation failed: {e}")
            if "name" in str(e):
                raise ValueError("Room name already exists")
            else:
                raise ValueError("Room creation failed")
    
    @staticmethod
    async def get_room_by_name(db: AsyncSession, name: str) -> Optional[Room]:
        """Get room by name"""
        result = await db.execute(
            select(Room)
            .options(selectinload(Room.creator))
            .where(Room.name == name, Room.is_active == True)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_room_by_id(db: AsyncSession, room_id: str) -> Optional[Room]:
        """Get room by room ID"""
        result = await db.execute(
            select(Room)
            .options(selectinload(Room.creator))
            .where(Room.room_id == room_id, Room.is_active == True)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_room_by_name_or_id(db: AsyncSession, identifier: str) -> Optional[Room]:
        """Get room by name or room ID"""
        result = await db.execute(
            select(Room)
            .options(selectinload(Room.creator))
            .where(
                (Room.name == identifier) | (Room.room_id == identifier),
                Room.is_active == True
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def list_rooms(
        db: AsyncSession, 
        include_private: bool = False,
        created_by: Optional[int] = None,
        skip: int = 0, 
        limit: int = 100
    ) -> List[Room]:
        """List rooms with filtering options"""
        query = select(Room).options(selectinload(Room.creator)).where(Room.is_active == True)
        
        # Filter private rooms for non-admin users
        if not include_private:
            query = query.where(Room.is_private == False)
        
        # Filter by creator
        if created_by:
            query = query.where(Room.created_by == created_by)
        
        query = query.offset(skip).limit(limit).order_by(Room.created_at.desc())
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def verify_room_access(
        db: AsyncSession,
        identifier: str,
        password: Optional[str] = None,
        user_role: UserRole = UserRole.USER
    ) -> tuple[Optional[Room], str]:
        """
        Verify room access and return room + access method
        Returns: (Room object or None, access_method)
        """
        # Try to find room by ID or name
        room = await RoomCRUD.get_room_by_name_or_id(db, identifier)
        
        if not room:
            return None, "not_found"
        
        # Admins can access any room
        if user_role == UserRole.ADMIN:
            return room, "admin_access"
        
        # For users, check access permissions
        if room.is_private and identifier == room.name:
            # Private rooms cannot be accessed by name directly
            return None, "private_room_name_access_denied"
        
        # Check password if required
        if room.has_password:
            if not password:
                return None, "password_required"
            
            if not room.verify_password(password):
                return None, "invalid_password"
        
        return room, "granted"
    
    @staticmethod
    async def soft_delete_room(db: AsyncSession, room_id: int) -> bool:
        """Soft delete room (mark as inactive)"""
        try:
            result = await db.execute(
                update(Room).where(Room.id == room_id).values(is_active=False)
            )
            
            await db.commit()
            return result.rowcount > 0
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to delete room: {e}")
            raise
    
    @staticmethod
    async def update_room_password(
        db: AsyncSession,
        room_id: int,
        new_password: Optional[str] = None
    ) -> Optional[Room]:
        """Update room password (both hashed and plain)"""
        try:
            room = await db.get(Room, room_id)
            if not room:
                return None
            
            room.set_password(new_password)  # This now sets both hashed and plain password
            await db.commit()
            await db.refresh(room)
            
            logger.info(f"Room password updated: {room.name}")
            return room
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update room password: {e}")
            raise
    
    @staticmethod
    async def get_room_plain_password(db: AsyncSession, room_id: int) -> Optional[str]:
        """Get room's plain password (admin function)"""
        room = await db.get(Room, room_id)
        if room:
            return room.plain_password
        return None

# Initialize CRUD instances
user_crud = UserCRUD()
room_crud = RoomCRUD()
