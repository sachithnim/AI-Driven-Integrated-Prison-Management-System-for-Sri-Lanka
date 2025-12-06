"""
Scoring and Prediction Service
Handles risk scoring and early release predictions using ML models
Uses Logistic Regression for calibrated probability predictions
"""

import sys
from pathlib import Path
import joblib
import numpy as np
from typing import Dict, Any, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.scoring import EarlyReleaseScoreResponse
from core.logging import logger


class ScoringService:
    """Service for calculating scores and predictions using ML models"""
    
    def __init__(self):
        """Initialize scoring service"""
        logger.info("Initializing Scoring Service with ML model")
        
        self.model = None
        self.scaler = None
        self.load_models()
    
    def load_models(self):
        """Load trained ML models"""
        try:
            model_path = Path(__file__).parent.parent / "models" / "scoring_model.joblib"
            scaler_path = Path(__file__).parent.parent / "models" / "early_release_scaler.joblib"
            
            if model_path.exists() and scaler_path.exists():
                self.model = joblib.load(model_path)
                self.scaler = joblib.load(scaler_path)
                logger.info("Early release ML models loaded successfully")
            else:
                logger.warning("ML models not found - will use statistical estimation")
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    def calculate_early_release_score(self, inmate_id: str, inmate_data: Optional[Dict[str, Any]] = None) -> EarlyReleaseScoreResponse:
        """
        Calculate early release eligibility score using ML model
        
        Args:
            inmate_id: Unique identifier for the inmate
            inmate_data: Optional dictionary with inmate behavioral and program data
            
        Returns:
            EarlyReleaseScoreResponse with score and recommendation
        """
        logger.info(f"Calculating early release score for: {inmate_id}")
        
        # Extract features from inmate data
        features = self._extract_features(inmate_data)
        
        # Get prediction from model or use statistical estimation
        if self.model and self.scaler:
            score = self._predict_with_model(features)
        else:
            score = self._predict_statistical(features)
        
        # Determine recommendation
        recommendation = "eligible" if score > 0.70 else "not_recommended"
        
        # Calculate confidence
        confidence = self._calculate_confidence(score)
        
        response = EarlyReleaseScoreResponse(
            inmateId=inmate_id,
            score=round(score, 4),
            recommendation=recommendation
        )
        
        logger.info(f"Early release score for {inmate_id}: {score:.4f} ({recommendation})")
        
        return response
    
    def _extract_features(self, inmate_data: Optional[Dict[str, Any]]) -> np.ndarray:
        """
        Extract features from inmate data
        
        Args:
            inmate_data: Dictionary with inmate information
            
        Returns:
            Feature array for model prediction
        """
        
        if inmate_data is None:
            inmate_data = {}
        
        # Extract features with defaults
        behavior_score = inmate_data.get('behavior_score', 65.0)
        program_completion_count = inmate_data.get('program_completion_count', 2)
        disciplinary_score = inmate_data.get('disciplinary_score', 70.0)
        
        # Normalize to 0-100 range
        behavior_score = max(0, min(100, behavior_score))
        disciplinary_score = max(0, min(100, disciplinary_score))
        program_completion_count = max(0, program_completion_count)
        
        feature_array = np.array([
            behavior_score,
            program_completion_count,
            disciplinary_score
        ]).reshape(1, -1)
        
        return feature_array
    
    def _predict_with_model(self, features: np.ndarray) -> float:
        """
        Predict using trained logistic regression model
        
        Args:
            features: Feature array
            
        Returns:
            Probability score (0-1)
        """
        try:
            # Scale features
            scaled_features = self.scaler.transform(features)
            
            # Get probability prediction
            proba = self.model.predict_proba(scaled_features)[0]
            score = proba[1] if len(proba) > 1 else 0.5
            
            return float(score)
        except Exception as e:
            logger.warning(f"Error in model prediction: {e}, using statistical fallback")
            return self._predict_statistical(features)
    
    def _predict_statistical(self, features: np.ndarray) -> float:
        """
        Statistical estimation based on features
        
        Uses weighted combination of behavioral factors
        
        Args:
            features: Feature array [behavior_score, program_completion, disciplinary_score]
            
        Returns:
            Estimated probability score (0-1)
        """
        
        behavior_score = features[0][0]
        program_completion = features[0][1]
        disciplinary_score = features[0][2]
        
        # Weighted calculation
        score = (
            (behavior_score / 100.0) * 0.35 +
            (min(program_completion, 5) / 5.0) * 0.25 +
            (disciplinary_score / 100.0) * 0.40
        )
        
        # Apply sigmoid-like transformation for calibration
        score = self._sigmoid(score, shift=0.5, scale=2.0)
        
        return float(score)
    
    @staticmethod
    def _sigmoid(x: float, shift: float = 0.5, scale: float = 1.0) -> float:
        """
        Sigmoid transformation for probability calibration
        
        Args:
            x: Input value
            shift: Center of sigmoid
            scale: Steepness of sigmoid
            
        Returns:
            Transformed value between 0 and 1
        """
        import math
        try:
            return 1.0 / (1.0 + math.exp(-scale * (x - shift)))
        except:
            return 0.5
    
    def _calculate_confidence(self, score: float) -> float:
        """
        Calculate confidence in the prediction
        
        Args:
            score: Prediction score
            
        Returns:
            Confidence value
        """
        
        # Confidence is higher when score is further from boundary (0.5)
        distance_from_boundary = abs(score - 0.5)
        confidence = min(0.95, 0.5 + distance_from_boundary)
        
        return round(confidence, 2)
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        
        return {
            "model_type": "Logistic Regression",
            "status": "loaded" if self.model else "not_loaded",
            "features": ["behavior_score", "program_completion_count", "disciplinary_score"],
            "output_range": [0.0, 1.0],
            "threshold": 0.70,
            "calibration": "probability"
        }


# Singleton instance
scoring_service = ScoringService()

