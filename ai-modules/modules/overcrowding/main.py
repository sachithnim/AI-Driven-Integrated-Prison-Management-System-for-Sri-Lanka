from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import router

def create_app() -> FastAPI:
    app = FastAPI(
        title="Overcrowding AI Service",
        description="AI Service for detecting overcrowding and suggesting cell allocation",
        version="1.0.0"
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, replace with specific origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router, prefix="/api/v1/overcrowding", tags=["overcrowding"])

    return app
