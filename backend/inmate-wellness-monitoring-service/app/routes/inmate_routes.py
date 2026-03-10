from flask import Blueprint, request, jsonify
from app.model import db, Inmate, SurveyAnswer, EmotionLog
from app.services.emotion_service import analyze_video_emotions
from app.services.analysis_pipeline import analyze_gender, analyze_image_emotion, extract_prescription_ocr, analyze_voice_emotion
from app.utils.constants import MEDICAL_QUESTIONS
import os

inmate_bp = Blueprint('inmate', __name__)

@inmate_bp.route('/questions', methods=['GET'])
def get_questions():
    return jsonify({"questions": MEDICAL_QUESTIONS})

@inmate_bp.route('/all', methods=['GET'])
def get_all_inmates():
    inmates = Inmate.query.all()
    result = []
    for i in inmates:
        result.append({
            "id": i.id,
            "name": i.name,
            "nic": i.nic,
            "address": i.address,
            "tel_no": i.tel_no,
            "crime_details": i.crime_details,
            "age": i.age,
            "gender": i.gender,
            "diagnosis_done": len(i.health_profiles) > 0
        })
    return jsonify(result), 200

@inmate_bp.route('/lookup', methods=['GET'])
def lookup_inmate():
    name = request.args.get('name')
    nic = request.args.get('nic')
    
    inmate = None
    if nic:
        inmate = Inmate.query.filter_by(nic=nic).first()
    elif name:
        inmate = Inmate.query.filter_by(name=name).first()
        
    if inmate:
        return jsonify({
            "exists": True,
            "inmate": {
                "id": inmate.id,
                "name": inmate.name,
                "nic": inmate.nic,
                "address": inmate.address,
                "tel_no": inmate.tel_no,
                "crime_details": inmate.crime_details,
                "age": inmate.age,
                "gender": inmate.gender
            }
        }), 200
    return jsonify({"exists": False}), 200

@inmate_bp.route('/register', methods=['POST'])
def register_inmate():
    data = request.json
    name = data.get('name')
    nic = data.get('nic')
    address = data.get('address')
    tel_no = data.get('tel_no')
    crime_details = data.get('crime_details')
    age = data.get('age')
    gender = data.get('gender')
    
    # Check if inmate exists by NIC or Name
    existing_inmate = None
    if nic:
        existing_inmate = Inmate.query.filter_by(nic=nic).first()
    if not existing_inmate and name:
        existing_inmate = Inmate.query.filter_by(name=name).first()
        
    if existing_inmate:
        # Update existing record
        existing_inmate.age = age
        existing_inmate.gender = gender
        existing_inmate.nic = nic
        existing_inmate.address = address
        existing_inmate.tel_no = tel_no
        existing_inmate.crime_details = crime_details
        db.session.commit()
        return jsonify({"message": "Inmate updated successfully", "id": existing_inmate.id}), 200
        
    # incremental inmate id
    inmate_id = max([i.id for i in Inmate.query.all()]) + 1 if Inmate.query.all() else 1
    new_inmate = Inmate(id=inmate_id, name=name, nic=nic, address=address, tel_no=tel_no, crime_details=crime_details, age=age, gender=gender)
    db.session.add(new_inmate)
    db.session.commit()
    return jsonify({"message": "Inmate registered successfully"}), 201


@inmate_bp.route('/submit_survey', methods=['POST'])
def submit_survey():
    data = request.json
    username = data.get('Username')
    inmate = Inmate.query.filter_by(name=username).first()
    inmate_id = inmate.id if inmate else None
    if not inmate_id:
        return jsonify({"error": "Inmate not found"}), 404
    answers = data.get('answers')
    
    for item in answers:
        new_answer = SurveyAnswer(
            inmate_id=inmate_id,
            question_text=item['question'],
            answer_text=item['answer']
        )
        db.session.add(new_answer)
    
    db.session.commit()
    return jsonify({"message": "Survey saved successfully"}), 201

