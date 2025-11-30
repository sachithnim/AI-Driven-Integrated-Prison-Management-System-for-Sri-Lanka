"""
Recommendation Service
Handles program recommendation logic

TODO: Replace rule-based logic with ML models:
- XGBoost/Random Forest classifier for suitability
- Collaborative filtering for program matching
- Neural network for duration prediction
"""

from typing import List
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    ProgramRecommendation
)
from core.logging import logger


class RecommendationService:
    """Service for generating rehabilitation program recommendations"""
    
    def __init__(self):
        """Initialize recommendation service"""
        logger.info("Initializing Recommendation Service")
        # TODO: Load ML models here
        # self.model = load_model(settings.MODEL_PATH)
    
    def generate_recommendations(
        self, 
        request: RecommendationRequest
    ) -> RecommendationResponse:
        """
        Generate program recommendations based on inmate profile
        
        Args:
            request: Recommendation request with inmate details
            
        Returns:
            RecommendationResponse with program suggestions
        """
        logger.info(f"Generating recommendation for inmate: {request.inmateId}")
        
        group = request.suitabilityGroup.lower()
        risk = request.riskScore
        
        # RULE-BASED LOGIC (Replace with ML models)
        programs = self._generate_programs_by_group(group, risk)
        
        # Calculate overall confidence (stub - replace with model uncertainty)
        confidence = min(0.95, max(0.60, 0.7 + (risk * 0.15)))
        
        explanation = (
            f"Recommendations based on suitability group: {group}, "
            f"risk score: {risk:.2f}"
        )
        
        return RecommendationResponse(
            programs=programs[:3],  # Top 3 recommendations
            explanation=explanation,
            confidence=confidence
        )
    
    def _generate_programs_by_group(
        self, 
        group: str, 
        risk: float
    ) -> List[ProgramRecommendation]:
        """Generate programs based on suitability group"""
        
        programs = []
        
        if "substance" in group or "drug" in group:
            programs.extend([
                ProgramRecommendation(
                    programType="substance_abuse",
                    programName="Intensive Drug Rehabilitation Program",
                    durationWeeks=12 if risk > 0.7 else 8,
                    score=0.85,
                    reason="History of substance dependency detected. High priority intervention."
                ),
                ProgramRecommendation(
                    programType="mental_health",
                    programName="Dual Diagnosis Support",
                    durationWeeks=8,
                    score=0.75,
                    reason="Co-occurring mental health support recommended"
                )
            ])
        
        elif "mental" in group or "ptsd" in group:
            programs.extend([
                ProgramRecommendation(
                    programType="mental_health",
                    programName="Trauma-Informed Therapy Program",
                    durationWeeks=10,
                    score=0.88,
                    reason="Mental health indicators present. Professional counseling required."
                ),
                ProgramRecommendation(
                    programType="vocational",
                    programName="Art Therapy & Skills Training",
                    durationWeeks=12,
                    score=0.70,
                    reason="Complementary vocational training for mental wellness"
                )
            ])
        
        elif "violent" in group:
            programs.extend([
                ProgramRecommendation(
                    programType="behavior",
                    programName="Anger Management & Conflict Resolution",
                    durationWeeks=10,
                    score=0.82,
                    reason="Behavioral intervention needed for violence risk reduction"
                ),
                ProgramRecommendation(
                    programType="mental_health",
                    programName="Cognitive Behavioral Therapy",
                    durationWeeks=8,
                    score=0.78,
                    reason="CBT effective for behavior modification"
                )
            ])
        
        else:
            # Default recommendations
            programs.extend([
                ProgramRecommendation(
                    programType="vocational",
                    programName="Vocational Skills Training",
                    durationWeeks=16,
                    score=0.72,
                    reason="General skills training for employment readiness"
                ),
                ProgramRecommendation(
                    programType="education",
                    programName="GED Preparation Program",
                    durationWeeks=20,
                    score=0.68,
                    reason="Educational advancement opportunity"
                )
            ])
        
        return programs


# Singleton instance
recommendation_service = RecommendationService()
