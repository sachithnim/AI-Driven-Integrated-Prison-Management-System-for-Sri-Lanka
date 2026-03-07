"""
Enhanced Dynamic Eligibility Assessment API
Allows the caller to specify exactly which factors to include in the assessment.
Any number of parameters can be passed; the LLM + ML hybrid adjusts accordingly.
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import numpy as np
import logging
import json
import importlib

from app.core.openai_client import openai_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/eligibility", tags=["Enhanced Eligibility"])

# ---------------------------------------------------------------------------
# FACTOR REGISTRY
# Each factor has a description and a default value if not provided.
# ---------------------------------------------------------------------------
FACTOR_REGISTRY: Dict[str, Dict[str, Any]] = {
    # Core behavioral
    "behavior_score":           {"label": "Behavior Score (0-100)",           "default": 70.0,  "weight": 1.5, "category": "behavioral"},
    "discipline_score":         {"label": "Discipline Score (0-100)",          "default": 70.0,  "weight": 1.2, "category": "behavioral"},
    "risk_score":               {"label": "Risk Assessment Score (0-1)",        "default": 0.5,   "weight": 1.5, "category": "risk"},

    # Time / sentence
    "time_served_months":       {"label": "Time Served (months)",              "default": 12,    "weight": 0.8, "category": "sentence"},
    "sentence_length_months":   {"label": "Total Sentence Length (months)",    "default": 36,    "weight": 0.6, "category": "sentence"},
    "remaining_sentence_months":{"label": "Remaining Sentence (months)",       "default": 24,    "weight": 0.7, "category": "sentence"},
    "percent_sentence_served":  {"label": "% Sentence Served",                 "default": 0.33,  "weight": 1.0, "category": "sentence"},

    # Program participation
    "programs_completed":       {"label": "Programs Completed",                "default": 0,     "weight": 1.3, "category": "programs"},
    "total_attendance_rate":    {"label": "Program Attendance Rate (0-1)",     "default": 0.0,   "weight": 1.1, "category": "programs"},
    "performance_score":        {"label": "Program Performance Score (0-100)", "default": 0.0,   "weight": 1.0, "category": "programs"},

    # Criminal history
    "prior_convictions":        {"label": "Prior Convictions",                 "default": 0,     "weight": 1.2, "category": "history"},
    "institutional_violations": {"label": "Institutional Violations",          "default": 0,     "weight": 1.3, "category": "history"},
    "total_incidents":          {"label": "Total Incidents",                   "default": 0,     "weight": 1.1, "category": "history"},
    "points_deducted":          {"label": "Total Points Deducted",             "default": 0,     "weight": 0.8, "category": "history"},

    # Health / mental
    "has_substance_abuse":      {"label": "Substance Abuse History",           "default": False, "weight": 1.0, "category": "health"},
    "has_mental_health_issues": {"label": "Mental Health Issues",              "default": False, "weight": 1.0, "category": "health"},
    "requires_medical_attention":{"label": "Requires Medical Attention",       "default": False, "weight": 0.8, "category": "health"},

    # Socio-demographic
    "age":                      {"label": "Age",                              "default": 30,    "weight": 0.6, "category": "demographic"},
    "education_level":          {"label": "Education Level (1-5)",            "default": 2,     "weight": 0.7, "category": "demographic"},
    "employment_history":       {"label": "Employment History (0-1)",          "default": 0.5,   "weight": 0.7, "category": "demographic"},
    "family_support":           {"label": "Family Support Score (0-1)",        "default": 0.5,   "weight": 0.9, "category": "social"},
    "community_ties":           {"label": "Community Ties Score (0-1)",        "default": 0.5,   "weight": 0.8, "category": "social"},

    # Progress / rehabilitation indicators
    "counseling_sessions_attended": {"label": "Counseling Sessions Attended",  "default": 0,    "weight": 1.2, "category": "progress"},
    "avg_counseling_score":         {"label": "Avg Counseling Session Score (0-10)", "default": 5.0, "weight": 1.1, "category": "progress"},
    "medical_clearance":            {"label": "Medical Clearance Granted",     "default": False, "weight": 0.9, "category": "health"},
    "officer_recommendation":       {"label": "Officer Recommendation (0-1)",  "default": 0.5,   "weight": 1.4, "category": "assessment"},
    "case_type":                    {"label": "Case Type (1=minor, 5=severe)", "default": 2,     "weight": 1.1, "category": "history"},
}


class DynamicEligibilityRequest(BaseModel):
    inmate_id: str = Field(..., description="Inmate identifier")
    selected_factors: List[str] = Field(
        ...,
        description="List of factor keys from the registry to include in this assessment",
        example=["behavior_score", "discipline_score", "risk_score", "programs_completed", "prior_convictions"]
    )
    factor_values: Dict[str, Any] = Field(
        ...,
        description="Values for the selected factors"
    )
    custom_weights: Optional[Dict[str, float]] = Field(
        None,
        description="Optional: override the default weight for any factor (1.0 = neutral)"
    )
    context_notes: Optional[str] = Field(
        None,
        description="Any additional narrative context for the AI assessor"
    )


class FactorResult(BaseModel):
    factor: str
    label: str
    value: Any
    weight: float
    contribution: float
    category: str
    flag: Optional[str] = None   # "positive" | "negative" | "neutral"


class DynamicEligibilityResponse(BaseModel):
    inmate_id: str
    eligible: bool
    eligibility_score: float
    confidence: float
    selected_factors: List[str]
    factor_results: List[FactorResult]
    risk_factors: List[str]
    strengths: List[str]
    recommended_programs: List[str]
    reasoning: str
    assessment_method: str   # "hybrid" | "llm_only" | "rule_based"


class FactorRegistryResponse(BaseModel):
    factors: Dict[str, Dict[str, Any]]
    categories: List[str]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/factors", response_model=FactorRegistryResponse)
async def get_available_factors():
    """
    Return all available assessment factors, their labels, defaults, 
    and categories. The frontend uses this to build the selection UI.
    """
    categories = list({info["category"] for info in FACTOR_REGISTRY.values()})
    # Strip non-serialisable fields
    clean = {
        k: {
            "label": v["label"],
            "default": v["default"],
            "weight": v["weight"],
            "category": v["category"],
        }
        for k, v in FACTOR_REGISTRY.items()
    }
    return FactorRegistryResponse(factors=clean, categories=sorted(categories))


@router.post("/assess", response_model=DynamicEligibilityResponse)
async def dynamic_eligibility_assessment(
    request: DynamicEligibilityRequest = Body(...)
):
    """
    Perform a dynamic eligibility assessment using any combination of factors.
    
    1. Validate that selected_factors are known.
    2. Build a weighted rule-based score from the selected factors.
    3. Send to LLM with the exact factor set for contextual re-scoring.
    4. Return hybrid score + detailed factor breakdown.
    """
    # 1. Validate factors
    unknown = [f for f in request.selected_factors if f not in FACTOR_REGISTRY]
    if unknown:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown factors: {unknown}. Call GET /eligibility/factors for the full list."
        )

    if not request.selected_factors:
        raise HTTPException(status_code=422, detail="At least one factor must be selected.")

    # 2. Resolve values + weights
    factor_results: List[FactorResult] = []
    risk_factors: List[str] = []
    strengths: List[str] = []
    recommended_programs: List[str] = []

    weighted_sum = 0.0
    total_weight = 0.0

    for factor_key in request.selected_factors:
        meta = FACTOR_REGISTRY[factor_key]
        raw_value = request.factor_values.get(factor_key, meta["default"])
        weight = (request.custom_weights or {}).get(factor_key, meta["weight"])
        
        # Normalize value to 0-1 contribution
        contribution, flag = _normalize_factor(factor_key, raw_value)

        weighted_sum += contribution * weight
        total_weight += weight

        if flag == "negative":
            risk_factors.append(f"{meta['label']}: {raw_value}")
        elif flag == "positive":
            strengths.append(f"{meta['label']}: {raw_value}")
        
        # Program suggestions based on specific factors
        _suggest_programs(factor_key, raw_value, recommended_programs)

        factor_results.append(FactorResult(
            factor=factor_key,
            label=meta["label"],
            value=raw_value,
            weight=weight,
            contribution=round(contribution, 3),
            category=meta["category"],
            flag=flag
        ))

    rule_score = (weighted_sum / total_weight) if total_weight > 0 else 0.5
    recommended_programs = list(dict.fromkeys(recommended_programs))  # deduplicate

    # 3. LLM enhancement
    llm_score = rule_score
    llm_reasoning = None
    assessment_method = "rule_based"

    if openai_client.enabled:
        try:
            factors_summary = "\n".join(
                f"  - {FACTOR_REGISTRY[f]['label']}: {request.factor_values.get(f, FACTOR_REGISTRY[f]['default'])}"
                for f in request.selected_factors
            )
            programs_str = ", ".join(recommended_programs) or "none identified"
            risk_str = "; ".join(risk_factors) or "none"
            strength_str = "; ".join(strengths) or "none"

            prompt = f"""You are a senior Correctional Rehabilitation Specialist conducting a formal eligibility assessment.

