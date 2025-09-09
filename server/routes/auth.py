# routes/auth.py - Missing authentication routes
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta
from typing import List
import logging

from auth.schemas import UserCreate, UserLogin, UserResponse, Token
from auth.security import (
    create_access_token, get_current_user, require_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from database.crud import UserCRUD
from database.models import User, UserRole
from database.connection import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    try:
        # Check if username already exists
        existing_user = await UserCRUD.get_user_by_username(db, user_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email already exists
        existing_email = await UserCRUD.get_user_by_email(db, user_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Only allow USER role registration (admins created manually)
        if user_data.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts cannot be created via registration"
            )
        
        # Create user
        db_user = await UserCRUD.create_user(db, user_data)
        
        logger.info(f"New user registered: {user_data.username}")
        
        return UserResponse.from_orm(db_user)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=Token)
async def login_user(
    user_credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT token"""
    try:
        # Authenticate user
        user = await UserCRUD.authenticate_user(
            db, user_credentials.username, user_credentials.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is deactivated"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user.username,
                "role": user.role.value,
                "user_id": user.id
            },
            expires_delta=access_token_expires
        )
        
        logger.info(f"User logged in: {user.username} ({user.role.value})")
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.from_orm(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile"""
    try:
        user = await UserCRUD.get_user_by_id(db, current_user.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse.from_orm(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )

# Admin-only endpoints
@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: List all users"""
    try:
        users = await UserCRUD.list_users(db, skip=skip, limit=limit)
        return [UserResponse.from_orm(user) for user in users]
        
    except Exception as e:
        logger.error(f"List users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list users"
        )

@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role_data: dict,
    current_user = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: Update user role"""
    try:
        new_role = UserRole(role_data.get("role"))
        
        updated_user = await UserCRUD.update_user_role(db, user_id, new_role)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"Admin {current_user.username} updated user {user_id} role to {new_role}")
        
        return UserResponse.from_orm(updated_user)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role_data.get('role')}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update role error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )

@router.put("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    current_user = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: Deactivate user account"""
    try:
        success = await UserCRUD.deactivate_user(db, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"Admin {current_user.username} deactivated user {user_id}")
        
        return {
            "message": "User account deactivated successfully",
            "user_id": user_id,
            "deactivated_by": current_user.username
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deactivate user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user"
        )