"""
Progress Tracker API
- Accept counseling session notes and analyze sentiment + trend
- Accept image uploads and run OCR to extract text, then analyze
- Accept structured activity logs
- Generate AI-powered progress summary and risk alerts
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import base64
import logging
import json
from datetime import datetime

from app.core.openai_client import openai_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/progress", tags=["Progress Tracker"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CounselingFeedback(BaseModel):
    inmate_id: str
    session_date: Optional[str] = None
    counselor_id: Optional[str] = None
    session_text: str = Field(..., min_length=10)
    session_score: Optional[float] = Field(None, ge=0, le=10)
    session_type: Optional[str] = "individual"     # individual | group | crisis | family


class ActivityLog(BaseModel):
    inmate_id: str
    activity_date: Optional[str] = None
    activity_type: str      # program | work | recreation | education | community_service
    activity_name: str
    duration_hours: Optional[float] = None
    participation_score: Optional[float] = Field(None, ge=0, le=10)
    notes: Optional[str] = None
    instructor_feedback: Optional[str] = None


class ProgressAnalysisRequest(BaseModel):
    inmate_id: str
    include_counseling: bool = True
    include_activities: bool = True
    counseling_sessions: Optional[List[CounselingFeedback]] = None
    activities: Optional[List[ActivityLog]] = None
    additional_context: Optional[str] = None


class SentimentResult(BaseModel):
    sentiment: str           # positive | neutral | negative | concerning
    score: float             # 0-1 (1 = very positive)
    key_themes: List[str]
    risk_indicators: List[str]
    protective_factors: List[str]


class ProgressReport(BaseModel):
    inmate_id: str
    overall_progress_score: float    # 0-100
    trend: str                       # improving | stable | declining | critical
    behavior_trend: str
    counseling_summary: Optional[str] = None
    activity_summary: Optional[str] = None
    risk_alerts: List[str]
    positive_indicators: List[str]
    ai_recommendations: List[str]
    detailed_report: str
    generated_at: str


class OCRAnalysisResponse(BaseModel):
    inmate_id: str
    extracted_text: str
    sentiment_result: SentimentResult
    key_findings: List[str]
    suggested_action: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/analyze-counseling", response_model=SentimentResult)
async def analyze_counseling_session(request: CounselingFeedback):
    """
    Analyze a single counseling session note.
    Returns sentiment, key themes, risk indicators and protective factors.
    """
    if not openai_client.enabled:
        return _fallback_sentiment(request.session_text)

    try:
        prompt = f"""You are a licensed forensic psychologist reviewing a prison counseling session note.

SESSION DETAILS:
- Date: {request.session_date or 'Not specified'}
- Type: {request.session_type}
- Score given: {request.session_score if request.session_score is not None else 'Not scored'}
- Session notes: "{request.session_text}"

Analyze this note and return a JSON object ONLY (no markdown):
{{
  "sentiment": "<positive|neutral|negative|concerning>",
  "score": <float 0.0-1.0>,
  "key_themes": ["<theme1>", "<theme2>"],
  "risk_indicators": ["<risk1>"],
  "protective_factors": ["<strength1>"]
}}

