from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import os
from dotenv import load_dotenv
import logging
import uvicorn

# Import route modules
from routes.room_management import router as room_router
from routes.participant_management import router as participant_router
from routes.auth import router as auth_router

# UPDATED IMPORTS - Use the improved LiveKit configuration
from config.livekit_config import (
    validate_environment, 
    livekit_manager, 
    setup_livekit,  # NEW
    cleanup_livekit_manager  # NEW
)
from database.connection import init_db, close_db, get_db

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle app startup and shutdown with improved LiveKit management"""
    # Startup
    logger.info("🚀 Starting LiveKit Video Conference API with PostgreSQL")
    try:
        # Validate environment first
        validate_environment()
        logger.info("✅ Environment validation passed")
        
        # Initialize database
        await init_db()
        logger.info("✅ Database initialized")
        
        # UPDATED: Initialize LiveKit with connection test
        await setup_livekit()
        logger.info("✅ LiveKit initialized and tested")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🔄 Shutting down LiveKit Video Conference API")
    try:
        # UPDATED: Use the improved cleanup function
        await cleanup_livekit_manager()
        logger.info("✅ LiveKit cleanup completed")
        
        await close_db()
        logger.info("✅ Database cleanup completed")
        
    except Exception as e:
        logger.warning(f"⚠️  Shutdown warning: {e}")
    finally:
        logger.info("✅ Shutdown completed")

app = FastAPI(
    title="LiveKit Conference API with PostgreSQL",
    description="Complete LiveKit integration with PostgreSQL and strict RBAC",
    version="2.1.0",
    lifespan=lifespan
)

# Configure CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://mini-gmeet-frontend.vercel.app",
    "https://mini-gmeet-frontend-git-main-aldynaufals-projects.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(room_router, prefix="/api", tags=["Room Management"])
app.include_router(participant_router, prefix="/api", tags=["Participant Management"])

@app.get("/")
async def root():
    return {
        "message": "LiveKit Video Conference API with PostgreSQL & RBAC",
        "status": "running",
        "version": "2.1.0",
        "features": [
            "PostgreSQL Database",
            "JWT Authentication", 
            "Strict Role-Based Access Control",
            "Admin-only room creation",
            "User-only room joining",
            "LiveKit Integration with Connection Management"  # UPDATED
        ],
        "user_roles": {
            "USER": [
                "Register via /api/auth/register",
                "Join existing rooms only",
                "Cannot create or delete rooms",
                "Basic video conferencing features"
            ],
            "ADMIN": [
                "Created by developers only",
                "Create and delete rooms", 
                "Manage participants (mute/kick)",
                "Full moderation capabilities",
                "View all system information"
            ]
        },
        "endpoints": {
            "public": {
                "register": "POST /api/auth/register",
                "login": "POST /api/auth/login"
            },
            "authenticated": {
                "profile": "GET /api/auth/me",
                "token": "POST /api/token",
                "rooms_list": "GET /api/rooms",
                "room_info": "GET /api/room/{room_name}",
                "participants": "GET /api/room/{room_name}/participants"
            },
            "admin_only": {
                "create_room": "POST /api/admin/room",
                "delete_room": "DELETE /api/admin/room/{room_name}",
                "mute_participant": "POST /api/admin/room/{room_name}/mute/{participant_identity}",
                "kick_participant": "POST /api/admin/room/{room_name}/kick/{participant_identity}",
                "list_users": "GET /api/auth/users",
                "update_user_role": "PUT /api/auth/users/{user_id}/role"
            }
        }
    }

@app.get("/health")
async def health_check():
    """Enhanced health check with LiveKit connection status"""
    try:
        # Check if LiveKit client is available and healthy
        livekit_healthy = False
        livekit_error = None
        
        try:
            # Test if we can get a client (this will test connection)
            from config.livekit_config import get_livekit_api
            async with get_livekit_api() as client:
                livekit_healthy = True
        except Exception as e:
            livekit_error = str(e)
        
        return {
            "status": "healthy" if livekit_healthy else "degraded",
            "database_configured": bool(os.getenv("DATABASE_URL")),
            "livekit_configured": bool(
                os.getenv("LIVEKIT_API_KEY") and 
                os.getenv("LIVEKIT_API_SECRET") and 
                os.getenv("LIVEKIT_URL")
            ),
            "livekit_connection": "healthy" if livekit_healthy else "error",
            "livekit_error": livekit_error,
            "jwt_configured": bool(os.getenv("JWT_SECRET_KEY")),
            "environment": os.getenv("ENVIRONMENT", "development")
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "database_configured": bool(os.getenv("DATABASE_URL")),
            "livekit_configured": bool(
                os.getenv("LIVEKIT_API_KEY") and 
                os.getenv("LIVEKIT_API_SECRET") and 
                os.getenv("LIVEKIT_URL")
            ),
            "jwt_configured": bool(os.getenv("JWT_SECRET_KEY")),
            "environment": os.getenv("ENVIRONMENT", "development")
        }

@app.get("/test-db")
async def test_database(db: AsyncSession = Depends(get_db)):
    """Test database connection and async setup"""
    try:
        # Test basic connection
        result = await db.execute(text("SELECT 1 as test_value"))
        test_value = result.scalar()
        
        # Test database name
        db_name_result = await db.execute(text("SELECT current_database()"))
        db_name = db_name_result.scalar()
        
        # Test current time
        time_result = await db.execute(text("SELECT NOW() as current_time"))
        current_time = time_result.scalar()
        
        return {
            "database": "connected",
            "async_working": True,
            "test_query_result": test_value,
            "database_name": db_name,
            "server_time": current_time,
            "message": "Database connection and async operations working correctly"
        }
    except Exception as e:
        logger.error(f"Database test failed: {e}")
        return {
            "database": "error", 
            "async_working": False,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "message": "Database connection failed"
        }

# NEW: Add LiveKit connection test endpoint
@app.get("/test-livekit")
async def test_livekit():
    """Test LiveKit connection and configuration"""
    try:
        from config.livekit_config import get_livekit_api
        
        async with get_livekit_api() as client:
            # Try to list rooms as a connection test
            rooms = await client.list_rooms()
            
            return {
                "livekit": "connected",
                "client_available": True,
                "active_rooms_count": len(rooms),
                "api_url": os.getenv("LIVEKIT_URL"),
                "message": "LiveKit connection working correctly"
            }
    except Exception as e:
        logger.error(f"LiveKit test failed: {e}")
        return {
            "livekit": "error",
            "client_available": False,
            "error_type": type(e).__name__,
            "error_message": str(e),
            "api_url": os.getenv("LIVEKIT_URL"),
            "message": "LiveKit connection failed"
        }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": "The requested endpoint does not exist",
            "tip": "Visit / for available endpoints documentation"
        }
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )