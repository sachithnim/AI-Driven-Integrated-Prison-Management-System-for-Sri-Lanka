"""
Post-Rehabilitation Predictions API
- Early Release Date Prediction
- Presidential Pardon Eligibility
- Home Leave Eligibility
- Aggregate prediction dashboard
Uses trained ML models (joblib) + LLM reasoning hybrid.
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import numpy as np
import joblib
import logging
import json
from pathlib import Path
from datetime import datetime, date, timedelta

from app.core.openai_client import openai_client
from app.core.rag_config import retrieve_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/post-rehab", tags=["Post-Rehabilitation Predictions"])

# Load models
MODELS: Dict[str, Any] = {}
SCALERS: Dict[str, Any] = {}

_MODELS_DIR = Path(__file__).parent.parent / "models"

def _load_models():
    """Load ML models, silently skipping any that fail to unpickle
    (e.g. version mismatch – _loss module absent).  The endpoints fall
    back to LLM-only scoring when a model is unavailable."""
    for name, fname in [
        ("early_release", "early_release_model.joblib"),
        ("home_leave",    "home_leave_model.joblib"),
    ]:
        model_path = _MODELS_DIR / fname
        scaler_path = _MODELS_DIR / f"{'early_release' if name == 'early_release' else name}_scaler.joblib"
        if model_path.exists():
            try:
                MODELS[name] = joblib.load(model_path)
                logger.info(f"✓ Loaded {name} model")
            except Exception as exc:
                logger.warning(
                    f"Could not load {name} model ({model_path.name}): {exc}. "
                    "Falling back to LLM-only scoring for this model."
                )
        if scaler_path.exists():
            try:
                SCALERS[name] = joblib.load(scaler_path)
            except Exception as exc:
                logger.warning(f"Could not load {name} scaler: {exc}")

_load_models()


# ---------------------------------------------------------------------------
# Input / Output Schemas
# ---------------------------------------------------------------------------

class InmateReleaseProfile(BaseModel):
    inmate_id: str
    # Sentence
    sentence_length_months: int = Field(..., ge=1)
    time_served_months: int = Field(..., ge=0)
    admission_date: Optional[str] = None    # ISO date string
    # Behavior
    behavior_score: float = Field(..., ge=0, le=100)
    discipline_score: float = Field(..., ge=0, le=100)
    risk_score: float = Field(..., ge=0, le=1)
    # Programs
    programs_completed: int = Field(0, ge=0)
    total_attendance_rate: float = Field(0.0, ge=0, le=1)
    # History
    prior_convictions: int = Field(0, ge=0)
    institutional_violations: int = Field(0, ge=0)
    # Health
    has_substance_abuse: bool = False
    has_mental_health_issues: bool = False
    # Social
    family_support: float = Field(0.5, ge=0, le=1)
    community_ties: float = Field(0.5, ge=0, le=1)
    employment_prospects: float = Field(0.5, ge=0, le=1)
    # Crime
    crime_severity: int = Field(2, ge=1, le=5, description="1=minor, 5=capital")
    case_type: Optional[str] = None
    # Rehabilitation
    rehab_program_completed: bool = False
    overall_progress_score: float = Field(50.0, ge=0, le=100)
    counseling_sessions_completed: int = Field(0, ge=0)
    avg_counseling_score: float = Field(5.0, ge=0, le=10)
    # Medical
    medical_clearance: bool = False
    officer_recommendation_score: float = Field(0.5, ge=0, le=1)


class EarlyReleasePrediction(BaseModel):
    inmate_id: str
    eligible: bool
    probability: float
    predicted_release_date: Optional[str] = None
    months_until_eligible: Optional[int] = None
    minimum_required_date: Optional[str] = None
    key_conditions: List[str]
    blocking_factors: List[str]
    reasoning: str
    confidence: float


class PardonPrediction(BaseModel):
    inmate_id: str
    eligible: bool
    probability: float
    key_criteria_met: List[str]
    key_criteria_not_met: List[str]
    reasoning: str
    recommended_action: str
    confidence: float


class HomeLeaveePrediction(BaseModel):
    inmate_id: str
    eligible: bool
    probability: float
    recommended_duration_days: Optional[int] = None
    conditions: List[str]
    risk_mitigations: List[str]
    reasoning: str
    confidence: float


class AggregatedPredictions(BaseModel):
    inmate_id: str
    early_release: EarlyReleasePrediction
    presidential_pardon: PardonPrediction
    home_leave: HomeLeaveePrediction
    overall_readiness_score: float
    priority_recommendation: str
    generated_at: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/early-release", response_model=EarlyReleasePrediction)
async def predict_early_release(profile: InmateReleaseProfile = Body(...)):
    """
    Predict whether an inmate is eligible for early release and estimate the release date.
    Uses trained ML model + GPT reasoning hybrid.
    """
    features = _build_release_features(profile)
    ml_prob = _ml_predict(features, "early_release")

    llm_prob = ml_prob
    llm_reasoning = None
    conditions: List[str] = []
    blocking: List[str] = []

    # Determine conditions / blockers from raw features
    percent_served = profile.time_served_months / profile.sentence_length_months if profile.sentence_length_months else 0

    if percent_served < 0.5:
        blocking.append(f"Has served only {percent_served*100:.0f}% of sentence (minimum 50% typically required)")
    else:
        conditions.append(f"Has served {percent_served*100:.0f}% of sentence")

    if profile.institutional_violations > 2:
        blocking.append(f"{profile.institutional_violations} institutional violations on record")
    if profile.behavior_score >= 70:
        conditions.append(f"Good behavior score ({profile.behavior_score:.0f}/100)")
    if profile.rehab_program_completed:
        conditions.append("Completed rehabilitation program")
    if profile.prior_convictions >= 3:
        blocking.append(f"{profile.prior_convictions} prior convictions")
    if profile.risk_score > 0.6:
        blocking.append(f"High risk score ({profile.risk_score:.2f})")

    if openai_client.enabled:
        try:
            rag_context = retrieve_context(
                query_tags=["early_release", "legal", "eligibility"],
                query_text=f"early release sentence served behavior score violations",
            )
            prompt = f"""You are a Sentence Review Board member assessing an early release application under Sri Lankan law.

