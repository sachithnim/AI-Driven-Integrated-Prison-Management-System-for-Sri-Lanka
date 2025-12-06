"""
Model utilities for loading and managing ML/AI models
"""

import joblib
import json
from pathlib import Path
from typing import Optional, Dict, Any
import sys
import logging

sys.path.insert(0, str(Path(__file__).parent.parent))

# Import with fallback
try:
    from core.logging import logger
    from core.config import settings
except ImportError:
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger("rehabilitation")
    class Settings:
        LOG_LEVEL = "INFO"
    settings = Settings()


class ModelManager:
    """Manages loading, caching, and providing access to ML models"""
    
    _instance = None
    _models: Dict[str, Any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self.models_dir = Path(__file__).parent.parent / "models"
        self.models_dir.mkdir(exist_ok=True)
        logger.info(f"ModelManager initialized with models directory: {self.models_dir}")
    
    def load_recommendation_model(self):
        """Load or create recommendation model"""
        model_path = self.models_dir / "recommendation_model.joblib"
        
        if model_path.exists():
            logger.info("Loading recommendation model from cache")
            self._models['recommendation'] = joblib.load(model_path)
        else:
            logger.info("Recommendation model not found - will use training pipeline")
            self._models['recommendation'] = None
        
        return self._models.get('recommendation')
    
    def load_scoring_model(self):
        """Load or create scoring model"""
        model_path = self.models_dir / "scoring_model.joblib"
        
        if model_path.exists():
            logger.info("Loading scoring model from cache")
            self._models['scoring'] = joblib.load(model_path)
        else:
            logger.info("Scoring model not found - will use training pipeline")
            self._models['scoring'] = None
        
        return self._models.get('scoring')
    
    def load_nlp_models(self):
        """Load NLP models (sentiment, summarization)"""
        try:
            from transformers import pipeline
            
            if 'sentiment' not in self._models:
                logger.info("Loading sentiment analysis model")
                self._models['sentiment'] = pipeline(
                    "sentiment-analysis",
                    model="distilbert-base-uncased-finetuned-sst-2-english"
                )
            
            if 'summarizer' not in self._models:
                logger.info("Loading text summarization model")
                self._models['summarizer'] = pipeline(
                    "summarization",
                    model="facebook/bart-large-cnn"
                )
            
            if 'ner' not in self._models:
                logger.info("Loading NER model")
                self._models['ner'] = pipeline(
                    "ner",
                    model="dslim/bert-base-uncased-ner"
                )
            
            return True
        except Exception as e:
            logger.error(f"Error loading NLP models: {e}")
            return False
    
    def save_model(self, model: Any, model_name: str):
        """Save model to disk"""
        model_path = self.models_dir / f"{model_name}.joblib"
        joblib.dump(model, model_path)
        self._models[model_name] = model
        logger.info(f"Model saved: {model_path}")
    
    def get_model(self, model_name: str) -> Optional[Any]:
        """Get loaded model"""
        return self._models.get(model_name)
    
    def list_models(self) -> Dict[str, str]:
        """List all available models and their status"""
        models_info = {}
        
        for model_name in ['recommendation', 'scoring']:
            model_path = self.models_dir / f"{model_name}.joblib"
            status = "available" if model_path.exists() else "not_trained"
            models_info[model_name] = status
        
        # Check NLP models
        models_info['sentiment'] = "loaded" if 'sentiment' in self._models else "not_loaded"
        models_info['summarizer'] = "loaded" if 'summarizer' in self._models else "not_loaded"
        models_info['ner'] = "loaded" if 'ner' in self._models else "not_loaded"
        
        return models_info


# Singleton instance
model_manager = ModelManager()