INMATE PROFILE (selected assessment factors only):
{factors_summary}

IDENTIFIED RISK FACTORS: {risk_str}
IDENTIFIED STRENGTHS: {strength_str}
ADDITIONAL CONTEXT: {request.context_notes or 'None provided'}

YOUR TASK:
Based ONLY on the factors listed above, determine:
1. An eligibility score from 0.0 (not eligible) to 1.0 (highly eligible)
2. A concise reasoning paragraph explaining the decision

SCORING GUIDE:
- 0.0–0.3: Not eligible (serious concerns)
- 0.3–0.5: Borderline (needs improvement in key areas)
- 0.5–0.7: Eligible with conditions
- 0.7–1.0: Clearly eligible

IMPORTANT: You are assessing based ONLY on the {len(request.selected_factors)} factors provided here. 
Do NOT assume information not listed. Be specific and reference actual values.

Respond in valid JSON ONLY:
{{
  "eligibility_score": <float>,
  "reasoning": "<detailed paragraph>",
  "additional_recommended_programs": ["<program1>", "<program2>"]
}}"""

            response_text = await openai_client.get_chat_completion(
                messages=[
                    {"role": "system", "content": "You are a prison rehabilitation expert. Output valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=600
            )

            cleaned = response_text.replace("```json", "").replace("```", "").strip()
            llm_data = json.loads(cleaned)
            llm_score = float(llm_data.get("eligibility_score", rule_score))
            llm_reasoning = llm_data.get("reasoning", "")
            extra_programs = llm_data.get("additional_recommended_programs", [])
            recommended_programs = list(dict.fromkeys(recommended_programs + extra_programs))
            assessment_method = "hybrid"
            logger.info(f"LLM eligibility score: {llm_score:.3f} (rule: {rule_score:.3f})")

        except Exception as e:
            logger.warning(f"LLM enhancement failed: {e}")
            assessment_method = "rule_based"

    # 4. Hybrid score: rule 50% + LLM 50% when both available
    if assessment_method == "hybrid":
        final_score = rule_score * 0.5 + llm_score * 0.5
    else:
        final_score = rule_score

    eligible = final_score >= 0.5

    # Fallback reasoning
    if not llm_reasoning:
        if eligible:
            llm_reasoning = (
                f"Inmate shows eligibility based on {len(request.selected_factors)} assessed factors. "
                f"Rule-based score: {rule_score:.2f}. "
                f"Key strengths: {strength_str}. Proceed with program enrollment."
            )
        else:
            llm_reasoning = (
                f"Inmate does not meet eligibility threshold based on {len(request.selected_factors)} assessed factors. "
                f"Rule-based score: {rule_score:.2f}. "
                f"Key concerns: {risk_str}. Re-assess after addressing identified risks."
            )

    confidence = _calculate_confidence(final_score, len(request.selected_factors), assessment_method)

    return DynamicEligibilityResponse(
        inmate_id=request.inmate_id,
        eligible=eligible,
        eligibility_score=round(final_score, 4),
        confidence=round(confidence, 4),
        selected_factors=request.selected_factors,
        factor_results=factor_results,
        risk_factors=risk_factors,
        strengths=strengths,
        recommended_programs=recommended_programs or ["general_rehabilitation"],
        reasoning=llm_reasoning,
        assessment_method=assessment_method
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_factor(key: str, value: Any) -> tuple[float, str]:
    """
    Convert a raw factor value to a 0-1 contribution score and a flag.
    Returns (contribution_0_to_1, flag) where flag is "positive"|"negative"|"neutral"
    """
    try:
        if key == "behavior_score":
            v = float(value) / 100.0
            return (v, "positive" if v >= 0.7 else ("negative" if v < 0.5 else "neutral"))
        if key == "discipline_score":
            v = float(value) / 100.0
            return (v, "positive" if v >= 0.7 else ("negative" if v < 0.5 else "neutral"))
        if key == "risk_score":
            v = 1.0 - float(value)   # invert: low risk = high score
            return (v, "positive" if float(value) < 0.3 else ("negative" if float(value) > 0.6 else "neutral"))
        if key == "time_served_months":
            v = min(1.0, float(value) / 24.0)  # Fuller = more eligible (up to 2 years)
            return (v, "positive" if float(value) >= 12 else "neutral")
        if key == "sentence_length_months":
            # Shorter sentence → lighter offence → higher score
            v = max(0.0, 1.0 - float(value) / 120.0)
            return (v, "neutral")
        if key == "remaining_sentence_months":
            v = max(0.0, 1.0 - float(value) / 60.0)
            return (v, "neutral")
        if key == "percent_sentence_served":
            v = float(value)
            return (v, "positive" if v >= 0.5 else "neutral")
        if key == "programs_completed":
            v = min(1.0, float(value) / 5.0)
            return (v, "positive" if float(value) >= 2 else "neutral")
        if key == "total_attendance_rate":
            v = float(value)
            return (v, "positive" if v >= 0.8 else ("negative" if v < 0.5 else "neutral"))
        if key == "performance_score":
            v = float(value) / 100.0
            return (v, "positive" if v >= 0.7 else "neutral")
        if key == "prior_convictions":
            v = max(0.0, 1.0 - float(value) * 0.15)
            return (v, "negative" if float(value) >= 3 else "neutral")
        if key == "institutional_violations":
            v = max(0.0, 1.0 - float(value) * 0.2)
            return (v, "negative" if float(value) > 2 else "neutral")
        if key == "total_incidents":
            v = max(0.0, 1.0 - float(value) * 0.1)
            return (v, "negative" if float(value) > 5 else "neutral")
        if key == "points_deducted":
            v = max(0.0, 1.0 - float(value) / 100.0)
            return (v, "negative" if float(value) > 20 else "neutral")
        if key in ("has_substance_abuse", "has_mental_health_issues", "requires_medical_attention"):
            b = bool(value)
            return (0.3 if b else 0.8, "negative" if b else "neutral")
        if key == "medical_clearance":
            b = bool(value)
            return (0.9 if b else 0.5, "positive" if b else "neutral")
        if key == "age":
            # 25-45 considered most rehabilitable
            a = float(value)
            v = 1.0 - abs(a - 35) / 35.0
            return (max(0.3, v), "neutral")
        if key == "education_level":
            v = float(value) / 5.0
            return (v, "positive" if float(value) >= 3 else "neutral")
        if key in ("employment_history", "family_support", "community_ties"):
            v = float(value)
            return (v, "positive" if v >= 0.7 else "neutral")
        if key == "counseling_sessions_attended":
            v = min(1.0, float(value) / 10.0)
            return (v, "positive" if float(value) >= 5 else "neutral")
        if key == "avg_counseling_score":
            v = float(value) / 10.0
            return (v, "positive" if float(value) >= 7 else "neutral")
        if key == "officer_recommendation":
            v = float(value)
            return (v, "positive" if v >= 0.7 else ("negative" if v < 0.4 else "neutral"))
        if key == "case_type":
            v = max(0.1, 1.0 - (float(value) - 1) / 4.0)
            return (v, "negative" if float(value) >= 4 else "neutral")
    except (TypeError, ValueError):
        pass
    return (0.5, "neutral")


def _suggest_programs(key: str, value: Any, programs: List[str]):
    try:
        if key == "has_substance_abuse" and bool(value):
            programs.append("substance_abuse_intensive")
        if key == "has_mental_health_issues" and bool(value):
            programs.append("mental_health_therapy")
        if key == "behavior_score" and float(value) < 60:
            programs.append("cognitive_behavioral_therapy")
        if key == "discipline_score" and float(value) < 60:
            programs.append("anger_management")
        if key == "education_level" and float(value) < 3:
            programs.append("education_program")
        if key == "employment_history" and float(value) < 0.4:
            programs.append("vocational_training")
        if key == "family_support" and float(value) < 0.3:
            programs.append("family_counseling")
        if key == "counseling_sessions_attended" and float(value) < 3:
            programs.append("individual_counseling")
    except (TypeError, ValueError):
        pass


def _calculate_confidence(score: float, num_factors: int, method: str) -> float:
    """More factors + hybrid method = higher confidence."""
    factor_confidence = min(1.0, num_factors / 10.0)
    method_boost = 0.15 if method == "hybrid" else 0.0
    # Score further from 0.5 → system is more certain
    certainty = abs(score - 0.5) * 2
    return min(0.99, 0.5 + factor_confidence * 0.3 + certainty * 0.2 + method_boost)


# ---------------------------------------------------------------------------
# Suggest-Factors endpoint
# ---------------------------------------------------------------------------

class SuggestFactorsRequest(BaseModel):
    inmate_id: str
    behavior_score: Optional[float] = None
    discipline_score: Optional[float] = None
    risk_score: Optional[float] = None
    time_served_months: Optional[int] = None
    sentence_length_months: Optional[int] = None
    total_incidents: Optional[int] = None
    has_substance_abuse: Optional[bool] = False
    has_mental_health_issues: Optional[bool] = False
    requires_medical_attention: Optional[bool] = False
    violent_history: Optional[bool] = False
    gang_affiliation: Optional[bool] = False
    escape_risk: Optional[bool] = False
    suicide_risk: Optional[bool] = False
    age: Optional[int] = None
    gender: Optional[str] = None
    case_type: Optional[int] = None          # 1=minor … 5=severe
    security_level: Optional[str] = None     # MINIMUM / MEDIUM / MAXIMUM
    risk_level: Optional[str] = None         # LOW / MEDIUM / HIGH / CRITICAL
    crime_description: Optional[str] = None
    medical_conditions: Optional[List[str]] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class SuggestFactorsResponse(BaseModel):
    inmate_id: str
    suggested_factors: Dict[str, Any]
    suggested_selected_factors: List[str]
    generation_method: str   # "hybrid" | "rule_based"
    notes: str


@router.post("/suggest-factors", response_model=SuggestFactorsResponse)
async def suggest_factor_values(request: SuggestFactorsRequest = Body(...)):
    """
    Given raw inmate registration data, compute suggested factor values for
    the dynamic eligibility assessment.
    
    - Hard data fields (behavior_score, risk_score, sentence times, etc.) are
      mapped directly with no model call.
    - Contextual / unobservable fields (family_support, community_ties,
      employment_history, officer_recommendation, education_level) are inferred
      by the LLM from the available narrative and risk flags.
    
    Returns a ready-to-use factor-values map plus a recommended selection list.
    """
    # ── 1. Direct mapping from known fields ──────────────────────────────────
    fv: Dict[str, Any] = {}

    if request.behavior_score is not None:
        fv["behavior_score"] = request.behavior_score
    if request.discipline_score is not None:
        fv["discipline_score"] = request.discipline_score
    if request.risk_score is not None:
        fv["risk_score"] = request.risk_score
    if request.time_served_months is not None:
        fv["time_served_months"] = request.time_served_months
    if request.sentence_length_months is not None:
        fv["sentence_length_months"] = request.sentence_length_months
        if request.time_served_months is not None:
            fv["remaining_sentence_months"] = max(
                0, request.sentence_length_months - request.time_served_months
            )
            if request.sentence_length_months > 0:
                fv["percent_sentence_served"] = round(
                    request.time_served_months / request.sentence_length_months, 3
                )
    if request.total_incidents is not None:
        fv["total_incidents"] = request.total_incidents
    if request.has_substance_abuse is not None:
        fv["has_substance_abuse"] = request.has_substance_abuse
    if request.has_mental_health_issues is not None:
        fv["has_mental_health_issues"] = request.has_mental_health_issues
    if request.requires_medical_attention is not None:
        fv["requires_medical_attention"] = request.requires_medical_attention
    if request.age is not None:
        fv["age"] = request.age
    if request.case_type is not None:
        fv["case_type"] = request.case_type

    # Risk-flag → institutional_violations heuristic
    flags_set = sum([
        1 if request.violent_history else 0,
        1 if request.gang_affiliation else 0,
        1 if request.escape_risk else 0,
    ])
    fv["institutional_violations"] = flags_set

    # ── 2. LLM-inferred contextual values ────────────────────────────────────
    contextual_defaults = {
        "family_support": 0.5,
        "community_ties": 0.5,
        "employment_history": 0.5,
        "education_level": 2,
        "officer_recommendation": 0.5,
    }

    generation_method = "rule_based"
    notes = "Factor values derived directly from inmate registry data."

    if openai_client.enabled:
        try:
            conditions_str = ", ".join(request.medical_conditions or []) or "none reported"
            crime_str = request.crime_description or "not specified"
            name_str = f"{request.first_name or ''} {request.last_name or ''}".strip() or "Inmate"

            llm_prompt = f"""You are an experienced prison intake assessment officer reviewing a new inmate profile.

