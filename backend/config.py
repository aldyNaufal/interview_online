from typing import List

class Settings:
    # App settings
    APP_NAME: str = "WebRTC Signaling Server"
    APP_VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS settings
    CORS_ORIGINS: List[str] = ["*"]  # In production, specify your frontend URL
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["*"]
    CORS_HEADERS: List[str] = ["*"]
    
    # Logging settings
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # WebSocket settings
    WEBSOCKET_TIMEOUT: int = 600  # 10 minutes
    
    # Room settings
    MAX_PARTICIPANTS_PER_ROOM: int = 100
    MAX_BREAKOUT_ROOMS: int = 20

settings = Settings()