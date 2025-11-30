"""
Analysis API endpoints
"""

from fastapi import APIRouter, HTTPException
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.analysis import (
    AnalyzeNotesRequest,
    AnalyzeNotesResponse
)
from services.nlp_service import nlp_service

router = APIRouter(prefix="/analyze", tags=["Analysis"])


@router.post("/notes", response_model=AnalyzeNotesResponse)
async def analyze_counseling_notes(request: AnalyzeNotesRequest) -> AnalyzeNotesResponse:
    """
    Analyze counseling notes using NLP
    
    This endpoint processes counseling notes to extract sentiment,
    key points, and generate summaries.
    
    **Parameters:**
    - inmateId: Unique identifier for the inmate
    - text: Counseling notes text to analyze
    
    **Returns:**
    - Summary of the notes
    - Sentiment analysis (positive/neutral/negative)
    - List of extracted key points
    """
    try:
        return nlp_service.analyze_notes(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing notes: {str(e)}"
        )
