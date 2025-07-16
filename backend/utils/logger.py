import logging
import sys
from config import settings

def setup_logger(name: str = None) -> logging.Logger:
    """
    Setup logger with consistent formatting
    """
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        # Create handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, settings.LOG_LEVEL))
        
        # Create formatter
        formatter = logging.Formatter(settings.LOG_FORMAT)
        handler.setFormatter(formatter)
        
        # Add handler to logger
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, settings.LOG_LEVEL))
    
    return logger

# Global logger instance
logger = setup_logger("webrtc_server")