INMATE PROFILE:
- Name: {name_str}
- Age: {request.age or "unknown"}
- Gender: {request.gender or "unknown"}
- Security Level: {request.security_level or "unknown"}
- Risk Level: {request.risk_level or "unknown"}
- Crime Description: {crime_str}
- Case Severity (1=minor, 5=severe): {request.case_type or 2}
- Violent History: {request.violent_history}
- Gang Affiliation: {request.gang_affiliation}
- Suicide Risk: {request.suicide_risk}
- Medical Conditions: {conditions_str}
- Has Substance Abuse: {request.has_substance_abuse}
- Has Mental Health Issues: {request.has_mental_health_issues}
- Behavior Score: {request.behavior_score or "unknown"} /100
- Risk Score: {request.risk_score or "unknown"} (0=low, 1=high)

Based ONLY on the above profile, estimate values for these rehabilitation factors:

1. family_support (0.0–1.0): Likelihood of meaningful family support based on offense nature, risk flags
2. community_ties (0.0–1.0): Strength of community ties — consider crime type and risk flags
3. employment_history (0.0–1.0): Estimated prior employment stability
4. education_level (1–5, integer): 1=none, 2=primary, 3=secondary, 4=tertiary, 5=graduate
5. officer_recommendation (0.0–1.0): Initial officer disposition — lower for violent/gang/escape risks

