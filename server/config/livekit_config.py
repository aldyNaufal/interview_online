# config/livekit_config.py
import os
import asyncio
from contextlib import asynccontextmanager
from livekit import api
import logging

logger = logging.getLogger(__name__)

class LiveKitManager:
    """Manages LiveKit API client lifecycle with proper cleanup"""
    
    def __init__(self):
        self.client = None
        self._lock = asyncio.Lock()
        self._connection_count = 0
    
    async def get_client(self) -> api.LiveKitAPI:
        """Get or create LiveKit API client with thread safety"""
        async with self._lock:
            if self.client is None:
                api_key = os.getenv("LIVEKIT_API_KEY")
                api_secret = os.getenv("LIVEKIT_API_SECRET") 
                livekit_url = os.getenv("LIVEKIT_URL")
                
                if not all([api_key, api_secret, livekit_url]):
                    raise ValueError("LiveKit credentials not configured")
                
                try:
                    self.client = api.LiveKitAPI(
                        url=livekit_url,
                        api_key=api_key,
                        api_secret=api_secret
                    )
                    logger.info("LiveKit API client initialized")
                except Exception as e:
                    logger.error(f"Failed to initialize LiveKit client: {e}")
                    raise
            
            self._connection_count += 1
            return self.client
    
    async def release_client(self):
        """Release a client reference"""
        async with self._lock:
            if self._connection_count > 0:
                self._connection_count -= 1
            
            # Close client when no more references
            if self._connection_count == 0 and self.client:
                try:
                    await self.client.aclose()
                    self.client = None
                    logger.info("LiveKit API client closed")
                except Exception as e:
                    logger.error(f"Error closing LiveKit client: {e}")
    
    async def force_close_client(self):
        """Force close client regardless of reference count"""
        async with self._lock:
            if self.client:
                try:
                    await self.client.aclose()
                    self.client = None
                    self._connection_count = 0
                    logger.info("LiveKit API client force closed")
                except Exception as e:
                    logger.error(f"Error force closing LiveKit client: {e}")

# Global instance
livekit_manager = LiveKitManager()

@asynccontextmanager
async def get_livekit_api():
    """Context manager for LiveKit API client with proper cleanup"""
    client = None
    try:
        client = await livekit_manager.get_client()
        yield client
    except Exception as e:
        logger.error(f"LiveKit API error: {e}")
        raise
    finally:
        if client:
            await livekit_manager.release_client()

async def cleanup_livekit_manager():
    """Cleanup function for application shutdown"""
    await livekit_manager.force_close_client()

def validate_environment():
    """Validate required environment variables"""
    required_vars = [
        "LIVEKIT_API_KEY",
        "LIVEKIT_API_SECRET", 
        "LIVEKIT_URL",
        "JWT_SECRET_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value or value.strip() == "":
            missing_vars.append(var)
    
    # Check DATABASE_URL but don't make it required
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.info("DATABASE_URL not set, using default connection string")
    else:
        logger.info("DATABASE_URL configured from environment")
    
    if missing_vars:
        error_msg = f"Missing required environment variables: {', '.join(missing_vars)}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # Validate URL format
    livekit_url = os.getenv("LIVEKIT_URL")
    if not (livekit_url.startswith("ws://") or livekit_url.startswith("wss://")):
        logger.warning("LIVEKIT_URL should start with ws:// or wss://")
    
    logger.info("All required environment variables are set and validated")

# Add to your FastAPI app startup
async def setup_livekit():
    """Setup LiveKit configuration on app startup"""
    try:
        validate_environment()
        # Test connection
        async with get_livekit_api() as client:
            logger.info("LiveKit connection test successful")
    except Exception as e:
        logger.error(f"LiveKit setup failed: {e}")
        raise