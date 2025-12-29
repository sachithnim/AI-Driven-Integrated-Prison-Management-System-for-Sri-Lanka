"""
Enhanced prediction API with OpenAI integration
No inmate_id required - accepts direct profile data for assessment
"""

from fastapi import APIRouter, HTTPException, Body, Query
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from datetime import datetime, timedelta

from app.schemas.dataset import (
    EligibilityAssessmentRequest, EligibilityAssessmentResponse,
    PredictionRequest, PredictionResponse
)
from app.core.openai_client import openai_client
from app.api.upload import DATASET_STORAGE
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["Predictions"])

# Load models
MODELS = {}
SCALERS = {}
ENCODERS = {}


def load_models():
    """Load all trained models"""
    models_dir = Path("app/models")
    
    try:
        # Eligibility model
        if (models_dir / "eligibility_model.joblib").exists():
            MODELS['eligibility'] = joblib.load(models_dir / "eligibility_model.joblib")
            SCALERS['eligibility'] = joblib.load(models_dir / "eligibility_scaler.joblib")
            logger.info("✓ Loaded eligibility model")
        
        # Early release model
        if (models_dir / "early_release_model.joblib").exists():
            MODELS['early_release'] = joblib.load(models_dir / "early_release_model.joblib")
            SCALERS['early_release'] = joblib.load(models_dir / "early_release_scaler.joblib")
            logger.info("✓ Loaded early release model")
        
        # Industrial training model
        if (models_dir / "industrial_training_model.joblib").exists():
            MODELS['industrial_training'] = joblib.load(models_dir / "industrial_training_model.joblib")
            SCALERS['industrial_training'] = joblib.load(models_dir / "industrial_training_scaler.joblib")
            ENCODERS['education'] = joblib.load(models_dir / "education_encoder.joblib")
            logger.info("✓ Loaded industrial training model")
        
        # Home leave model
        if (models_dir / "home_leave_model.joblib").exists():
            MODELS['home_leave'] = joblib.load(models_dir / "home_leave_model.joblib")
            SCALERS['home_leave'] = joblib.load(models_dir / "home_leave_scaler.joblib")
            logger.info("✓ Loaded home leave model")
        
        logger.info(f"Loaded {len(MODELS)} prediction models")
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")


# Load models on startup
load_models()


