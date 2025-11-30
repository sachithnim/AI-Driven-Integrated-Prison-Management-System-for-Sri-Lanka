"""
Application configuration settings
"""

from pydantic_settings import BaseSettings
from typing import Optional
import sys
from pathlib import Path

# Add parent directories to path for shared imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from modules.shared.config import shared_settings


class Settings(BaseSettings):
    """Application settings for Rehabilitation Module"""
    
    # Application
    APP_NAME: str = "Rehabilitation AI Service"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "AI-powered recommendations for prison rehabilitation programs"
    MODULE_NAME: str = "rehabilitation"
    
    # Server (inherit from shared settings)
    HOST: str = shared_settings.HOST
    PORT: int = shared_settings.REHABILITATION_PORT
    DEBUG: bool = shared_settings.DEBUG
    
    # API
    API_V1_PREFIX: str = shared_settings.API_V1_PREFIX
    
    # CORS
    CORS_ORIGINS: list = shared_settings.CORS_ORIGINS
    CORS_ALLOW_CREDENTIALS: bool = shared_settings.CORS_ALLOW_CREDENTIALS
    CORS_ALLOW_METHODS: list = shared_settings.CORS_ALLOW_METHODS
    CORS_ALLOW_HEADERS: list = shared_settings.CORS_ALLOW_HEADERS
    
    # Logging
    LOG_LEVEL: str = shared_settings.LOG_LEVEL
    
    # ML Model paths (for future use)
    MODEL_PATH: Optional[str] = None
    NLP_MODEL_PATH: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
