"""
Scoring and prediction schemas
"""

from pydantic import BaseModel, Field
from typing import Literal


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
