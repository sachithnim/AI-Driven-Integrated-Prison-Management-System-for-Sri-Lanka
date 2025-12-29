"""
Application configuration settings
"""

from pydantic_settings import BaseSettings
from typing import Optional
import sys
from pathlib import Path

# Try to import shared settings with fallback
try:
    from modules.shared.config import shared_settings
except ModuleNotFoundError:
    # Fallback when running from rehabilitation directory
    sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
    try:
        from modules.shared.config import shared_settings
    except ModuleNotFoundError:
        # If still not found, use default values
        class SharedSettings:
            HOST = "0.0.0.0"
            REHABILITATION_PORT = 8001
            DEBUG = False
            API_V1_PREFIX = "/api/v1"
            CORS_ORIGINS = ["*"]
            CORS_ALLOW_CREDENTIALS = True
            CORS_ALLOW_METHODS = ["*"]
            CORS_ALLOW_HEADERS = ["*"]
            LOG_LEVEL = "INFO"
        shared_settings = SharedSettings()


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
    
    # ML Model paths
    MODEL_PATH: Optional[str] = None
    NLP_MODEL_PATH: Optional[str] = None
    
    # OpenAI Integration (v2.0)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_MAX_TOKENS: int = 300
    OPENAI_TEMPERATURE: float = 0.7
    
    # Auth Service Integration
    AUTH_SERVICE_URL: str = "http://localhost:4005"
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Feature flags
    REQUIRE_AUTH: bool = False  # Set to True to enforce authentication
    ENABLE_MODEL_TRAINING: bool = True
    ENABLE_OPENAI: bool = True  # Enable/disable OpenAI features
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

