from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Inmate(db.Model):
    __tablename__ = 'inmates'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    nic = db.Column(db.String(20))
    address = db.Column(db.String(200))
    tel_no = db.Column(db.String(20))
    crime_details = db.Column(db.Text)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    visual_emotion = db.Column(db.String(50))
    ocr_prescription = db.Column(db.Text)
    final_llm_report = db.Column(db.Text, nullable=True)
    
    # Relationships
    answers = db.relationship('SurveyAnswer', backref='inmate', lazy=True)
    emotion_logs = db.relationship('EmotionLog', backref='inmate', lazy=True)

class SurveyAnswer(db.Model):
    __tablename__ = 'survey_answers'
    id = db.Column(db.Integer, primary_key=True)
    inmate_id = db.Column(db.Integer, db.ForeignKey('inmates.id'), nullable=False)
    question_text = db.Column(db.String(500), nullable=False)
    answer_text = db.Column(db.String(500), nullable=False) # e.g., "Not at all", "Several days"
    voice_emotion = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class EmotionLog(db.Model):
    __tablename__ = 'emotion_logs'
    id = db.Column(db.Integer, primary_key=True)
    inmate_id = db.Column(db.Integer, db.ForeignKey('inmates.id'), nullable=False)
    predicted_emotion = db.Column(db.String(50), nullable=False) # e.g., "Angry", "Sad"
    confidence_score = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Staff(db.Model):
    __tablename__ = 'staff'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    department = db.Column(db.String(100))
    contact = db.Column(db.String(100))
    joined_date = db.Column(db.DateTime, default=datetime.utcnow)

class HealthProfileLog(db.Model):
    __tablename__ = 'health_profile_logs'
    id = db.Column(db.Integer, primary_key=True)
    inmate_id = db.Column(db.Integer, db.ForeignKey('inmates.id'), nullable=False)
    risk_level = db.Column(db.String(50))
    suspected_conditions = db.Column(db.Text) # Stored as JSON string
    recommended_actions = db.Column(db.Text) # Stored as JSON string
    urgent_alert = db.Column(db.Boolean, default=False)
    reasoning = db.Column(db.Text)
    progress_indicator = db.Column(db.String(50)) # e.g., 'Improved', 'Stable', 'Regressed'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    inmate = db.relationship('Inmate', backref=db.backref('health_profiles', lazy=True))

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='admin')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)