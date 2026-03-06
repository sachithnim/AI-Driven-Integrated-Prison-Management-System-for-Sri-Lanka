from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import base, models
from app.services.llm_service import LLMService
from typing import List

router = APIRouter()
llm_service = LLMService()

@router.get("/{incident_id}/generate")
def generate_report(incident_id: int, db: Session = Depends(base.get_db)):
    incident = db.query(models.Incident).filter(models.Incident.id == incident_id).first()
    if not incident:
        return {"error": "Incident not found"}
    
    data = {
        "type": incident.type,
        "severity": incident.severity,
        "camera_id": incident.camera_id,
        "timestamp": incident.timestamp,
        "description": incident.description
    }
    
    report = llm_service.generate_incident_report(data)
    return {"report": report}

@router.get("/prediction")
def get_prediction(db: Session = Depends(base.get_db)):
    # Get last 50 incidents for context
    incidents = db.query(models.Incident).order_by(models.Incident.timestamp.desc()).limit(50).all()
    history = [{
        "date": i.timestamp,
        "type": i.type,
        "location": i.camera_id
    } for i in incidents]
    
    prediction = llm_service.predict_future_risks(history)
    return {"prediction": prediction}
