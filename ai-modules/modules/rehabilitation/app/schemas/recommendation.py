"""
Recommendation schemas
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class RecommendationRequest(BaseModel):
    """Request model for program recommendations — accepts full inmate context"""
    inmateId: str = Field(..., description="Unique identifier for the inmate")
    profileFeatures: Dict[str, Any] = Field(default_factory=dict, description="Inmate profile features")
    suitabilityGroup: Optional[str] = Field("general", description="Suitability group classification")
    riskScore: Optional[float] = Field(0.5, ge=0.0, le=1.0, description="Risk score (0-1)")

    # ── Extended inmate context (used by RAG + LLM) ──────────────────────────
    age: Optional[int] = Field(None, description="Inmate's age")
    gender: Optional[str] = Field(None, description="Gender")
    caseType: Optional[str] = Field(None, description="Crime case type enum")
    crimeDescription: Optional[str] = Field(None, description="Free text crime description")
    securityLevel: Optional[str] = Field(None, description="MINIMUM | LOW | MEDIUM | HIGH | MAXIMUM")
    sentenceLengthMonths: Optional[int] = Field(None, description="Total sentence in months")
    timeServedMonths: Optional[int] = Field(None, description="Time already served in months")
    behaviorScore: Optional[float] = Field(None, description="Behavior score 0-100")
    disciplineScore: Optional[float] = Field(None, description="Discipline score 0-100")
    medicalConditions: Optional[List[str]] = Field(None, description="List of medical conditions")
    hasSubstanceAbuse: Optional[bool] = Field(None, description="Substance abuse flag")
    hasMentalHealthIssues: Optional[bool] = Field(None, description="Mental health flag")
    educationLevel: Optional[str] = Field(None, description="Literacy level / education")
    occupation: Optional[str] = Field(None, description="Previous occupation")
    religion: Optional[str] = Field(None, description="Religion")
    previousConvictions: Optional[int] = Field(None, description="Number of prior convictions")
    violentHistory: Optional[bool] = Field(None, description="History of violence")
    familySupport: Optional[float] = Field(None, description="Family support score 0-1")
    addictions: Optional[str] = Field(None, description="Addictions info")
    prisonType: Optional[str] = Field(None, description="Target prison type: WORK_CAMP | OPEN_PRISON_CAMP | TRAINING_SCHOOL | CORRECTIONAL_CENTRE")

    class Config:
        json_schema_extra = {
            "example": {
                "inmateId": "INM001",
                "profileFeatures": {"age": 35, "education": "high_school"},
                "suitabilityGroup": "substance_abuse",
                "riskScore": 0.75,
                "age": 22,
                "caseType": "D_NARCOTIC_DRUGS",
                "educationLevel": "GCE O/L",
                "prisonType": "TRAINING_SCHOOL"
            }
        }


class ProgramRecommendation(BaseModel):
    """Single program recommendation"""
    programType: str = Field(..., description="Type of rehabilitation program")
    programName: str = Field(..., description="Name of the program")
    durationWeeks: int = Field(..., gt=0, description="Duration in weeks")
    score: float = Field(..., ge=0.0, le=1.0, description="Recommendation score (0-1)")
    reason: str = Field(..., description="Reason for recommendation")


class StructuredPlan(BaseModel):
    """Detailed AI-generated rehabilitation plan"""
    short_term_goals: List[str] = Field(..., description="Goals for first 3 months")
    long_term_goals: List[str] = Field(..., description="Goals for release/reintegration")
    weekly_schedule: List[Dict[str, str]] = Field(..., description="Sample weekly routine")
    key_milestones: List[Dict[str, str]] = Field(..., description="Milestones to track progress")
    
class RecommendationResponse(BaseModel):
    """Response model with program recommendations"""
    programs: List[ProgramRecommendation] = Field(..., description="List of recommended programs")
    structured_plan: Optional[StructuredPlan] = Field(None, description="AI-generated detailed plan")
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
