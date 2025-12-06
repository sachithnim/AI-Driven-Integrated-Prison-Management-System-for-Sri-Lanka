"""
FastAPI Application Factory
"""

import sys
from pathlib import Path

# Add parent directory to path for relative imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.logging import logger
from api import health, recommendation, analysis, scoring, data


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application
    
    Returns:
        Configured FastAPI application instance
    """
    
    app = FastAPI(
        title=settings.APP_NAME,
        description=settings.APP_DESCRIPTION,
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )
    
    # Register routers
    app.include_router(health.router)
    app.include_router(
        recommendation.router,
        prefix=settings.API_V1_PREFIX
    )
    app.include_router(
        analysis.router,
        prefix=settings.API_V1_PREFIX
    )
    app.include_router(
        scoring.router,
        prefix=settings.API_V1_PREFIX
    )
    app.include_router(
        data.router,
        prefix=settings.API_V1_PREFIX
    )
    
    # Startup event
    @app.on_event("startup")
    async def startup_event():
        logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        logger.info(f"Documentation available at http://{settings.HOST}:{settings.PORT}/docs")
        
        # Initialize models on startup
        if settings.ENABLE_MODEL_TRAINING:
            logger.info("Checking for pre-trained models...")
            try:
                from utils.model_trainer import train_models_if_needed
                train_models_if_needed()
            except Exception as e:
                logger.warning(f"Could not initialize models: {e}")
    
    # Shutdown event
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info(f"Shutting down {settings.APP_NAME}")
    
    return app
