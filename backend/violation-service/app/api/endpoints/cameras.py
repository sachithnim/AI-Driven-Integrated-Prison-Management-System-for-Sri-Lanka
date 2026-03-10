from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db import models, base
from pydantic import BaseModel

router = APIRouter()

class CameraCreate(BaseModel):
    location: str
    rtsp_url: str | None = None
    status: str = "active"

class CameraOut(CameraCreate):
    id: int

    class Config:
        orm_mode = True

@router.get("/", response_model=List[CameraOut])
def read_cameras(
    db: Session = Depends(base.get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve cameras.
    """
    cameras = db.query(models.Camera).offset(skip).limit(limit).all()
    return cameras

@router.post("/", response_model=CameraOut)
def create_camera(
    camera_in: CameraCreate,
    db: Session = Depends(base.get_db),
):
    """
    Create a new camera.
    """
    # Check if a camera with the exact location already exists to prevent duplicates
    existing = db.query(models.Camera).filter(models.Camera.location == camera_in.location).first()
    if existing:
        return existing
        
    camera = models.Camera(
        location=camera_in.location,
        rtsp_url=camera_in.rtsp_url,
        status=camera_in.status,
    )
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera
