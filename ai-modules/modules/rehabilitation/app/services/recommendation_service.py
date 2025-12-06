"""
Recommendation Service
Handles program recommendation logic with ML models
Uses XGBoost for suitability prediction
"""

from typing import List, Dict, Any, Optional
import numpy as np
import joblib
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    ProgramRecommendation
)
from core.logging import logger
from utils.model_utils import model_manager


class RecommendationService:
    """Service for generating rehabilitation program recommendations using ML models"""
    
    # Program database with characteristics
    PROGRAM_DATABASE = {
        "substance_abuse_intensive": {
            "name": "Intensive Drug Rehabilitation Program",
            "duration_weeks": 12,
            "base_score": 0.85,
            "suited_for": ["substance_abuse", "behavioral"],
            "description": "Intensive 12-week program for severe substance dependency"
        },
        "substance_abuse_standard": {
            "name": "Standard Substance Abuse Program",
            "duration_weeks": 8,
            "base_score": 0.75,
            "suited_for": ["substance_abuse"],
            "description": "Standard 8-week program for moderate substance issues"
        },
        "mental_health_therapy": {
            "name": "Trauma-Informed Therapy Program",
            "duration_weeks": 10,
            "base_score": 0.88,
            "suited_for": ["mental_health", "general"],
            "description": "Professional therapy for trauma and mental health conditions"
        },
        "vocational_training": {
            "name": "Vocational Skills Training",
            "duration_weeks": 16,
            "base_score": 0.72,
            "suited_for": ["general", "educational_deficit"],
            "description": "Practical vocational training for employment readiness"
        },
        "education_program": {
            "name": "GED Preparation Program",
            "duration_weeks": 20,
            "base_score": 0.68,
            "suited_for": ["educational_deficit", "general"],
            "description": "Educational advancement and GED certification"
        },
        "anger_management": {
            "name": "Anger Management & Conflict Resolution",
            "duration_weeks": 10,
            "base_score": 0.82,
            "suited_for": ["behavioral", "violent"],
            "description": "Behavioral intervention for violence risk reduction"
        },
        "cognitive_behavioral": {
            "name": "Cognitive Behavioral Therapy (CBT)",
            "duration_weeks": 8,
            "base_score": 0.78,
            "suited_for": ["behavioral", "mental_health"],
            "description": "Evidence-based CBT for behavior modification"
        },
        "family_counseling": {
            "name": "Family Reintegration & Counseling",
            "duration_weeks": 12,
            "base_score": 0.70,
            "suited_for": ["general", "mental_health"],
            "description": "Family-focused rehabilitation and reintegration support"
        }
    }
    
    def __init__(self):
        """Initialize recommendation service"""
        logger.info("Initializing Recommendation Service with ML model")
        
        self.model = None
        self.scaler = None
        self.load_models()
    
    def load_models(self):
        """Load trained ML models"""
        try:
            model_path = Path(__file__).parent.parent / "models" / "recommendation_model.joblib"
            scaler_path = Path(__file__).parent.parent / "models" / "recommendation_scaler.joblib"
            
            if model_path.exists() and scaler_path.exists():
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                logger.info("ML models loaded successfully")
            else:
                logger.warning("ML models not found - using fallback logic")
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
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
        
        # Extract features
        features = self._extract_features(request)
        
        # Get program scores using ML if available
        program_scores = self._score_programs(features)
        
        # Generate program recommendations
        programs = self._create_recommendations(program_scores, request)
        
        # Calculate confidence based on feature completeness
        confidence = self._calculate_confidence(request, program_scores)
        
        explanation = (
            f"ML-based recommendations for suitability group: {request.suitabilityGroup}, "
            f"risk score: {request.riskScore:.2f}. Top programs evaluated based on "
            f"inmate profile and program suitability."
        )
        
        return RecommendationResponse(
            programs=programs[:3],  # Top 3 recommendations
            explanation=explanation,
            confidence=confidence
        )
    
    def _extract_features(self, request: RecommendationRequest) -> np.ndarray:
        """Extract and prepare features from request"""
        
        # Default feature values
        features = {
            'completion_percentage': request.profileFeatures.get('completion_percentage', 50.0),
            'attendance_rate': request.profileFeatures.get('attendance_rate', 70.0),
            'behavioral_score': request.profileFeatures.get('behavioral_score', 60.0),
            'risk_score': request.riskScore
        }
        
        # Map suitability group to numeric
        suitability_map = {
            'substance_abuse': 0,
            'mental_health': 1,
            'behavioral': 2,
            'educational_deficit': 3,
            'general': 4
        }
        
        suitability_encoded = suitability_map.get(request.suitabilityGroup.lower(), 4)
        
        feature_array = np.array([
            features['completion_percentage'],
            features['attendance_rate'],
            features['behavioral_score'],
            features['risk_score'],
            suitability_encoded
        ]).reshape(1, -1)
        
        return feature_array
    
    def _score_programs(self, features: np.ndarray) -> Dict[str, float]:
        """Score each program using ML model"""
        program_scores = {}
        
        for program_id, program_info in self.PROGRAM_DATABASE.items():
            if self.model and self.scaler:
                try:
                    # Scale features
                    scaled_features = self.scaler.transform(features)
                    
                    # Get model prediction probability
                    prob = self.model.predict_proba(scaled_features)[0]
                    ml_score = prob[1] if len(prob) > 1 else 0.5
                except Exception as e:
                    logger.warning(f"Error in ML scoring: {e}, using base score")
                    ml_score = program_info['base_score']
            else:
                ml_score = program_info['base_score']
            
            # Adjust score based on program suitability
            suitability_boost = self._calculate_suitability_boost(
                features[0][4], program_info['suited_for']
            )
            
            final_score = min(1.0, ml_score * 0.7 + suitability_boost * 0.3)
            program_scores[program_id] = final_score
        
        return program_scores
    
    def _calculate_suitability_boost(self, suitability_encoded: int, suited_for: List[str]) -> float:
        """Calculate suitability boost for a program"""
        
        suitability_map = {
            'substance_abuse': 0,
            'mental_health': 1,
            'behavioral': 2,
            'educational_deficit': 3,
            'general': 4
        }
        
        reverse_map = {v: k for k, v in suitability_map.items()}
        inmate_suitability = reverse_map.get(int(suitability_encoded), 'general')
        
        return 1.0 if inmate_suitability in suited_for else 0.6
    
    def _create_recommendations(
        self, 
        program_scores: Dict[str, float],
        request: RecommendationRequest
    ) -> List[ProgramRecommendation]:
        """Create program recommendations from scores"""
        
        recommendations = []
        
        # Sort by score
        sorted_programs = sorted(
            program_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for program_id, score in sorted_programs:
            program_info = self.PROGRAM_DATABASE[program_id]
            
            # Adjust duration based on risk score
            duration = program_info['duration_weeks']
            if request.riskScore > 0.7:
                duration = int(duration * 1.2)
            
            reason = f"Recommended based on suitability match and ML model score. "
            reason += f"Program focuses on {', '.join(program_info['suited_for'])}."
            
            recommendations.append(
                ProgramRecommendation(
                    programType=program_id,
                    programName=program_info['name'],
                    durationWeeks=duration,
                    score=score,
                    reason=reason
                )
            )
        
        return recommendations
    
    def _calculate_confidence(
        self,
        request: RecommendationRequest,
        program_scores: Dict[str, float]
    ) -> float:
        """Calculate confidence score for recommendations"""
        
        # Base confidence on feature completeness
        feature_count = len(request.profileFeatures)
        feature_confidence = min(1.0, feature_count / 5.0)
        
        # Confidence based on program score variance
        if program_scores:
            scores = list(program_scores.values())
            score_variance = max(scores) - min(scores) if len(scores) > 1 else 0.5
            variance_confidence = min(1.0, score_variance)
        else:
            variance_confidence = 0.5
        
        # Risk score confidence (lower risk = higher confidence)
        risk_confidence = 1.0 - (request.riskScore * 0.2)
        
        # Combined confidence
        confidence = (feature_confidence * 0.3 + variance_confidence * 0.4 + risk_confidence * 0.3)
        confidence = max(0.5, min(1.0, confidence))
        
        return round(confidence, 2)


# Singleton instance
recommendation_service = RecommendationService()