RELEVANT LAWS & GUIDELINES:
{rag_context}

INMATE PROFILE:
- Sentence: {profile.sentence_length_months} months, served {profile.time_served_months} months ({percent_served*100:.0f}%)
- Behavior Score: {profile.behavior_score}/100
- Discipline Score: {profile.discipline_score}/100
- Risk Score: {profile.risk_score}
- Programs Completed: {profile.programs_completed} (Rehab Program Completed: {profile.rehab_program_completed})
- Counseling Sessions: {profile.counseling_sessions_completed} (Avg Score: {profile.avg_counseling_score}/10)
- Violations: {profile.institutional_violations}
- Prior Convictions: {profile.prior_convictions}
- Family Support: {profile.family_support}
- Community Ties: {profile.community_ties}
- Employment Prospects: {profile.employment_prospects}
- Crime Severity: {profile.crime_severity}/5
- Officer Recommendation: {profile.officer_recommendation_score}
- Overall Progress Score: {profile.overall_progress_score}/100

ML Model Probability: {ml_prob:.3f}

Apply the Sri Lankan legal criteria from the guidelines above. Be specific about which criteria are met or unmet.

Return JSON ONLY:
{{
  "probability": <float 0-1>,
  "eligible": <bool>,
  "months_until_eligible": <int or null>,
  "key_conditions": ["<met condition>"],
  "blocking_factors": ["<blocking factor>"],
  "reasoning": "<detailed 3-4 sentence reasoning citing specific criteria>"
}}"""

            resp = await openai_client.get_chat_completion(
                messages=[
                    {"role": "system", "content": "You are a sentence review board AI. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=600
            )
            data = json.loads(resp.replace("```json","").replace("```","").strip())
            llm_prob = float(data.get("probability", ml_prob))
            llm_reasoning = data.get("reasoning", "")
            conditions = list(set(conditions + data.get("key_conditions", [])))
            blocking = list(set(blocking + data.get("blocking_factors", [])))
            months_until = data.get("months_until_eligible")
        except Exception as e:
            logger.warning(f"LLM early release prediction failed: {e}")
            months_until = None
    else:
        months_until = None

    final_prob = ml_prob * 0.55 + llm_prob * 0.45
    eligible = final_prob >= 0.5

    # Compute estimated release date
    predicted_date = None
    min_required_date = None
    try:
        if profile.admission_date:
            adm = datetime.fromisoformat(profile.admission_date)
            min_months = max(0, int(profile.sentence_length_months * 0.5) - profile.time_served_months)
            if months_until is None:
                months_until = min_months if not eligible else 0
            predicted_date = (adm + timedelta(days=30 * (profile.time_served_months + (months_until or 0)))).strftime("%Y-%m-%d")
            min_required_date = (adm + timedelta(days=30 * int(profile.sentence_length_months * 0.5))).strftime("%Y-%m-%d")
    except Exception:
        pass

    return EarlyReleasePrediction(
        inmate_id=profile.inmate_id,
        eligible=eligible,
        probability=round(final_prob, 4),
        predicted_release_date=predicted_date,
        months_until_eligible=months_until,
        minimum_required_date=min_required_date,
        key_conditions=conditions,
        blocking_factors=blocking,
        reasoning=llm_reasoning or _default_release_reasoning(profile, final_prob),
        confidence=_calc_confidence(final_prob, openai_client.enabled)
    )


@router.post("/presidential-pardon", response_model=PardonPrediction)
async def predict_presidential_pardon(profile: InmateReleaseProfile = Body(...)):
    """
    Assess eligibility for presidential pardon based on rehabilitation progress,
    crime severity, and good conduct.
    """
    criteria_met: List[str] = []
    criteria_not_met: List[str] = []

    percent_served = profile.time_served_months / profile.sentence_length_months if profile.sentence_length_months else 0

    # Pardon criteria assessment (Sri Lankan context)
    if percent_served >= 0.70:
        criteria_met.append(f"Served ≥70% of sentence ({percent_served*100:.0f}%)")
    else:
        criteria_not_met.append(f"Has not served 70% of sentence (currently {percent_served*100:.0f}%)")

    if profile.crime_severity <= 2:
        criteria_met.append(f"Non-serious offence (severity {profile.crime_severity}/5)")
    else:
        criteria_not_met.append(f"Serious offence (severity {profile.crime_severity}/5)")

    if profile.institutional_violations == 0:
        criteria_met.append("Clean institutional record")
    else:
        criteria_not_met.append(f"{profile.institutional_violations} violations on record")

    if profile.rehab_program_completed:
        criteria_met.append("Completed full rehabilitation program")
    else:
        criteria_not_met.append("Has not completed rehabilitation program")

    if profile.prior_convictions == 0:
        criteria_met.append("First-time offender")
    elif profile.prior_convictions >= 2:
        criteria_not_met.append(f"Repeat offender ({profile.prior_convictions} prior convictions)")

    if profile.overall_progress_score >= 75:
        criteria_met.append(f"Excellent rehabilitation progress ({profile.overall_progress_score:.0f}/100)")
    elif profile.overall_progress_score < 50:
        criteria_not_met.append(f"Low rehabilitation progress score ({profile.overall_progress_score:.0f}/100)")

    # Rule-based probability
    rule_prob = len(criteria_met) / max(1, len(criteria_met) + len(criteria_not_met))

    llm_prob = rule_prob
    llm_reasoning = None
    recommended_action = "Continue rehabilitation program."

    if openai_client.enabled:
        try:
            rag_context = retrieve_context(
                query_tags=["pardon", "presidential", "legal"],
                query_text=f"presidential pardon eligibility criteria offence severity",
            )
            prompt = f"""You are a Presidential Pardons Committee advisor for the Sri Lanka prison system.

