from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from app.api.api_v1.api import api_router
from app.core import config
from app.services.violence_detector import ViolenceDetectorService, detector
import asyncio
import time
import os

# Create tables on startup (Better to use Alembic in prod)
from app.db.base import Base, engine
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Prison Violation Detection System",
    openapi_url="/api/v1/openapi.json"
)


# Create static directory if it doesn't exist
os.makedirs("app/static/incidents", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# CORS
origins = [
    "http://localhost",
    "http://localhost:5173", # Vite default
    "http://localhost:3000",
]


# CORS — allow localhost on any port and any 192.168.x.x LAN IP (for phone access)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Vite proxy makes most requests same-origin;
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_credentials=False,      # cannot combine credentials=True with allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

# Global Service Instance
# detector instance is imported from services.violence_detector

@app.on_event("startup")
async def startup_event():
    print("Application Startup: Database tables created.")

@app.post("/api/v1/start-stream")
async def start_stream(background_tasks: BackgroundTasks, rtsp_url: str, camera_id: int):
    """
    Trigger the violence detection Loop in background.
    """
    # Note: ViolenceDetectorService.process_stream is async
    background_tasks.add_task(detector.process_stream, rtsp_url, camera_id)
    return {"message": "Stream processing started", "camera_id": camera_id}

@app.get("/api/v1/video_feed")
async def video_feed():
    """
    Stream video frames (MJPEG).
    """
    def generate():
        while True:
            frame = detector.get_latest_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.04) # ~25 FPS

    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")

# Health Check
@app.get("/health")
def health_check():
    return {"status": "ok"}
