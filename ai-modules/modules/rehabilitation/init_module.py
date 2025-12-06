"""
Rehabilitation AI Module - Initialization and Training Script
Initializes the rehabilitation module with pre-trained models and sample data
"""

import sys
from pathlib import Path
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add paths
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.utils.dataset_generator import DatasetGenerator, generate_sample_data
from app.utils.model_trainer import ModelTrainer
from app.core.logging import logger as app_logger


def initialize_module():
    """Initialize the rehabilitation AI module"""
    
    logger.info("=" * 60)
    logger.info("REHABILITATION AI MODULE INITIALIZATION")
    logger.info("=" * 60)
    
    # Step 1: Generate sample data
    logger.info("\n[Step 1] Generating sample datasets...")
    try:
        generator = DatasetGenerator()
        datasets = generator.generate_all_datasets(n_inmates=500)
        logger.info(f"✓ Generated datasets:")
        logger.info(f"  - Inmate profiles: {len(datasets['inmate_profiles'])} records")
        logger.info(f"  - Program outcomes: {len(datasets['program_outcomes'])} records")
        logger.info(f"  - Counseling notes: {len(datasets['counseling_notes'])} records")
        logger.info(f"  - Early release data: {len(datasets['early_release'])} records")
    except Exception as e:
        logger.error(f"✗ Error generating datasets: {e}")
        return False
    
    # Step 2: Train ML models
    logger.info("\n[Step 2] Training ML models...")
    try:
        models_dir = Path(__file__).parent / "app" / "models"
        trainer = ModelTrainer(str(models_dir))
        
        logger.info("Training recommendation model (XGBoost)...")
        results = trainer.train_all_models(n_samples=500)
        
        logger.info(f"✓ Models trained successfully:")
        logger.info(f"  - Recommendation model accuracy: {results['recommendation_accuracy']:.4f}")
        logger.info(f"  - Early release model accuracy: {results['early_release_accuracy']:.4f}")
        logger.info(f"  - Models saved to: {models_dir}")
    except Exception as e:
        logger.error(f"✗ Error training models: {e}")
        return False
    
    # Step 3: Display API endpoints
    logger.info("\n[Step 3] Rehabilitation AI Service Endpoints")
    logger.info("-" * 60)
    
    endpoints = {
        "Health Check": "GET /health",
        "Recommendations": "POST /api/v1/recommend",
        "Analyze Notes": "POST /api/v1/analyze",
        "Early Release Score": "GET /api/v1/scoring/early-release/{inmate_id}",
        "Model Info": "GET /api/v1/scoring/models/info",
        "Generate Sample Data": "POST /api/v1/data/generate-sample-data",
        "Train Models": "POST /api/v1/data/train-models",
        "Get Sample Inmate": "GET /api/v1/data/inmate-sample",
        "Get Sample Note": "GET /api/v1/data/counseling-note-sample",
        "Statistics": "GET /api/v1/data/statistics"
    }
    
    for endpoint_name, endpoint_path in endpoints.items():
        logger.info(f"  • {endpoint_name:.<40} {endpoint_path}")
    
    # Step 4: Display available features
    logger.info("\n[Step 4] AI/ML Features Enabled")
    logger.info("-" * 60)
    
    features = [
        "XGBoost-based Program Recommendation Engine",
        "Transformer-based Sentiment Analysis (DistilBERT)",
        "BART Abstractive Text Summarization",
        "Named Entity Recognition (BERT NER)",
        "Logistic Regression Early Release Prediction",
        "JWT Authentication Integration",
        "Scripted Dataset Generation",
        "Model Performance Tracking"
    ]
    
    for feature in features:
        logger.info(f"  ✓ {feature}")
    
    # Step 5: Display configuration
    logger.info("\n[Step 5] Configuration Summary")
    logger.info("-" * 60)
    
    config_info = {
        "Models Directory": str(models_dir),
        "Sample Data": "500 inmate profiles generated",
        "Recommendation Model": "XGBoost Classifier",
        "NLP Models": "HuggingFace Transformers",
        "Authentication": "JWT Token-based",
        "API Version": "v1"
    }
    
    for key, value in config_info.items():
        logger.info(f"  • {key:.<40} {value}")
    
    logger.info("\n" + "=" * 60)
    logger.info("INITIALIZATION COMPLETE!")
    logger.info("=" * 60)
    logger.info("\nTo start the service, run:")
    logger.info("  python -m uvicorn app.main:app --host 0.0.0.0 --port 8001")
    logger.info("\nAPI Documentation available at: http://localhost:8001/docs")
    logger.info("=" * 60 + "\n")
    
    return True


def quick_test():
    """Quick test of core functionality"""
    
    logger.info("\n[Test] Running quick functionality test...")
    logger.info("-" * 60)
    
    try:
        # Test 1: Dataset generation
        logger.info("Test 1: Dataset Generation...")
        generator = DatasetGenerator()
        profiles = generator.generate_inmate_profiles(10)
        logger.info(f"  ✓ Generated {len(profiles)} inmate profiles")
        
        # Test 2: NLP Service
        logger.info("Test 2: NLP Service...")
        from app.services.nlp_service import nlp_service
        from app.schemas.analysis import AnalyzeNotesRequest
        
        test_note = AnalyzeNotesRequest(
            inmateId="TEST001",
            text="Inmate showing good progress in rehabilitation. Positive behavioral changes observed."
        )
        result = nlp_service.analyze_notes(test_note)
        logger.info(f"  ✓ NLP Analysis - Sentiment: {result.sentiment}, Summary length: {len(result.summary)}")
        
        # Test 3: Recommendation Service
        logger.info("Test 3: Recommendation Service...")
        from app.services.recommendation_service import recommendation_service
        from app.schemas.recommendation import RecommendationRequest
        
        test_request = RecommendationRequest(
            inmateId="TEST001",
            suitabilityGroup="substance_abuse",
            riskScore=0.75,
            profileFeatures={"completion_percentage": 75, "attendance_rate": 85, "behavioral_score": 70}
        )
        recommendations = recommendation_service.generate_recommendations(test_request)
        logger.info(f"  ✓ Generated {len(recommendations.programs)} program recommendations")
        
        # Test 4: Scoring Service
        logger.info("Test 4: Scoring Service...")
        from app.services.scoring_service import scoring_service
        
        score_result = scoring_service.calculate_early_release_score(
            "TEST001",
            {"behavior_score": 75, "program_completion_count": 3, "disciplinary_score": 80}
        )
        logger.info(f"  ✓ Early release score: {score_result.score:.4f} ({score_result.recommendation})")
        
        logger.info("\n✓ All tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Initialize Rehabilitation AI Module")
    parser.add_argument("--test", action="store_true", help="Run quick tests after initialization")
    parser.add_argument("--no-train", action="store_true", help="Skip model training")
    
    args = parser.parse_args()
    
    if args.no_train:
        logger.info("Skipping model training (use --test to verify functionality)")
    else:
        success = initialize_module()
        
        if success and args.test:
            logger.info("\nRunning quick functionality tests...")
            quick_test()