RELEVANT LAWS & GUIDELINES:
{rag_context}

INMATE PROFILE:
- Sentence: {profile.sentence_length_months} months, served {profile.time_served_months} months ({percent_served*100:.0f}%)
- Crime Severity: {profile.crime_severity}/5 (1=minor, 5=capital)
- Rehab Program: {'Completed' if profile.rehab_program_completed else 'Incomplete'}
- Progress Score: {profile.overall_progress_score}/100
- Violations: {profile.institutional_violations}
- Prior Convictions: {profile.prior_convictions}
- Behavior Score: {profile.behavior_score}/100
- Family Support: {profile.family_support}
- Community Ties: {profile.community_ties}

CRITERIA MET: {criteria_met}
CRITERIA NOT MET: {criteria_not_met}

Apply the Sri Lankan Presidential Pardon criteria from the guidelines above. Capital offences (severity 5) are generally not eligible. Be specific and cite the relevant article or rule.

Return JSON ONLY:
{{
  "probability": <float 0-1>,
  "eligible": <bool>,
  "reasoning": "<detailed 3-4 sentence legal reasoning>",
  "recommended_action": "<specific action for rehabilitation team>"
}}"""

            resp = await openai_client.get_chat_completion(
                messages=[
                    {"role": "system", "content": "You are a pardons committee advisor. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=500
            )
            data = json.loads(resp.replace("```json","").replace("```","").strip())
            llm_prob = float(data.get("probability", rule_prob))
            llm_reasoning = data.get("reasoning", "")
            recommended_action = data.get("recommended_action", recommended_action)
        except Exception as e:
            logger.warning(f"LLM pardon prediction failed: {e}")

    final_prob = rule_prob * 0.5 + llm_prob * 0.5
    eligible = final_prob >= 0.5 and profile.crime_severity < 5  # Capital offences cannot be pardoned

    return PardonPrediction(
        inmate_id=profile.inmate_id,
        eligible=eligible,
        probability=round(final_prob, 4),
        key_criteria_met=criteria_met,
        key_criteria_not_met=criteria_not_met,
        reasoning=llm_reasoning or f"Assessment based on {len(criteria_met)} met and {len(criteria_not_met)} unmet criteria.",
        recommended_action=recommended_action,
        confidence=_calc_confidence(final_prob, openai_client.enabled)
    )


@router.post("/home-leave", response_model=HomeLeaveePrediction)
async def predict_home_leave(profile: InmateReleaseProfile = Body(...)):
    """
    Predict eligibility for supervised home leave / furlough.
    """
    features = _build_release_features(profile)
    ml_prob = _ml_predict(features, "home_leave")

    conditions: List[str] = []
    mitigations: List[str] = []
    percent_served = profile.time_served_months / profile.sentence_length_months if profile.sentence_length_months else 0

    if profile.behavior_score >= 75:
        conditions.append(f"Good behavior ({profile.behavior_score:.0f}/100)")
    if profile.family_support >= 0.7:
        conditions.append("Strong family support network")
    else:
        mitigations.append("Weak family support - require GPS monitoring")
    if profile.institutional_violations > 0:
        mitigations.append(f"Past violations - strict reporting conditions")
    if profile.risk_score > 0.5:
        mitigations.append("Elevated risk - daily check-in required")
    if percent_served >= 0.33:
        conditions.append(f"Served sufficient portion ({percent_served*100:.0f}%)")

    llm_prob = ml_prob
    llm_reasoning = None
    duration_days = 3

    if openai_client.enabled:
        try:
            rag_context = retrieve_context(
                query_tags=["home_leave", "furlough", "gps"],
                query_text=f"home leave furlough eligibility GPS monitoring conditions",
            )
            prompt = f"""You are a Prison Case Manager assessing a home leave (furlough) application under Sri Lankan prison regulations.