Risk indicators include: expressions of hopelessness, aggression, suicide ideation, 
substance cravings, gang references, escape planning.
Protective factors include: family connection, future planning, remorse, goal setting, 
positive attitude, participation."""

        response = await openai_client.get_chat_completion(
            messages=[
                {"role": "system", "content": "You are a forensic psychologist. Output JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=400
        )

        cleaned = response.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        return SentimentResult(
            sentiment=data.get("sentiment", "neutral"),
            score=float(data.get("score", 0.5)),
            key_themes=data.get("key_themes", []),
            risk_indicators=data.get("risk_indicators", []),
            protective_factors=data.get("protective_factors", [])
        )
    except Exception as e:
        logger.warning(f"Counseling analysis failed: {e}")
        return _fallback_sentiment(request.session_text)


@router.post("/ocr-analyze", response_model=OCRAnalysisResponse)
async def analyze_image_ocr(
    inmate_id: str = Form(...),
    file: UploadFile = File(..., description="Image file (JPG, PNG, PDF) containing text to extract and analyze")
):
    """
    Upload an image (medical form, handwritten note, evaluation sheet).
    Uses GPT-4 Vision to extract text via OCR, then runs psychological analysis.
    """
    # Read image
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="Image too large. Max size is 10MB.")

    content_type = file.content_type or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=422, detail="Only image files are supported (JPEG, PNG, WebP, GIF).")

    b64_image = base64.b64encode(contents).decode("utf-8")

    if not openai_client.enabled:
        raise HTTPException(status_code=503, detail="OpenAI is required for OCR image analysis.")

    try:
        # Step 1: OCR extraction using GPT-4 Vision
        vision_client = openai_client.client
        ocr_response = await vision_client.chat.completions.create(
            model="gpt-4o",    # must use vision-capable model
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text from this image. Preserve the structure. Output only the extracted text, no commentary."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{content_type};base64,{b64_image}"}
                        }
                    ]
                }
            ],
            max_tokens=1000
        )
        extracted_text = ocr_response.choices[0].message.content.strip()

        # Step 2: Analyze the extracted text
        analysis_response = await openai_client.get_chat_completion(
            messages=[
                {"role": "system", "content": "You are a forensic psychologist and prison rehabilitation specialist. Output JSON only."},
                {"role": "user", "content": f"""Analyze this document extracted from an inmate's file:

"{extracted_text}"

Return JSON only:
{{
  "sentiment": "<positive|neutral|negative|concerning>",
  "score": <float 0-1>,
  "key_themes": ["<theme>"],
  "risk_indicators": ["<risk>"],
  "protective_factors": ["<factor>"],
  "key_findings": ["<finding>"],
  "suggested_action": "<recommended next step for rehabilitation team>"
}}"""}
            ],
            temperature=0.2,
            max_tokens=600
        )

        cleaned = analysis_response.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)

        return OCRAnalysisResponse(
            inmate_id=inmate_id,
            extracted_text=extracted_text,
            sentiment_result=SentimentResult(
                sentiment=data.get("sentiment", "neutral"),
                score=float(data.get("score", 0.5)),
                key_themes=data.get("key_themes", []),
                risk_indicators=data.get("risk_indicators", []),
                protective_factors=data.get("protective_factors", [])
            ),
            key_findings=data.get("key_findings", []),
            suggested_action=data.get("suggested_action", "Continue monitoring.")
        )

    except Exception as e:
        logger.error(f"OCR analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"OCR analysis failed: {str(e)}")


@router.post("/generate-report", response_model=ProgressReport)
async def generate_progress_report(request: ProgressAnalysisRequest):
    """
    Generate a comprehensive AI progress report for an inmate.
    Aggregates counseling notes, activity logs, and OCR findings.
    """
    sessions = request.counseling_sessions or []
    activities = request.activities or []

    # Aggregate counseling sentiments
    counseling_scores = [s.session_score for s in sessions if s.session_score is not None]
    avg_counseling = sum(counseling_scores) / len(counseling_scores) if counseling_scores else None

    # Aggregate activity participation
    activity_scores = [a.participation_score for a in activities if a.participation_score is not None]
    avg_activity = sum(activity_scores) / len(activity_scores) if activity_scores else None

    # Build rule-based progress score
    rule_score = 50.0
    if avg_counseling is not None:
        rule_score += (avg_counseling / 10.0) * 20
    if avg_activity is not None:
        rule_score += (avg_activity / 10.0) * 15
    rule_score = min(100.0, max(0.0, rule_score))

    risk_alerts: List[str] = []
    positive_indicators: List[str] = []

    if avg_counseling is not None and avg_counseling < 4:
        risk_alerts.append(f"Low average counseling score ({avg_counseling:.1f}/10)")
    if len(sessions) == 0 and request.include_counseling:
        risk_alerts.append("No counseling sessions recorded")
    if len(activities) >= 3:
        positive_indicators.append(f"Active participation in {len(activities)} activities")

    report_text = "Progress assessment based on available data."
    ai_recommendations: List[str] = []
    trend = "stable"

    if openai_client.enabled and (sessions or activities or request.additional_context):
        try:
            sessions_summary = "\n".join(
                f"  [{s.session_date or 'N/A'}] {s.session_type}: Score={s.session_score or 'N/A'} | {s.session_text[:200]}"
                for s in sessions
            ) or "No sessions provided."

            activities_summary = "\n".join(
                f"  [{a.activity_date or 'N/A'}] {a.activity_name} ({a.activity_type}): Score={a.participation_score or 'N/A'}"
                for a in activities
            ) or "No activities provided."

            prompt = f"""You are a senior rehabilitation case manager writing a formal progress report.

