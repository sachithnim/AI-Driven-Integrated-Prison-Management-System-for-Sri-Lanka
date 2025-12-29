"""
Scoring and prediction schemas
"""

from pydantic import BaseModel, Field
from typing import Literal, List, Optional


class InitialAssessmentRequest(BaseModel):
    """Request model for initial inmate assessment"""
    crimeDescription: str = Field(..., description="Description of the crime")
    riskHistory: List[str] = Field(default=[], description="History of risk incidents")
    notes: str = Field(default="", description="Additional notes")
    age: Optional[int] = Field(default=30, description="Age of the inmate")
    sentenceDurationMonths: int = Field(..., description="Sentence duration in months")
    caseType: str = Field(..., description="Type of case")


class InitialAssessmentResponse(BaseModel):
    """Response model for initial inmate assessment"""
    behavior_score: float = Field(..., ge=0, le=100, description="Initial behavior score (0-100)")
    discipline_score: float = Field(..., ge=0, le=100, description="Initial discipline score (0-100)")
    risk_score: float = Field(..., ge=0, le=1, description="Initial risk score (0-1)")
    reasoning: str = Field(..., description="AI reasoning for the scores")


class EarlyReleaseScoreResponse(BaseModel):
    """Response model for early release score"""
    inmateId: str = Field(..., description="Unique identifier for the inmate")
    score: float = Field(..., ge=0.0, le=1.0, description="Eligibility score (0-1)")
    recommendation: Literal["eligible", "not_recommended"] = Field(..., description="Recommendation status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "inmateId": "INM001",
                "score": 0.72,
                "recommendation": "eligible"
            }
        }


class ModelInfo(BaseModel):
    """Information about a loaded model"""
    name: str = Field(..., description="Model name")
    type: str = Field(..., description="Model type")
    status: str = Field(..., description="Current status")
    note: str = Field(..., description="Additional notes")


class ModelsInfoResponse(BaseModel):
    """Response with information about all loaded models"""
    models: list[ModelInfo] = Field(..., description="List of model information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "models": [
                    {
                        "name": "recommendation_engine",
                        "type": "rule-based",
                        "status": "active",
                        "note": "Replace with XGBoost/Neural Network"
                    }
                ]
            }
        }
