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
    
    # Program database with characteristics — includes Sri Lankan specific programs
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
        },
        # ── Sri Lankan Specific Programs ──────────────────────────────────────
        "nvq_carpentry": {
            "name": "NVQ Level 3 – Carpentry & Furniture Making",
            "duration_weeks": 16,
            "base_score": 0.76,
            "suited_for": ["general", "educational_deficit"],
            "description": "TVEC-certified carpentry training with workshop practice",
            "prison_types": ["WORK_CAMP", "OPEN_PRISON_CAMP", "CORRECTIONAL_CENTRE"]
        },
        "nvq_masonry": {
            "name": "NVQ Level 3 – Masonry & Construction",
            "duration_weeks": 14,
            "base_score": 0.74,
            "suited_for": ["general", "educational_deficit"],
            "description": "TVEC-certified masonry training for construction industry",
            "prison_types": ["WORK_CAMP", "OPEN_PRISON_CAMP"]
        },
        "nvq_ac_repair": {
            "name": "NVQ Level 4 – AC & Refrigeration Repair",
            "duration_weeks": 16,
            "base_score": 0.73,
            "suited_for": ["general", "educational_deficit"],
            "description": "Advanced technical training in air-conditioning repair",
            "prison_types": ["WORK_CAMP", "OPEN_PRISON_CAMP", "CORRECTIONAL_CENTRE"]
        },
        "agriculture_training": {
            "name": "Agriculture & Organic Farming Program",
            "duration_weeks": 12,
            "base_score": 0.71,
            "suited_for": ["general", "educational_deficit"],
            "description": "Hands-on agriculture and organic farming at open-camp farms",
            "prison_types": ["OPEN_PRISON_CAMP", "WORK_CAMP"]
        },
        "bhavana_meditation": {
            "name": "Bhavana Meditation & Mindfulness Program",
            "duration_weeks": 8,
            "base_score": 0.80,
            "suited_for": ["mental_health", "behavioral", "general"],
            "description": "Buddhist mindfulness meditation for emotional regulation",
            "prison_types": ["TRAINING_SCHOOL", "CORRECTIONAL_CENTRE", "OPEN_PRISON_CAMP"]
        },
        "kandyan_arts": {
            "name": "Kandyan Dancing & Traditional Drumming",
            "duration_weeks": 10,
            "base_score": 0.69,
            "suited_for": ["general", "mental_health"],
            "description": "Traditional Sri Lankan performing arts for cultural rehabilitation",
            "prison_types": ["TRAINING_SCHOOL", "CORRECTIONAL_CENTRE"]
        },
        "art_therapy": {
            "name": "Art Therapy & Creative Expression",
            "duration_weeks": 8,
            "base_score": 0.77,
            "suited_for": ["mental_health", "general"],
            "description": "Guided art therapy sessions for emotional processing",
            "prison_types": ["TRAINING_SCHOOL", "CORRECTIONAL_CENTRE"]
        },
        "youth_leadership": {
            "name": "Youth Leadership & Life Skills",
            "duration_weeks": 12,
            "base_score": 0.80,
            "suited_for": ["general", "educational_deficit", "behavioral"],
            "description": "Structured leadership and social-skills program for young offenders",
            "prison_types": ["TRAINING_SCHOOL"]
        },
        "drug_rehab_tier1": {
            "name": "Drug Rehabilitation – Tier 1 (Detox & Stabilise)",
            "duration_weeks": 4,
            "base_score": 0.90,
            "suited_for": ["substance_abuse"],
            "description": "Medical detox and initial stabilisation under MO supervision",
            "prison_types": ["REMAND_PRISON", "CLOSED_PRISON", "CORRECTIONAL_CENTRE"]
        },
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
    
    async def generate_recommendations(
        self, 
        request: RecommendationRequest
    ) -> RecommendationResponse:
        """
        Generate program recommendations based on inmate profile
        Uses ML scoring + RAG context + LLM plan generation
        """
        logger.info(f"Generating recommendation for inmate: {request.inmateId}")
        
        # Extract features for ML model
        features = self._extract_features(request)
        
        # Filter programs by prison type if specified
        eligible_programs = self._filter_by_prison_type(request.prisonType)
        
        # Get program scores using ML if available
        program_scores = self._score_programs(features, eligible_programs)
        
        # Generate program recommendations
        programs = self._create_recommendations(program_scores, request, eligible_programs)
        
        # Calculate confidence based on feature completeness
        confidence = self._calculate_confidence(request, program_scores)
        
        # --- RAG + GenAI Enhancement ---
        from services.rag_service import rag_service
        from core.openai_client import openai_client
        
        structured_plan = None
        
        if openai_client.enabled:
            try:
                # 1. Build rich RAG query from extended fields
                query_parts = [f"rehabilitation for {request.suitabilityGroup}"]
                if request.caseType:
                    query_parts.append(request.caseType.replace("_", " "))
                if request.educationLevel:
                    query_parts.append(request.educationLevel)
                if request.hasSubstanceAbuse:
                    query_parts.append("substance abuse drug")
                if request.hasMentalHealthIssues:
                    query_parts.append("mental health")
                if request.violentHistory:
                    query_parts.append("violence anger")
                if request.prisonType:
                    query_parts.append(request.prisonType.replace("_", " ").lower())
                if request.age and request.age < 25:
                    query_parts.append("youth young offender")
                if request.medicalConditions:
                    query_parts.append(" ".join(request.medicalConditions))
                if request.occupation:
                    query_parts.append(request.occupation)
                if request.addictions:
                    query_parts.append(request.addictions)
                
                rag_query = " ".join(query_parts)
                context = await rag_service.search(rag_query, k=5)
                rag_context_str = rag_service.format_context(context)
                
                # 2. Build enriched inmate_data dict for LLM
                enriched_data = {**request.profileFeatures}
                if request.age: enriched_data["age"] = request.age
                if request.gender: enriched_data["gender"] = request.gender
                if request.caseType: enriched_data["caseType"] = request.caseType
                if request.crimeDescription: enriched_data["crimeDescription"] = request.crimeDescription
                if request.securityLevel: enriched_data["securityLevel"] = request.securityLevel
                if request.educationLevel: enriched_data["education_level"] = request.educationLevel
                if request.occupation: enriched_data["occupation"] = request.occupation
                if request.medicalConditions: enriched_data["medicalConditions"] = request.medicalConditions
                if request.behaviorScore is not None: enriched_data["behavior_score"] = request.behaviorScore
                if request.disciplineScore is not None: enriched_data["discipline_score"] = request.disciplineScore
                if request.riskScore is not None: enriched_data["risk_score"] = request.riskScore
                if request.prisonType: enriched_data["prisonType"] = request.prisonType
                if request.religion: enriched_data["religion"] = request.religion
                if request.addictions: enriched_data["addictions"] = request.addictions
                if request.sentenceLengthMonths: enriched_data["sentenceLengthMonths"] = request.sentenceLengthMonths
                
                # 3. Generate Detailed Plan via LLM
                structured_plan_dict = await openai_client.generate_rehabilitation_plan(
                    inmate_data=enriched_data,
                    context=rag_context_str
                )
                
                if structured_plan_dict:
                    from schemas.recommendation import StructuredPlan
                    structured_plan = StructuredPlan(**structured_plan_dict)
                    
            except Exception as e:
                logger.error(f"Error in RAG/LLM generation: {e}")
        
        top_program_names = [p.programName for p in programs[:3]]
        explanation = (
            f"ML-based recommendations for suitability group: {request.suitabilityGroup}, "
            f"risk score: {request.riskScore:.2f}. "
            f"Top programs: {', '.join(top_program_names)}. "
            f"{'AI-generated structured plan included.' if structured_plan else 'Standard analysis.'}"
            + (f" Prison type filter: {request.prisonType}." if request.prisonType else "")
        )
        
        return RecommendationResponse(
            programs=programs[:5],  # Top 5 recommendations
            structured_plan=structured_plan,
            explanation=explanation,
            confidence=confidence
        )
    
    def _extract_features(self, request: RecommendationRequest) -> np.ndarray:
        """Extract and prepare features from request"""
        
        # Default feature values
        features = {
            'completion_percentage': request.profileFeatures.get('completion_percentage', 50.0),
            'attendance_rate': request.profileFeatures.get('attendance_rate', 70.0),
            'behavioral_score': request.behaviorScore or request.profileFeatures.get('behavioral_score', 60.0),
            'risk_score': request.riskScore
        }
        
        # Map suitability group to numeric
        suitability_map = {
            'substance_abuse': 0,
            'mental_health': 1,
            'behavioral': 2,
            'educational_deficit': 3,
            'general': 4,
            'violent': 2,   # maps to behavioral
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

    def _filter_by_prison_type(self, prison_type: Optional[str]) -> Dict[str, Dict]:
        """Return programs eligible for the given prison type (all if None)"""
        if not prison_type:
            return self.PROGRAM_DATABASE
        
        filtered = {}
        for pid, info in self.PROGRAM_DATABASE.items():
            allowed = info.get("prison_types")
            if allowed is None or prison_type in allowed:
                filtered[pid] = info
        return filtered
    
    def _score_programs(self, features: np.ndarray, programs: Optional[Dict[str, Dict]] = None) -> Dict[str, float]:
        """Score each program using ML model"""
        target_programs = programs or self.PROGRAM_DATABASE
        program_scores = {}
        
        for program_id, program_info in target_programs.items():
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
        request: RecommendationRequest,
        programs: Optional[Dict[str, Dict]] = None
    ) -> List[ProgramRecommendation]:
        """Create program recommendations from scores"""
        target_programs = programs or self.PROGRAM_DATABASE
        
        recommendations = []
        
        # Sort by score
        sorted_programs = sorted(
            program_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for program_id, score in sorted_programs:
            program_info = target_programs.get(program_id, self.PROGRAM_DATABASE.get(program_id))
            if not program_info:
                continue
            
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

