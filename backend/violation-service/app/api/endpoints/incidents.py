from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Any, Optional
from app.db import models, base
from pydantic import BaseModel
from datetime import datetime, date

router = APIRouter()

# Schema (Pydantic) - usually in app/schemas/
class IncidentCreate(BaseModel):
    camera_id: int
    type: str # Violence, Weapon, Scream
    severity: str # Low, Medium, High
    description: str

class IncidentOut(IncidentCreate):
    id: int
    timestamp: datetime
    video_path: str | None = None

    class Config:
        orm_mode = True

@router.get("/", response_model=List[IncidentOut])
def read_incidents(
    db: Session = Depends(base.get_db),
    skip: int = 0,
    limit: int = 100,
    date_from: Optional[date] = Query(None, description="Filter incidents from this date (inclusive)"),
    date_to: Optional[date] = Query(None, description="Filter incidents up to this date (inclusive)"),
    search: Optional[str] = Query(None, description="Search in description, type, or severity"),
    severity: Optional[str] = Query(None, description="Filter by severity: Low, Medium, High"),
):
    """
    Retrieve incidents with optional date range, search, and severity filters.
    """
    query = db.query(models.Incident)

    # Date range filtering
    if date_from:
        query = query.filter(models.Incident.timestamp >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(models.Incident.timestamp <= datetime.combine(date_to, datetime.max.time()))

    # Severity filter
    if severity:
        query = query.filter(models.Incident.severity == severity)

    # Text search across description, type
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            models.Incident.description.ilike(search_pattern) |
            models.Incident.type.ilike(search_pattern)
        )

    # Order by newest first
    query = query.order_by(models.Incident.timestamp.desc())

    incidents = query.offset(skip).limit(limit).all()
    return incidents

@router.post("/", response_model=IncidentOut)
def create_incident(
    incident_in: IncidentCreate,
    db: Session = Depends(base.get_db),
):
    """
    Create new incident (Internal use by Violence Service).
    """
    incident = models.Incident(
        camera_id=incident_in.camera_id,
        type=incident_in.type,
        severity=incident_in.severity,
        description=incident_in.description,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident
