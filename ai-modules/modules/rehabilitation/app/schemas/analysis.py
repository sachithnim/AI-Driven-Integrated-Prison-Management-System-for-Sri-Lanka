"""
Analysis schemas for NLP and text processing
"""

from pydantic import BaseModel, Field
from typing import List


class AnalyzeNotesRequest(BaseModel):
    """Request model for analyzing counseling notes"""
    inmateId: str = Field(..., description="Unique identifier for the inmate")
    text: str = Field(..., min_length=1, description="Counseling notes text")
    
    class Config:
        json_schema_extra = {
            "example": {
                "inmateId": "INM001",
                "text": "Inmate showed good progress during today's session. Cooperative and engaged in discussions."
            }
        }


class AnalyzeNotesResponse(BaseModel):
    """Response model for notes analysis"""
    summary: str = Field(..., description="Summary of the notes")
    sentiment: str = Field(..., description="Overall sentiment (positive/neutral/negative)")
    keyPoints: List[str] = Field(..., description="Key points extracted from notes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary": "Inmate demonstrated positive engagement...",
                "sentiment": "positive",
                "keyPoints": ["Good progress", "Cooperative behavior"]
            }
        }
