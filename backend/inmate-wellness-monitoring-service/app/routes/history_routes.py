from flask import Blueprint, jsonify
from app.model import db, Inmate, SurveyAnswer, EmotionLog
from app.services.rag_service import generate_health_profile
import json

history_bp = Blueprint('history', __name__)

@history_bp.route('/inmates', methods=['GET'])
def get_inmates():
    inmates = Inmate.query.all()
    result = []
    for i in inmates:
        result.append({
            "id": i.id,
            "name": i.name,
            "age": i.age,
            "gender": i.gender,
            "visual_emotion": i.visual_emotion
        })
    return jsonify({"inmates": result}), 200

@history_bp.route('/inmate/<int:inmate_id>', methods=['GET'])
def get_inmate_history(inmate_id):
    inmate = Inmate.query.get(inmate_id)
    if not inmate:
        return jsonify({"error": "Inmate not found"}), 404
        
    recent_answers = SurveyAnswer.query.filter_by(inmate_id=inmate_id).order_by(SurveyAnswer.timestamp.asc()).all()
    recent_emotions = EmotionLog.query.filter_by(inmate_id=inmate_id).order_by(EmotionLog.timestamp.desc()).limit(5).all()
    
    answers_list = []
    for a in recent_answers:
        answers_list.append({
            "question": a.question_text,
            "answer": a.answer_text,
            "voice_emotion": a.voice_emotion,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None
        })
        
    emotion_str = ", ".join([e.predicted_emotion for e in recent_emotions])
    survey_summary = "; ".join([f"Q: {a.question_text} A: {a.answer_text} (Voice: {a.voice_emotion})" for a in recent_answers])
    
    from app.model import HealthProfileLog
    
    # Query all historical health profiles
    health_logs = HealthProfileLog.query.filter_by(inmate_id=inmate_id).order_by(HealthProfileLog.timestamp.asc()).all()
    
    reports_list = []
    for log in health_logs:
        reports_list.append({
            "risk_level": log.risk_level,
            "suspected_conditions": json.loads(log.suspected_conditions) if log.suspected_conditions else [],
            "recommended_actions": json.loads(log.recommended_actions) if log.recommended_actions else [],
            "urgent_alert": log.urgent_alert,
            "reasoning": log.reasoning,
            "progress_indicator": log.progress_indicator,
            "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else None
        })
    
    return jsonify({
        "id": inmate.id,
        "name": inmate.name,
        "age": inmate.age,
        "gender": inmate.gender,
        "initial_visual_emotion": inmate.visual_emotion,
        "ocr_prescription": inmate.ocr_prescription,
        "qa_history": answers_list,
        "reports": reports_list
    }), 200