RELEVANT REGULATIONS:
{rag_context}

INMATE PROFILE:
- Sentence: {profile.sentence_length_months} months, served {profile.time_served_months} months ({percent_served*100:.0f}%)
- Behavior Score: {profile.behavior_score}/100
- Risk Score: {profile.risk_score}
- Family Support: {profile.family_support}
- Community Ties: {profile.community_ties}
- Violations: {profile.institutional_violations}
- Programs Completed: {profile.programs_completed}
- Progress Score: {profile.overall_progress_score}/100
- Crime Severity: {profile.crime_severity}/5
- Counseling Score Avg: {profile.avg_counseling_score}/10
- Substance Abuse History: {profile.has_substance_abuse}

Apply the Sri Lankan home leave criteria from the regulations above. Specify GPS and check-in conditions where applicable.

Return JSON ONLY:
{{
  "probability": <float 0-1>,
  "eligible": <bool>,
  "recommended_duration_days": <int 1-14>,
  "conditions": ["<condition>"],
  "risk_mitigations": ["<mitigation>"],
  "reasoning": "<2-3 sentence reasoning>"
}}"""

            resp = await openai_client.get_chat_completion(
                messages=[
                    {"role": "system", "content": "You are a prison case manager. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=500
            )
            data = json.loads(resp.replace("```json","").replace("```","").strip())
            llm_prob = float(data.get("probability", ml_prob))
            llm_reasoning = data.get("reasoning", "")
            duration_days = int(data.get("recommended_duration_days", 3))
            conditions = list(set(conditions + data.get("conditions", [])))
            mitigations = list(set(mitigations + data.get("risk_mitigations", [])))
        except Exception as e:
            logger.warning(f"LLM home leave prediction failed: {e}")

    final_prob = ml_prob * 0.5 + llm_prob * 0.5
    eligible = final_prob >= 0.5

    return HomeLeaveePrediction(
        inmate_id=profile.inmate_id,
        eligible=eligible,
        probability=round(final_prob, 4),
        recommended_duration_days=duration_days if eligible else None,
        conditions=conditions,
        risk_mitigations=mitigations,
        reasoning=llm_reasoning or f"Home leave assessment: probability {final_prob:.2f}.",
        confidence=_calc_confidence(final_prob, openai_client.enabled)
    )


@router.post("/all-predictions", response_model=AggregatedPredictions)
async def get_all_predictions(profile: InmateReleaseProfile = Body(...)):
    """
    Run all three predictions in one call and return an aggregated readiness summary.
    """
    import asyncio
    early_release, pardon, home_leave = await asyncio.gather(
        predict_early_release(profile),
        predict_presidential_pardon(profile),
        predict_home_leave(profile),
    )

    readiness = (
        early_release.probability * 0.4 +
        pardon.probability * 0.2 +
        home_leave.probability * 0.4
    ) * 100

    # Determine priority recommendation
    if early_release.eligible:
        priority = "Initiate early release application immediately."
    elif home_leave.eligible:
        priority = "Apply for supervised home leave as rehabilitation milestone."
    elif pardon.eligible:
        priority = "Submit presidential pardon application."
    else:
        priority = "Continue current rehabilitation program and reassess in 3 months."

    return AggregatedPredictions(
        inmate_id=profile.inmate_id,
        early_release=early_release,
        presidential_pardon=pardon,
        home_leave=home_leave,
        overall_readiness_score=round(readiness, 1),
        priority_recommendation=priority,
        generated_at=datetime.now().isoformat()
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_release_features(p: InmateReleaseProfile) -> np.ndarray:
    percent = p.time_served_months / max(1, p.sentence_length_months)
    remaining = max(0, p.sentence_length_months - p.time_served_months)
    return np.array([[
        p.behavior_score,
        p.discipline_score,
        p.risk_score,
        p.programs_completed,
        p.total_attendance_rate,
        p.time_served_months,
        remaining,
        p.prior_convictions,
        p.institutional_violations,
        percent,
        float(p.rehab_program_completed)
    ]])


def _ml_predict(features: np.ndarray, model_key: str) -> float:
    try:
        if model_key in MODELS and model_key in SCALERS:
            scaled = SCALERS[model_key].transform(features)
            proba = MODELS[model_key].predict_proba(scaled)[0]
            return float(proba[1]) if len(proba) > 1 else float(proba[0])
    except Exception as e:
        logger.warning(f"ML predict failed for {model_key}: {e}")
    # Fallback: simple rule-based
    b, d, r = features[0][0], features[0][1], features[0][2]
    return float((b / 100 * 0.35 + d / 100 * 0.25 + (1 - r) * 0.4))


def _calc_confidence(prob: float, llm_used: bool) -> float:
    certainty = abs(prob - 0.5) * 2
    return min(0.97, 0.5 + certainty * 0.35 + (0.1 if llm_used else 0.0))


def _default_release_reasoning(p: InmateReleaseProfile, prob: float) -> str:
    pct = p.time_served_months / max(1, p.sentence_length_months)
    return (
        f"Based on rule-based analysis: {pct*100:.0f}% sentence served, "
        f"behavior score {p.behavior_score:.0f}/100, risk {p.risk_score:.2f}. "
        f"Eligibility probability: {prob:.2f}."
    )
