"""
Shared Configuration
Configuration settings shared across all AI modules
"""

from pydantic_settings import BaseSettings
from typing import Optional, List


class SharedSettings(BaseSettings):
    """Shared settings across all AI modules"""
    
    # Application
    PROJECT_NAME: str = "Prison Management AI System"
    VERSION: str = "2.0.0"
    
    # Server
    HOST: str = "0.0.0.0"
    BASE_PORT: int = 8000
    DEBUG: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Module Ports
    REHABILITATION_PORT: int = 8001
    OVERCROWDING_PORT: int = 8002
    VIOLENCE_PORT: int = 8003
    MENTAL_HEALTH_PORT: int = 8004
    
    # Database (for future use)
    DATABASE_URL: Optional[str] = None
    
    # Redis Cache (for future use)
    REDIS_URL: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True


shared_settings = SharedSettings()
