"""
Model training and management
Trains ML models for recommendation and early release prediction
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from xgboost import XGBClassifier
import joblib
from pathlib import Path
from typing import Tuple, Dict
import sys
import logging

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import with fallback
try:
    from core.logging import logger
except ImportError:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger("rehabilitation")

from .dataset_generator import generate_sample_data


class ModelTrainer:
    """Trains ML models for rehabilitation recommendations and predictions"""
    
    def __init__(self, models_dir: str = "models"):
        """Initialize trainer"""
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.scalers = {}
        self.encoders = {}
        logger.info(f"ModelTrainer initialized with models_dir: {self.models_dir}")
    
    def prepare_recommendation_data(self, program_outcomes: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for recommendation model"""
        logger.info("Preparing recommendation data")
        
        # Feature engineering
        X_data = program_outcomes[[
            'completion_percentage', 'attendance_rate', 'behavioral_score',
            'risk_score'
        ]].copy()
        
        # Encode categorical variables
        for col in ['program_type', 'suitability_group']:
            if col in program_outcomes.columns:
                encoder = LabelEncoder()
                X_data[f'{col}_encoded'] = encoder.fit_transform(program_outcomes[col])
                self.encoders[col] = encoder
        
        y = program_outcomes['recommended'].values
        
        X = X_data.values
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers['recommendation'] = scaler
        
        return X_scaled, y
    
    def prepare_early_release_data(self, early_release: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Prepare data for early release prediction model"""
        logger.info("Preparing early release data")
        
        X = early_release[[
            'behavior_score', 'program_completion_count',
            'disciplinary_score'
        ]].values
        
        y = early_release['eligible_for_early_release'].values
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers['early_release'] = scaler
        
        return X_scaled, y
    
    def train_recommendation_model(self, X: np.ndarray, y: np.ndarray) -> XGBClassifier:
        """
        Train recommendation model using XGBoost
        
        Args:
            X: Feature matrix
            y: Target labels
            
        Returns:
            Trained XGBoost model
        """
        logger.info("Training recommendation model with XGBoost")
        
        model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            objective='binary:logistic',
            random_state=42,
            verbosity=1
        )
        
        model.fit(X, y)
        
        # Save model
        model_path = self.models_dir / "recommendation_model.joblib"
        joblib.dump(model, model_path)
        logger.info(f"Recommendation model saved to {model_path}")
        
        # Save scaler
        scaler_path = self.models_dir / "recommendation_scaler.joblib"
        joblib.dump(self.scalers['recommendation'], scaler_path)
        
        return model
    
    def train_early_release_model(self, X: np.ndarray, y: np.ndarray) -> LogisticRegression:
        """
        Train early release prediction model
        
        Args:
            X: Feature matrix
            y: Target labels
            
        Returns:
            Trained logistic regression model
        """
        logger.info("Training early release model with Logistic Regression")
        
        model = LogisticRegression(
            max_iter=1000,
            random_state=42,
            C=1.0,
            class_weight='balanced'
        )
        
        model.fit(X, y)
        
        # Save model
        model_path = self.models_dir / "scoring_model.joblib"
        joblib.dump(model, model_path)
        logger.info(f"Early release model saved to {model_path}")
        
        # Save scaler
        scaler_path = self.models_dir / "early_release_scaler.joblib"
        joblib.dump(self.scalers['early_release'], scaler_path)
        
        return model
    
    def train_all_models(self, n_samples: int = 500) -> Dict:
        """
        Generate data and train all models
        
        Args:
            n_samples: Number of samples to generate
            
        Returns:
            Dictionary with trained models and metrics
        """
        logger.info(f"Starting full training pipeline with {n_samples} samples")
        
        # Generate datasets
        datasets = generate_sample_data(n_samples)
        
        # Train recommendation model
        X_rec, y_rec = self.prepare_recommendation_data(datasets['program_outcomes'])
        recommendation_model = self.train_recommendation_model(X_rec, y_rec)
        rec_score = recommendation_model.score(X_rec, y_rec)
        logger.info(f"Recommendation model accuracy: {rec_score:.4f}")
        
        # Train early release model
        X_er, y_er = self.prepare_early_release_data(datasets['early_release'])
        early_release_model = self.train_early_release_model(X_er, y_er)
        er_score = early_release_model.score(X_er, y_er)
        logger.info(f"Early release model accuracy: {er_score:.4f}")
        
        results = {
            'recommendation_accuracy': rec_score,
            'early_release_accuracy': er_score,
            'models_saved': True,
            'training_samples': n_samples
        }
        
        logger.info(f"Training completed: {results}")
        return results


def train_models_if_needed(models_dir: str = "models") -> bool:
    """
    Check if models exist, train if needed
    
    Args:
        models_dir: Directory where models are stored
        
    Returns:
        True if models are available
    """
    models_path = Path(models_dir)
    
    required_models = [
        'recommendation_model.joblib',
        'scoring_model.joblib'
    ]
    
    models_exist = all((models_path / model).exists() for model in required_models)
    
    if not models_exist:
        logger.info("Models not found, training now...")
        trainer = ModelTrainer(models_dir)
        trainer.train_all_models(n_samples=500)
        return True
    
    logger.info("Models already exist")
    return True


if __name__ == "__main__":
    trainer = ModelTrainer()
    results = trainer.train_all_models()
    print("Training Results:", results)
