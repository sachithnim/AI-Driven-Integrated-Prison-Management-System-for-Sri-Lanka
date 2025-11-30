"""
Recommendation API endpoints
"""

from fastapi import APIRouter, HTTPException
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse
)
from services.recommendation_service import recommendation_service

router = APIRouter(prefix="/recommend", tags=["Recommendations"])


@router.post("", response_model=RecommendationResponse)
async def generate_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    """
    Generate rehabilitation program recommendations
    
    This endpoint analyzes inmate profile and risk factors to suggest
    appropriate rehabilitation programs.
    
    **Parameters:**
    - inmateId: Unique identifier for the inmate
    - profileFeatures: Dictionary of inmate profile features
    - suitabilityGroup: Classification group (substance_abuse, mental_health, etc.)
    - riskScore: Risk assessment score (0-1)
    
    **Returns:**
    - List of recommended programs with scores and reasons
    - Overall explanation and confidence level
    """
    try:
        return recommendation_service.generate_recommendations(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating recommendations: {str(e)}"
        )
