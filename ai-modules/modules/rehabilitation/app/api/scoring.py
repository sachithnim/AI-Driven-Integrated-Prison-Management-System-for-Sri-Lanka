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
    ModelInfo,
    InitialAssessmentRequest,
    InitialAssessmentResponse
)
from services.scoring_service import scoring_service
from core.openai_client import openai_client
import json

router = APIRouter(prefix="/scoring", tags=["Scoring"])


@router.post("/initial-assessment", response_model=InitialAssessmentResponse)
async def initial_assessment(request: InitialAssessmentRequest):
    """
    Generate initial scores for a new inmate using AI
    
    Analyzes crime description, risk history, and other details to generate
    baseline behavior, discipline, and risk scores.
    """
    try:
        if not openai_client.enabled:
            # Fallback logic if OpenAI is not enabled
            return InitialAssessmentResponse(
                behavior_score=75.0,
                discipline_score=80.0,
                risk_score=0.5,
                reasoning="AI service unavailable. Default baseline scores assigned."
            )
            
        prompt = f"""
        Analyze the following inmate details and generate initial baseline scores.
        
        Crime: {request.crimeDescription}
        Case Type: {request.caseType}
        Sentence: {request.sentenceDurationMonths} months
        Age: {request.age}
        Risk History: {', '.join(request.riskHistory)}
        Notes: {request.notes}
        
        Generate:
        1. Behavior Score (0-100): Higher is better. Based on past behavior and nature of crime.
        2. Discipline Score (0-100): Higher is better. Likelihood of following rules.
        3. Risk Score (0-1): Higher is MORE RISKY. Probability of violence/escape/recidivism.
        
        Return ONLY a JSON object with keys: "behavior_score", "discipline_score", "risk_score", "reasoning".
        """
        
        response_text = await openai_client.get_chat_completion(
            messages=[
                {"role": "system", "content": "You are a prison intake assessment AI. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ]
        )
        
        # Parse JSON from response
        try:
            # Clean up potential markdown code blocks
            cleaned_text = response_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned_text)
            
            return InitialAssessmentResponse(
                behavior_score=float(data.get("behavior_score", 70)),
                discipline_score=float(data.get("discipline_score", 70)),
                risk_score=float(data.get("risk_score", 0.5)),
                reasoning=data.get("reasoning", "AI assessment completed.")
            )
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return InitialAssessmentResponse(
                behavior_score=70.0,
                discipline_score=70.0,
                risk_score=0.5,
                reasoning=f"AI Analysis (Parsing Failed): {response_text[:100]}..."
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")


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