@router.post("/eligibility", response_model=EligibilityAssessmentResponse)
async def assess_rehab_eligibility(
    request: EligibilityAssessmentRequest = Body(..., description="Inmate profile data for eligibility assessment")
):
    """
    Assess rehabilitation eligibility using AI - NO inmate_id required
    
    Enhanced with OpenAI reasoning for transparent decision-making.
    Accepts direct inmate profile data - no database lookup needed.
    
    Required Fields:
    - behavior_score (0-100)
    - discipline_score (0-100)
    - risk_score (0-1)
    
    Returns:
    - Eligibility decision with confidence
    - AI-generated reasoning (if OpenAI enabled)
    - Recommended programs
    - Risk factors and strengths
    """
    try:
        # Check if models loaded
        if 'eligibility' not in MODELS:
            raise HTTPException(status_code=503, detail="Eligibility model not loaded. Please train models first.")
        
        # Convert request to dictionary for easier access
        inmate_data = request.dict()
        
        # Helper to get numeric value with fallback for None
        def get_num(key: str, default: float = 0) -> float:
            val = inmate_data.get(key, default)
            return default if val is None else val
        
        # Extract features (11 features matching model training)
        # Use defaults for missing or None fields to avoid NoneType errors
        time_served = get_num('time_served_months', 0)
        sentence_length = get_num('sentence_length_months', 0)
        remaining_sentence = max(0, sentence_length - time_served)  # Ensure non-negative
        
        features = np.array([[
            inmate_data['behavior_score'],
            inmate_data['discipline_score'],
            inmate_data['risk_score'],
            get_num('programs_completed', 0),
            get_num('total_attendance_rate', 0.0),
            time_served,
            remaining_sentence,
            get_num('prior_convictions', 0),
            get_num('institutional_violations', 0),
            get_num('total_incidents', 0),
            get_num('points_deducted', 0)
        ]])
        
        # Scale and predict
        features_scaled = SCALERS['eligibility'].transform(features)
        prediction = MODELS['eligibility'].predict(features_scaled)[0]
        probability = MODELS['eligibility'].predict_proba(features_scaled)[0]
        
        eligibility_score = float(probability[1])  # Probability of eligible
        eligible = bool(prediction == 1)
        confidence = float(max(probability))
        
        # Analyze profile for program recommendations and insights
        recommended_programs = []
        risk_factors = []
        strengths = []
        scores_breakdown = {}
        
        # Behavioral analysis
        behavior_score = inmate_data['behavior_score']
        discipline_score = inmate_data['discipline_score']
        risk_score = inmate_data['risk_score']
        
        scores_breakdown['behavior'] = behavior_score / 100
        scores_breakdown['discipline'] = discipline_score / 100
        scores_breakdown['risk'] = 1 - risk_score  # Invert for scoring (lower risk = better)
        
        # Identify risk factors
        if behavior_score < 60:
            risk_factors.append(f"Below-average behavior score ({behavior_score:.1f}/100)")
            recommended_programs.append("cognitive_behavioral_therapy")
        
        if discipline_score < 60:
            risk_factors.append(f"Discipline concerns ({discipline_score:.1f}/100)")
            recommended_programs.append("anger_management")
        
        if risk_score > 0.6:
            risk_factors.append(f"High risk assessment ({risk_score:.2f})")
            recommended_programs.append("intensive_counseling")
        
        violations = get_num('institutional_violations', 0)
        if violations > 3:
            risk_factors.append(f"Multiple violations ({int(violations)} incidents)")
        
        if inmate_data.get('has_substance_abuse', False):
            risk_factors.append("Substance abuse history")
            recommended_programs.append("substance_abuse_intensive")
        
        if inmate_data.get('has_mental_health_issues', False):
            risk_factors.append("Mental health concerns")
            recommended_programs.append("mental_health_therapy")
        
        # Identify strengths
        if behavior_score > 70:
            strengths.append(f"Strong behavioral record ({behavior_score:.1f}/100)")
            recommended_programs.append("vocational_carpentry")
        
        if discipline_score > 70:
            strengths.append(f"Excellent discipline ({discipline_score:.1f}/100)")
            recommended_programs.append("leadership_skills")
        
        if risk_score < 0.4:
            strengths.append(f"Low risk profile ({risk_score:.2f})")
        
        programs_completed = get_num('programs_completed', 0)
        if programs_completed > 2:
            strengths.append(f"Completed {int(programs_completed)} programs")
            scores_breakdown['program_completion'] = min(1.0, programs_completed / 5)
        
        attendance_rate = get_num('total_attendance_rate', 0)
        if attendance_rate > 0.8:
            strengths.append(f"High attendance rate ({attendance_rate*100:.0f}%)")
        
        # Remove duplicates
        recommended_programs = list(dict.fromkeys(recommended_programs))
        
        # Default programs if none recommended
        if not recommended_programs:
            recommended_programs = ["general_rehabilitation", "life_skills"]
        
        # Generate AI-powered reasoning if OpenAI enabled
        reasoning = None
        if openai_client.enabled:
            try:
                reasoning = await openai_client.generate_eligibility_reasoning(
                    inmate_data=inmate_data,
                    prediction=eligible,
                    probability=confidence,
                    risk_factors=risk_factors,
                    strengths=strengths
                )
                logger.info(f"Generated OpenAI reasoning for assessment")
            except Exception as e:
                logger.warning(f"OpenAI reasoning failed: {e}. Using fallback.")
                reasoning = None
        
        # Fallback reasoning if OpenAI not available
        if not reasoning:
            if eligible:
                reasoning = (
                    f"Inmate demonstrates readiness for rehabilitation with behavior score "
                    f"{behavior_score:.1f}/100, discipline {discipline_score:.1f}/100, and "
                    f"risk level {risk_score:.2f}. Recommended for targeted programs based on "
                    f"identified strengths and needs. Confidence: {confidence*100:.1f}%"
                )
            else:
                reasoning = (
                    f"Inmate requires additional behavioral development before rehabilitation. "
                    f"Current metrics - behavior: {behavior_score:.1f}/100, discipline: "
                    f"{discipline_score:.1f}/100, risk: {risk_score:.2f}. Focus on addressing "
                    f"identified risk factors before reassessment. Confidence: {confidence*100:.1f}%"
                )
        
        return EligibilityAssessmentResponse(
            inmate_id=inmate_data.get('inmate_id'),
            eligible=eligible,
            eligibility_score=eligibility_score,
            confidence=confidence,
            recommended_programs=recommended_programs,
            reasoning=reasoning,
            risk_factors=risk_factors,
            strengths=strengths,
            scores_breakdown=scores_breakdown
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Eligibility assessment error: {e}")
        raise HTTPException(status_code=500, detail=f"Assessment failed: {str(e)}")


@router.post("/early-release", response_model=PredictionResponse)
async def predict_early_release(
    inmate_id: str = Query(..., description="Inmate ID")
):
    """
    Predict early release eligibility using AI
    
    Analyzes behavior, program completion, discipline, time served,
    and risk assessment to predict early release eligibility.
    """
    try:
        if 'early_release' not in MODELS:
            raise HTTPException(status_code=503, detail="Early release model not loaded")
        
        if DATASET_STORAGE['inmate_profiles'] is None:
            raise HTTPException(status_code=404, detail="No inmate data loaded")
        
        inmates_df = DATASET_STORAGE['inmate_profiles']
        inmate_data = inmates_df[inmates_df['inmate_id'] == inmate_id]
        
        if inmate_data.empty:
            raise HTTPException(status_code=404, detail=f"Inmate {inmate_id} not found")
        
        inmate = inmate_data.iloc[0]
        
        # Calculate time served percentage
        time_served_pct = inmate['time_served_months'] / inmate['sentence_length_months']
        
        # Prepare features (7 features)
        features = np.array([[
            inmate['behavior_score'],
            inmate['discipline_score'],
            inmate['programs_completed'],
            time_served_pct,
            inmate['risk_score'],
            inmate['age'],
            inmate['prior_convictions']
        ]])
        
        # Scale and predict
        features_scaled = SCALERS['early_release'].transform(features)
        prediction = MODELS['early_release'].predict(features_scaled)[0]
        probability = MODELS['early_release'].predict_proba(features_scaled)[0]
        
        probability_eligible = probability[1]
        eligible = prediction == 1
        confidence = max(probability)
        
        # Analyze factors
        factors_supporting = []
        factors_against = []
        
        if inmate['behavior_score'] > 70:
            factors_supporting.append({"factor": "Behavior Score", "value": inmate['behavior_score'], "weight": "high"})
        else:
            factors_against.append({"factor": "Behavior Score", "value": inmate['behavior_score'], "weight": "high"})
        
        if inmate['discipline_score'] > 70:
            factors_supporting.append({"factor": "Discipline Score", "value": inmate['discipline_score'], "weight": "high"})
        else:
            factors_against.append({"factor": "Discipline Score", "value": inmate['discipline_score'], "weight": "medium"})
        
        if inmate['programs_completed'] >= 2:
            factors_supporting.append({"factor": "Programs Completed", "value": inmate['programs_completed'], "weight": "medium"})
        else:
            factors_against.append({"factor": "Programs Completed", "value": inmate['programs_completed'], "weight": "medium"})
        
        if time_served_pct > 0.5:
            factors_supporting.append({"factor": "Time Served", "value": f"{time_served_pct*100:.1f}%", "weight": "high"})
        
        if inmate['risk_score'] < 0.4:
            factors_supporting.append({"factor": "Low Risk", "value": inmate['risk_score'], "weight": "high"})
        elif inmate['risk_score'] > 0.6:
            factors_against.append({"factor": "High Risk", "value": inmate['risk_score'], "weight": "high"})
        
        # Predict release date
        predicted_date = None
        if eligible:
            # Estimate release in 3-12 months based on score
            months_to_release = int(3 + (1 - probability_eligible) * 9)
            predicted_date = (datetime.now() + timedelta(days=months_to_release*30)).date()
        
        # Recommendation
        if probability_eligible > 0.7:
            recommendation = "Strongly recommend early release consideration"
        elif probability_eligible > 0.5:
            recommendation = "Recommend early release review"
        else:
            recommendation = "Not recommended for early release at this time"
        
        reasoning = f"Based on {inmate['programs_completed']} completed programs, " \
                   f"{time_served_pct*100:.1f}% time served, behavior score {inmate['behavior_score']:.1f}, " \
                   f"and risk assessment {inmate['risk_score']:.2f}. {recommendation}."
        
        return PredictionResponse(
            inmate_id=inmate_id,
            prediction_type="early_release",
            prediction="eligible" if eligible else "not_eligible",
            probability=float(probability_eligible),
            confidence=float(confidence),
            factors_supporting=factors_supporting,
            factors_against=factors_against,
            recommendation=recommendation,
            predicted_date=predicted_date,
            reasoning=reasoning
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting early release: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/industrial-training", response_model=PredictionResponse)
async def predict_industrial_training(
    inmate_id: str = Query(..., description="Inmate ID")
):
    """
    Predict industrial/vocational training eligibility
    
    Considers behavior, education, age, and program participation
    to recommend training programs.
    """
    try:
        if 'industrial_training' not in MODELS:
            raise HTTPException(status_code=503, detail="Industrial training model not loaded")
        
        if DATASET_STORAGE['inmate_profiles'] is None:
            raise HTTPException(status_code=404, detail="No inmate data loaded")
        
        inmates_df = DATASET_STORAGE['inmate_profiles']
        inmate_data = inmates_df[inmates_df['inmate_id'] == inmate_id]
        
        if inmate_data.empty:
            raise HTTPException(status_code=404, detail=f"Inmate {inmate_id} not found")
        
        inmate = inmate_data.iloc[0]
        
        # Encode education
        education_encoded = ENCODERS['education'].transform([inmate['education_level']])[0]
        
        # Prepare features
        features = np.array([[
            inmate['behavior_score'],
            inmate['discipline_score'],
            inmate['risk_score'],
            inmate['age'],
            inmate['time_served_months'],
            inmate['programs_completed'],
            inmate['total_attendance_rate'],
            education_encoded
        ]])
        
        # Predict
        features_scaled = SCALERS['industrial_training'].transform(features)
        prediction = MODELS['industrial_training'].predict(features_scaled)[0]
        probability = MODELS['industrial_training'].predict_proba(features_scaled)[0]
        
        probability_eligible = probability[1]
        eligible = prediction == 1
        confidence = max(probability)
        
        # Recommended training programs based on profile
        training_recommendations = []
        
        if inmate['age'] < 35:
            training_recommendations.append("IT Basics - High demand, good long-term prospects")
            training_recommendations.append("Welding - High demand industrial skill")
        elif inmate['age'] < 50:
            training_recommendations.append("Carpentry - Versatile trade skill")
            training_recommendations.append("Automotive - Practical maintenance skills")
        else:
            training_recommendations.append("Agriculture - Age-appropriate, steady work")
            training_recommendations.append("Culinary - Service industry opportunities")
        
        reasoning = f"Inmate aged {inmate['age']} with {inmate['education_level']} education, " \
                   f"behavior score {inmate['behavior_score']:.1f}. " \
                   f"{'Suitable' if eligible else 'Not yet suitable'} for industrial training programs."
        
        return PredictionResponse(
            inmate_id=inmate_id,
            prediction_type="industrial_training",
            prediction="eligible" if eligible else "not_eligible",
            probability=float(probability_eligible),
            confidence=float(confidence),
            factors_supporting=[
                {"factor": "Recommended Programs", "value": training_recommendations, "weight": "info"}
            ],
            factors_against=[],
            recommendation=training_recommendations[0] if training_recommendations else "General vocational training",
            predicted_date=None,
            reasoning=reasoning
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting training eligibility: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/home-leave", response_model=PredictionResponse)
async def predict_home_leave(
    inmate_id: str = Query(..., description="Inmate ID")
):
    """
    Predict home leave eligibility
    
    Assesses behavior, discipline, violations, and risk for home leave approval.
    """
    try:
        if 'home_leave' not in MODELS:
            raise HTTPException(status_code=503, detail="Home leave model not loaded")
        
        if DATASET_STORAGE['inmate_profiles'] is None:
            raise HTTPException(status_code=404, detail="No inmate data loaded")
        
        inmates_df = DATASET_STORAGE['inmate_profiles']
        inmate_data = inmates_df[inmates_df['inmate_id'] == inmate_id]
        
        if inmate_data.empty:
            raise HTTPException(status_code=404, detail=f"Inmate {inmate_id} not found")
        
        inmate = inmate_data.iloc[0]
        
        # Prepare features
        features = np.array([[
            inmate['behavior_score'],
            inmate['discipline_score'],
            inmate['risk_score'],
            inmate['time_served_months'],
            inmate['institutional_violations'],
            inmate['programs_completed'],
            inmate['total_attendance_rate']
        ]])
        
        # Predict
        features_scaled = SCALERS['home_leave'].transform(features)
        prediction = MODELS['home_leave'].predict(features_scaled)[0]
        probability = MODELS['home_leave'].predict_proba(features_scaled)[0]
        
        probability_eligible = probability[1]
        eligible = prediction == 1
        confidence = max(probability)
        
        # Determine leave type eligibility
        if probability_eligible > 0.8:
            leave_type = "Earned leave (up to 7 days)"
        elif probability_eligible > 0.6:
            leave_type = "Family visit (2-3 days)"
        else:
            leave_type = "Emergency only"
        
        factors_supporting = []
        factors_against = []
        
        if inmate['behavior_score'] > 75:
            factors_supporting.append({"factor": "Excellent Behavior", "value": inmate['behavior_score'], "weight": "high"})
        else:
            factors_against.append({"factor": "Behavior Needs Improvement", "value": inmate['behavior_score'], "weight": "high"})
        
        if inmate['institutional_violations'] == 0:
            factors_supporting.append({"factor": "No Violations", "value": 0, "weight": "high"})
        else:
            factors_against.append({"factor": "Institutional Violations", "value": inmate['institutional_violations'], "weight": "high"})
        
        reasoning = f"Behavior score {inmate['behavior_score']:.1f}, discipline {inmate['discipline_score']:.1f}, " \
                   f"{inmate['institutional_violations']} violations. " \
                   f"{'Approved' if eligible else 'Not approved'} for {leave_type}."
        
        return PredictionResponse(
            inmate_id=inmate_id,
            prediction_type="home_leave",
            prediction="eligible" if eligible else "not_eligible",
            probability=float(probability_eligible),
            confidence=float(confidence),
            factors_supporting=factors_supporting,
            factors_against=factors_against,
            recommendation=leave_type,
            predicted_date=None,
            reasoning=reasoning
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error predicting home leave: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-assessment")
async def batch_eligibility_assessment(
    min_behavior_score: float = Query(60, description="Minimum behavior score"),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Batch assessment of all inmates for rehabilitation eligibility
    
    Returns list of eligible inmates sorted by eligibility score
    """
    try:
        if 'eligibility' not in MODELS:
            raise HTTPException(status_code=503, detail="Eligibility model not loaded")
        
        if DATASET_STORAGE['inmate_profiles'] is None:
            raise HTTPException(status_code=404, detail="No inmate data loaded")
        
        inmates_df = DATASET_STORAGE['inmate_profiles']
        
        # Filter by minimum behavior score
        filtered = inmates_df[inmates_df['behavior_score'] >= min_behavior_score]
        
        results = []
        
        for _, inmate in filtered.head(limit).iterrows():
            # Quick assessment
            features = np.array([[
                inmate['behavior_score'], inmate['discipline_score'], inmate['risk_score'],
                inmate['programs_completed'], inmate['total_attendance_rate'],
                inmate['time_served_months'], inmate['remaining_sentence_months'],
                inmate['prior_convictions'], inmate['institutional_violations'],
                0, 0  # simplified
            ]])
            
            features_scaled = SCALERS['eligibility'].transform(features)
            probability = MODELS['eligibility'].predict_proba(features_scaled)[0]
            
            results.append({
                "inmate_id": inmate['inmate_id'],
                "name": f"{inmate['first_name']} {inmate['last_name']}",
                "eligibility_score": float(probability[1]),
                "behavior_score": inmate['behavior_score'],
                "facility": inmate['facility']
            })
        
        # Sort by eligibility score
        results = sorted(results, key=lambda x: x['eligibility_score'], reverse=True)
        
        return {
            "total_assessed": len(results),
            "eligible_count": sum(1 for r in results if r['eligibility_score'] > 0.5),
            "inmates": results
        }
        
    except Exception as e:
        logger.error(f"Error in batch assessment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models/status")
async def get_models_status():
    """Get status of all loaded prediction models"""
    return {
        "models_loaded": list(MODELS.keys()),
        "models_available": {
            "eligibility": "eligibility" in MODELS,
            "early_release": "early_release" in MODELS,
            "industrial_training": "industrial_training" in MODELS,
            "home_leave": "home_leave" in MODELS
        },
        "total_models": len(MODELS)
    }


@router.get("/debug/storage")
async def debug_storage_status():
    """Debug endpoint to check DATASET_STORAGE"""
    logger.info(f"DEBUG: DATASET_STORAGE id = {id(DATASET_STORAGE)}")
    logger.info(f"DEBUG: inmate_profiles is None: {DATASET_STORAGE['inmate_profiles'] is None}")
    
    return {
        "storage_keys": list(DATASET_STORAGE.keys()),
        "storage_id": id(DATASET_STORAGE),
        "storage_status": {
            k: {
                "is_none": v is None,
                "type": type(v).__name__ if v is not None else "NoneType",
                "count": len(v) if v is not None else 0
            }
            for k, v in DATASET_STORAGE.items()
        }
    }


__all__ = ['router', 'load_models']