@inmate_bp.route('/detect_emotion', methods=['POST'])
def detect_emotion():
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400
        
    video = request.files['video']
    username = request.form.get('Username')
    inmate = Inmate.query.filter_by(name=username).first()
    inmate_id = inmate.id if inmate else None
    if not inmate_id:
        return jsonify({"error": "Inmate not found"}), 404
    
    # Save temp file
    temp_path = os.path.join("uploads", video.filename)
    video.save(temp_path)
    
    # Predict using YOLO service
    emotion, conf = analyze_video_emotions(temp_path)
    
    # Store in SQL
    log = EmotionLog(inmate_id=inmate_id, predicted_emotion=emotion, confidence_score=conf)
    db.session.add(log)
    db.session.commit()
    
    # Cleanup
    os.remove(temp_path)
    
    return jsonify({"predicted_emotion": emotion, "confidence": conf}), 200

@inmate_bp.route('/analyze_initial_image', methods=['POST'])
def analyze_initial_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    image = request.files['image']
    username = request.form.get('Username')
    inmate = Inmate.query.filter_by(name=username).first()
    if not inmate:
        return jsonify({"error": "Inmate not found"}), 404
        
    temp_path = os.path.join("uploads", image.filename)
    image.save(temp_path)
    
    gender_label, gender_conf = analyze_gender(temp_path)
    emotion_label, emotion_conf = analyze_image_emotion(temp_path)
    
    # Validation against registered gender
    registered_gender = inmate.gender.lower().strip() if inmate.gender else ""
    detected_gender = gender_label.lower().strip() if gender_label else ""
    
    gender_mismatch = False
    if registered_gender and detected_gender:
        if registered_gender == "male":
            # If registered is male, it must contain "male" but NOT "female"
            if "female" in detected_gender or "male" not in detected_gender:
                gender_mismatch = True
        elif registered_gender == "female":
            # If registered is female, it must contain "female"
            if "female" not in detected_gender:
                gender_mismatch = True
        else:
            if registered_gender not in detected_gender:
                gender_mismatch = True
    
    # We still save the original registered gender as the source of truth,
    # but we can save the visual emotion
    inmate.visual_emotion = emotion_label
    db.session.commit()
    
    os.remove(temp_path)
    return jsonify({
        "gender": gender_label, 
        "emotion": emotion_label, 
        "gender_mismatch": gender_mismatch,
        "mismatch_warning": f"Warning: Detected gender ({gender_label}) does not match registered gender ({inmate.gender})" if gender_mismatch else None
    }), 200

@inmate_bp.route('/extract_prescription', methods=['POST'])
def extract_prescription():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    image = request.files['image']
    username = request.form.get('Username')
    inmate = Inmate.query.filter_by(name=username).first()
    if not inmate:
        return jsonify({"error": "Inmate not found"}), 404
        
    temp_path = os.path.join("uploads", image.filename)
    image.save(temp_path)
    
    extracted_text = extract_prescription_ocr(temp_path)
    inmate.ocr_prescription = extracted_text
    db.session.commit()
    
    os.remove(temp_path)
    return jsonify({"extracted_text": extracted_text}), 200

@inmate_bp.route('/analyze_voice', methods=['POST'])
def analyze_voice():
    try:
        username = request.form.get('Username')
        question = request.form.get('question', '')
        answer = request.form.get('answer', '')
        
        inmate = Inmate.query.filter_by(name=username).first()
        if not inmate:
            return jsonify({"error": "Inmate not found"}), 404
            
        emotion_label = "neutral"
        if 'audio' in request.files:
            audio = request.files['audio']
            temp_path = os.path.join("uploads", audio.filename)
            audio.save(temp_path)
            emotion_label, conf = analyze_voice_emotion(temp_path)
            print("Voice emotion detected:", emotion_label)
            os.remove(temp_path)
            
        new_answer = SurveyAnswer(
            inmate_id=inmate.id,
            question_text=question,
            answer_text=answer,
            voice_emotion=emotion_label
        )
        db.session.add(new_answer)
        db.session.commit()
        
        return jsonify({"message": "Answer saved", "voice_emotion": emotion_label}), 200
    except Exception as e:
        print(f"Error analyzing voice: {e}")
        return jsonify({"error": str(e)}), 500