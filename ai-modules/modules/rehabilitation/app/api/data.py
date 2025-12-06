"""
Data Management API endpoints
Provides endpoints for sample data generation and model training
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, Any
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.logging import logger
from utils.dataset_generator import DatasetGenerator, generate_sample_data
from utils.model_trainer import train_models_if_needed, ModelTrainer


router = APIRouter(prefix="/data", tags=["Data Management"])


@router.post("/generate-sample-data")
async def generate_sample_data_endpoint(n_samples: int = Query(500, ge=100, le=10000)) -> Dict[str, Any]:
    """
    Generate sample rehabilitation data for testing
    
    This endpoint creates synthetic but realistic inmate profiles,
    program outcomes, and counseling notes for testing and model training.
    
    **Parameters:**
    - n_samples: Number of inmate samples to generate (100-10000)
    
    **Returns:**
    - Summary of generated datasets
    """
    try:
        logger.info(f"Generating sample data with {n_samples} inmates")
        
        generator = DatasetGenerator()
        datasets = generator.generate_all_datasets(n_samples)
        
        summary = {
            "status": "success",
            "n_samples": n_samples,
            "datasets": {
                name: {
                    "rows": len(df),
                    "columns": list(df.columns),
                    "sample_preview": df.head(2).to_dict(orient='records')
                }
                for name, df in datasets.items()
            }
        }
        
        return summary
    
    except Exception as e:
        logger.error(f"Error generating sample data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating sample data: {str(e)}"
        )


@router.post("/train-models")
async def train_models_endpoint(n_samples: int = Query(500, ge=100, le=5000)) -> Dict[str, Any]:
    """
    Train ML models on synthetic data
    
    This endpoint generates sample data and trains:
    - XGBoost recommendation model
    - Logistic regression early release prediction model
    
    **Parameters:**
    - n_samples: Number of samples for training (100-5000)
    
    **Returns:**
    - Training results and model performance metrics
    """
    try:
        logger.info(f"Starting model training with {n_samples} samples")
        
        models_dir = Path(__file__).parent.parent / "models"
        trainer = ModelTrainer(str(models_dir))
        results = trainer.train_all_models(n_samples)
        
        return {
            "status": "success",
            "training_samples": n_samples,
            "models_dir": str(models_dir),
            "results": results
        }
    
    except Exception as e:
        logger.error(f"Error training models: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error training models: {str(e)}"
        )


@router.get("/inmate-sample")
async def get_sample_inmate() -> Dict[str, Any]:
    """
    Get a sample inmate profile for testing
    
    Returns a realistic sample inmate profile that can be used
    for testing recommendation and analysis endpoints.
    
    **Returns:**
    - Sample inmate profile with all required fields
    """
    try:
        generator = DatasetGenerator()
        profiles = generator.generate_inmate_profiles(1)
        inmate = profiles.iloc[0]
        
        return {
            "inmateId": inmate['inmate_id'],
            "age": int(inmate['age']),
            "gender": inmate['gender'],
            "educationLevel": inmate['education_level'],
            "sentenceLengthMonths": int(inmate['sentence_length_months']),
            "timeServedMonths": int(inmate['time_served_months']),
            "previousConvictions": int(inmate['previous_convictions']),
            "substanceAbuseHistory": bool(inmate['substance_abuse_history']),
            "mentalHealthDiagnosis": bool(inmate['mental_health_diagnosis']),
            "disciplinaryIncidents": int(inmate['disciplinary_incidents']),
            "suitabilityGroup": inmate['suitability_group'],
            "riskScore": float(inmate['risk_score'])
        }
    
    except Exception as e:
        logger.error(f"Error generating sample inmate: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating sample inmate: {str(e)}"
        )


@router.get("/counseling-note-sample")
async def get_sample_counseling_note() -> Dict[str, Any]:
    """
    Get a sample counseling note for testing
    
    Returns a realistic sample counseling note that can be used
    for testing NLP analysis endpoints.
    
    **Returns:**
    - Sample counseling note with text and metadata
    """
    try:
        generator = DatasetGenerator()
        notes = generator.generate_counseling_notes(1)
        note = notes.iloc[0]
        
        return {
            "noteId": note['note_id'],
            "inmateId": note['inmate_id'],
            "counselorId": note['counselor_id'],
            "date": note['date'].isoformat(),
            "noteText": note['note_text'],
            "sentiment": note['sentiment']
        }
    
    except Exception as e:
        logger.error(f"Error generating sample counseling note: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating sample counseling note: {str(e)}"
        )


@router.get("/program-recommendation-sample")
async def get_sample_recommendation_request() -> Dict[str, Any]:
    """
    Get a sample program recommendation request for testing
    
    Returns a realistic sample request that can be used for testing
    the recommendation endpoint.
    
    **Returns:**
    - Sample program recommendation request
    """
    try:
        generator = DatasetGenerator()
        profiles = generator.generate_inmate_profiles(1)
        inmate = profiles.iloc[0]
        
        return {
            "inmateId": inmate['inmate_id'],
            "profileFeatures": {
                "completion_percentage": 65.5,
                "attendance_rate": 78.3,
                "behavioral_score": 72.1
            },
            "suitabilityGroup": inmate['suitability_group'],
            "riskScore": float(inmate['risk_score'])
        }
    
    except Exception as e:
        logger.error(f"Error generating sample request: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating sample request: {str(e)}"
        )


@router.get("/statistics")
async def get_statistics() -> Dict[str, Any]:
    """
    Get statistics about generated sample data
    
    Returns information about the structure and distribution
    of the sample datasets.
    
    **Returns:**
    - Dataset statistics and distribution information
    """
    try:
        generator = DatasetGenerator()
        datasets = generator.generate_all_datasets(100)
        
        stats = {
            "inmate_profiles": {
                "total": len(datasets['inmate_profiles']),
                "columns": list(datasets['inmate_profiles'].columns),
                "age_range": {
                    "min": int(datasets['inmate_profiles']['age'].min()),
                    "max": int(datasets['inmate_profiles']['age'].max()),
                    "mean": float(datasets['inmate_profiles']['age'].mean())
                },
                "risk_score_distribution": {
                    "min": float(datasets['inmate_profiles']['risk_score'].min()),
                    "max": float(datasets['inmate_profiles']['risk_score'].max()),
                    "mean": float(datasets['inmate_profiles']['risk_score'].mean())
                }
            },
            "program_outcomes": {
                "total": len(datasets['program_outcomes']),
                "completion_status_distribution": datasets['program_outcomes']['completion_status'].value_counts().to_dict(),
                "programs": len(datasets['program_outcomes']['program_type'].unique())
            },
            "counseling_notes": {
                "total": len(datasets['counseling_notes']),
                "sentiment_distribution": datasets['counseling_notes']['sentiment'].value_counts().to_dict()
            },
            "early_release": {
                "total": len(datasets['early_release']),
                "eligible_count": int(datasets['early_release']['eligible_for_early_release'].sum()),
                "eligible_percentage": float(
                    datasets['early_release']['eligible_for_early_release'].mean() * 100
                )
            }
        }
        
        return stats
    
    except Exception as e:
        logger.error(f"Error generating statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating statistics: {str(e)}"
        )