COUNSELING SESSIONS ({len(sessions)} sessions):
{sessions_summary}

ACTIVITIES ({len(activities)} entries):
{activities_summary}

ADDITIONAL CONTEXT: {request.additional_context or 'None'}

Write a comprehensive progress assessment and return JSON ONLY:
{{
  "overall_progress_score": <float 0-100>,
  "trend": "<improving|stable|declining|critical>",
  "behavior_trend": "<improving|stable|declining>",
  "counseling_summary": "<2-3 sentence analysis of counseling progress>",
  "activity_summary": "<2-3 sentence analysis of activity participation>",
  "risk_alerts": ["<alert1>", "<alert2>"],
  "positive_indicators": ["<indicator1>"],
  "ai_recommendations": ["<action1>", "<action2>", "<action3>"],
  "detailed_report": "<full 3-4 paragraph narrative report>"
}}"""

            response = await openai_client.get_chat_completion(
                messages=[
                    {"role": "system", "content": "You are a rehabilitation case manager. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )

            cleaned = response.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)

            rule_score = float(data.get("overall_progress_score", rule_score))
            trend = data.get("trend", trend)
            report_text = data.get("detailed_report", report_text)
            ai_recommendations = data.get("ai_recommendations", [])
            risk_alerts = list(set(risk_alerts + data.get("risk_alerts", [])))
            positive_indicators = list(set(positive_indicators + data.get("positive_indicators", [])))

        except Exception as e:
            logger.warning(f"AI progress report failed: {e}")

    return ProgressReport(
        inmate_id=request.inmate_id,
        overall_progress_score=round(rule_score, 1),
        trend=trend,
        behavior_trend=trend,
        counseling_summary=f"Analyzed {len(sessions)} counseling sessions." if sessions else None,
        activity_summary=f"Analyzed {len(activities)} activity records." if activities else None,
        risk_alerts=risk_alerts,
        positive_indicators=positive_indicators,
        ai_recommendations=ai_recommendations or ["Continue current program", "Schedule follow-up assessment"],
        detailed_report=report_text,
        generated_at=datetime.now().isoformat()
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fallback_sentiment(text: str) -> SentimentResult:
    text_lower = text.lower()
    risk_words = ["angry", "hopeless", "hate", "kill", "escape", "drug", "violent", "refuse"]
    positive_words = ["progress", "improve", "family", "future", "sorry", "grateful", "goal", "better"]
    risks = [w for w in risk_words if w in text_lower]
    positives = [w for w in positive_words if w in text_lower]
    score = 0.3 + len(positives) * 0.1 - len(risks) * 0.15
    score = max(0.0, min(1.0, score))
    sentiment = "positive" if score > 0.6 else ("negative" if score < 0.4 else "neutral")
    return SentimentResult(
        sentiment=sentiment,
        score=round(score, 2),
        key_themes=positives[:3],
        risk_indicators=risks,
        protective_factors=positives[:2]
    )
