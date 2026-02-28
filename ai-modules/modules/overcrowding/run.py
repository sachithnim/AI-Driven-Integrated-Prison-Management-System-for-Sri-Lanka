"""
Standalone entry point for the Overcrowding AI Service.
Run from inside the overcrowding/ folder:
    python3 run.py
"""

import sys
from pathlib import Path

# Walk up to the ai-modules directory so package imports resolve correctly
# overcrowding/ -> modules/ -> ai-modules/
ai_modules_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ai_modules_dir))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from modules.overcrowding.api import router

app = FastAPI(
    title="Overcrowding AI Service",
    description="AI Service for detecting overcrowding and suggesting cell allocation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1/overcrowding", tags=["overcrowding"])

if __name__ == "__main__":
    PORT = 8002
    HOST = "0.0.0.0"
    print(f"Starting Overcrowding AI Service on http://{HOST}:{PORT}")
    print(f"Docs available at http://localhost:{PORT}/docs")
    uvicorn.run(app, host=HOST, port=PORT)
