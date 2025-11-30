"""
Recommendation schemas
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class RecommendationRequest(BaseModel):
    """Request model for program recommendations"""
    inmateId: str = Field(..., description="Unique identifier for the inmate")
    profileFeatures: Dict[str, Any] = Field(default_factory=dict, description="Inmate profile features")
    suitabilityGroup: Optional[str] = Field("general", description="Suitability group classification")
    riskScore: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="Risk score (0-1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "inmateId": "INM001",
                "profileFeatures": {"age": 35, "education": "high_school"},
                "suitabilityGroup": "substance_abuse",
                "riskScore": 0.75
            }
        }


class ProgramRecommendation(BaseModel):
    """Single program recommendation"""
    programType: str = Field(..., description="Type of rehabilitation program")
    programName: str = Field(..., description="Name of the program")
    durationWeeks: int = Field(..., gt=0, description="Duration in weeks")
    score: float = Field(..., ge=0.0, le=1.0, description="Recommendation score (0-1)")
    reason: str = Field(..., description="Reason for recommendation")


class RecommendationResponse(BaseModel):
    """Response model with program recommendations"""
    programs: List[ProgramRecommendation] = Field(..., description="List of recommended programs")
    explanation: str = Field(..., description="Overall explanation")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence level (0-1)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "programs": [
                    {
                        "programType": "substance_abuse",
                        "programName": "Intensive Drug Rehabilitation Program",
                        "durationWeeks": 12,
                        "score": 0.85,
                        "reason": "History of substance dependency detected"
                    }
                ],
                "explanation": "Recommendations based on risk assessment",
                "confidence": 0.82
            }
        }
