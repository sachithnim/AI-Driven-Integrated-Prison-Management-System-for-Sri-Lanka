"""
Rehabilitation Module Entry Point
Run this file to start the Rehabilitation AI Service
"""

import sys
from pathlib import Path

# Add modules to path
sys.path.insert(0, str(Path(__file__).parent))

import uvicorn
from modules.rehabilitation.app.main import create_app
from modules.rehabilitation.app.core.config import settings

# Create application instance
app = create_app()

if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME} on port {settings.PORT}")
    uvicorn.run(
        "run_rehabilitation:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
