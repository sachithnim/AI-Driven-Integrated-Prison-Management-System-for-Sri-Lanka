"""
Scoring API endpoints
"""

from fastapi import APIRouter, HTTPException
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.scoring import (
    EarlyReleaseScoreResponse,
    ModelsInfoResponse,
    ModelInfo
)
from services.scoring_service import scoring_service

router = APIRouter(prefix="/scoring", tags=["Scoring"])


@router.get("/early-release/{inmate_id}", response_model=EarlyReleaseScoreResponse)
async def get_early_release_score(inmate_id: str) -> EarlyReleaseScoreResponse:
    """
    Calculate early release eligibility score
    
    This endpoint evaluates an inmate's eligibility for early release
    based on behavior, program completion, and risk assessment.
    
    **Parameters:**
    - inmate_id: Unique identifier for the inmate
    
    **Returns:**
    - Eligibility score (0-1)
    - Recommendation (eligible/not_recommended)
    """
    try:
        return scoring_service.calculate_early_release_score(inmate_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error calculating early release score: {str(e)}"
        )


@router.get("/models/info", response_model=ModelsInfoResponse)
async def get_models_info() -> ModelsInfoResponse:
    """
    Get information about loaded ML models
    
    Returns metadata about all AI/ML models currently loaded
    in the service, including their type and status.
    """
    return ModelsInfoResponse(
        models=[
            ModelInfo(
                name="recommendation_engine",
                type="rule-based",
                status="active",
                note="Replace with XGBoost/Neural Network"
            ),
            ModelInfo(
                name="nlp_analyzer",
                type="keyword-based",
                status="active",
                note="Replace with Transformers/LLM"
            ),
            ModelInfo(
                name="early_release_predictor",
                type="stub",
                status="mock",
                note="Replace with Cox/Survival model"
            )
        ]
    )
