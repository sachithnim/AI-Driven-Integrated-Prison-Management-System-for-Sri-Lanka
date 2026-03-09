from flask import Blueprint, request, jsonify
from app.services.pdf_service import store_pdf_in_vector_db
from app.services.rag_service import generate_health_profile
from app.model import db, Inmate, SurveyAnswer, EmotionLog, HealthProfileLog
import os
import json

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/upload_medical_record', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    
    inmate_id = request.form.get('inmate_id')
    
    # Get ALL files sent with the key 'file'
    files = request.files.getlist('file') 
    
    saved_files = []
    for file in files:
        if file.filename == '':
            continue
            
        save_path = os.path.join("uploads", file.filename)
        file.save(save_path)
        
        # Process each file (The new batched service will handle the rate limits)
        success = store_pdf_in_vector_db(save_path, inmate_id)
        if success:
            saved_files.append(file.filename)
            
    return jsonify({"message": f"Successfully processed: {', '.join(saved_files)}"}), 200
    return jsonify({"message": f"Successfully processed: {', '.join(saved_files)}"}), 200

@admin_bp.route('/upload_common_doc', methods=['POST'])
def upload_common_doc():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    
    files = request.files.getlist('file')
    
    upload_dir = os.path.join("uploads", "common")
    os.makedirs(upload_dir, exist_ok=True)
    
    saved_files = []
    for file in files:
        if file.filename == '':
            continue
            
        save_path = os.path.join(upload_dir, file.filename)
        file.save(save_path)
        
        # Store in the general vector DB (no inmate_id)
        success = store_pdf_in_vector_db(save_path, None)
        if success:
            saved_files.append(file.filename)
            
    return jsonify({"message": f"Successfully processed: {', '.join(saved_files)}"}), 200

@admin_bp.route('/common_docs', methods=['GET'])
def get_common_docs():
    upload_dir = os.path.join("uploads", "common")
    if not os.path.exists(upload_dir):
        return jsonify({"docs": []}), 200
    
    # List all PDF files in the common docs directory
    files = [f for f in os.listdir(upload_dir) if f.endswith('.pdf')]
    
    # Return file info (could expand with creation time, size, etc.)
    docs = [{"filename": f} for f in files]
    
    return jsonify({"docs": docs}), 200

@admin_bp.route('/analyze_inmate', methods=['POST'])
def analyze_inmate():
    data = request.json
    username = data.get('Username')
    if username:
        inmate = Inmate.query.filter_by(name=username).first()
        if inmate:
            target_inmate_id = inmate.id
        else:
            return jsonify({"error": "Inmate not found"}), 404
    else:
        return jsonify({"error": "Username is required"}), 400

    # 4. Fetch the inmate object securely
    inmate = Inmate.query.get_or_404(target_inmate_id)
    
    # Fetch recent data from SQL
    recent_emotions = EmotionLog.query.filter_by(inmate_id=target_inmate_id).order_by(EmotionLog.timestamp.desc()).limit(5).all()
    emotion_str = ", ".join([e.predicted_emotion for e in recent_emotions])
    
    recent_answers = SurveyAnswer.query.filter_by(inmate_id=target_inmate_id).limit(10).all()
    survey_summary = "; ".join([f"Q: {a.question_text} A: {a.answer_text} (Voice: {a.voice_emotion})" for a in recent_answers])
    
    # Fetch historical health profiles
    past_logs = HealthProfileLog.query.filter_by(inmate_id=target_inmate_id).order_by(HealthProfileLog.timestamp.desc()).limit(3).all()
    past_logs_summary = "None"
    if past_logs:
        summaries = []
        for log in reversed(past_logs): # chronological order
            summaries.append(f"Date: {log.timestamp.strftime('%Y-%m-%d %H:%M')}, Risk: {log.risk_level}, "
                             f"Conditions: {log.suspected_conditions}, Progress: {log.progress_indicator}")
        past_logs_summary = "\n".join(summaries)
    
    # Call RAG Service
    analysis_json = generate_health_profile(inmate, emotion_str, survey_summary, past_logs_summary)
    
    # Save the report string to DB, so we don't have to keep querying the LLM
    inmate.final_llm_report = json.dumps(analysis_json)
    
    # Create a new HealthProfileLog entry
    new_log = HealthProfileLog(
        inmate_id=target_inmate_id,
        risk_level=analysis_json.get("risk_level", "Unknown"),
        suspected_conditions=json.dumps(analysis_json.get("suspected_conditions", [])),
        recommended_actions=json.dumps(analysis_json.get("recommended_actions", [])),
        urgent_alert=analysis_json.get("urgent_alert", False),
        reasoning=analysis_json.get("reasoning", ""),
        progress_indicator=analysis_json.get("progress_indicator", "Initial")
    )
    db.session.add(new_log)
    db.session.commit()
    
    past_logs_data = []
    if past_logs:
        for log in past_logs:
            past_logs_data.append({
                "date": log.timestamp.strftime('%Y-%m-%d %H:%M'),
                "risk_level": log.risk_level,
                "progress_indicator": log.progress_indicator
            })
    
    return jsonify({"analysis": analysis_json, "history": past_logs_data})