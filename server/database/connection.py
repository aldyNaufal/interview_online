# database/connection.py - Fixed to use proper async components
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import os
import logging

logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:1234@localhost:5432/hirevue"
)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    future=True  # Use SQLAlchemy 2.0 style
)

# Create async session maker - FIXED: Use async_sessionmaker instead of sessionmaker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            await session.close()

# Remove the duplicate get_async_session function - use get_db instead

async def init_db():
    """Initialize database tables"""
    try:
        from database.models import Base  
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

async def close_db():
    """Close database connections"""
    try:
        await engine.dispose()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")

# Optional: Add a test function to verify connection
async def test_connection():
    """Test database connection"""
    try:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import text
            result = await session.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False