Respond ONLY in valid JSON:
{{
  "family_support": <float>,
  "community_ties": <float>,
  "employment_history": <float>,
  "education_level": <int>,
  "officer_recommendation": <float>,
  "reasoning": "<one sentence>"
}}"""

            response_text = await openai_client.get_chat_completion(
                messages=[
                    {"role": "system", "content": "You are a prison rehabilitation assessment expert. Output valid JSON only."},
                    {"role": "user", "content": llm_prompt}
                ],
                temperature=0.3,
                max_tokens=300
            )

            cleaned = response_text.replace("```json", "").replace("```", "").strip()
            llm_data = json.loads(cleaned)
            for k in ("family_support", "community_ties", "employment_history",
                      "education_level", "officer_recommendation"):
                if k in llm_data:
                    contextual_defaults[k] = llm_data[k]
            generation_method = "hybrid"
            notes = llm_data.get("reasoning", "AI-inferred contextual factors combined with registry data.")

        except Exception as e:
            logger.warning(f"LLM factor suggestion failed: {e}")
            notes = "Rule-based derivation only (AI unavailable)."

    fv.update(contextual_defaults)

    # ── 3. Build recommended selection list (all factors with usable data) ───
    priority_factors = [
        "behavior_score", "discipline_score", "risk_score",
        "time_served_months", "percent_sentence_served",
        "total_incidents", "institutional_violations",
        "has_substance_abuse", "has_mental_health_issues",
        "family_support", "community_ties", "officer_recommendation",
        "case_type",
    ]
    selected = [f for f in priority_factors if f in fv]
    # Append remaining mapped factors
    for k in fv:
        if k not in selected:
            selected.append(k)

    return SuggestFactorsResponse(
        inmate_id=request.inmate_id,
        suggested_factors=fv,
        suggested_selected_factors=selected,
        generation_method=generation_method,
        notes=notes,
    )
