"""
Comprehensive realistic dataset generator for prison rehabilitation system
Generates realistic data based on actual prison rehabilitation patterns
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from typing import Dict, List, Tuple
import random
import string


class RealisticDatasetGenerator:
    """Generates comprehensive realistic rehabilitation datasets"""
    
    # Crime types with typical sentence lengths and rehabilitation needs
    CRIME_PROFILES = {
        "drug_trafficking": {
            "avg_sentence_months": 36, "substance_abuse": 0.9, "mental_health": 0.4,
            "violence_risk": 0.3, "education_need": 0.6
        },
        "drug_possession": {
            "avg_sentence_months": 18, "substance_abuse": 0.8, "mental_health": 0.5,
            "violence_risk": 0.2, "education_need": 0.5
        },
        "assault": {
            "avg_sentence_months": 24, "substance_abuse": 0.3, "mental_health": 0.6,
            "violence_risk": 0.8, "education_need": 0.4
        },
        "robbery": {
            "avg_sentence_months": 30, "substance_abuse": 0.4, "mental_health": 0.3,
            "violence_risk": 0.6, "education_need": 0.7
        },
        "fraud": {
            "avg_sentence_months": 20, "substance_abuse": 0.1, "mental_health": 0.2,
            "violence_risk": 0.1, "education_need": 0.3
        },
        "burglary": {
            "avg_sentence_months": 22, "substance_abuse": 0.5, "mental_health": 0.3,
            "violence_risk": 0.4, "education_need": 0.6
        },
        "domestic_violence": {
            "avg_sentence_months": 16, "substance_abuse": 0.5, "mental_health": 0.7,
            "violence_risk": 0.9, "education_need": 0.3
        },
        "theft": {
            "avg_sentence_months": 12, "substance_abuse": 0.4, "mental_health": 0.2,
            "violence_risk": 0.2, "education_need": 0.5
        },
    }
    
    # Rehabilitation programs
    PROGRAMS = {
        "substance_abuse_intensive": "Substance Abuse",
        "substance_abuse_standard": "Substance Abuse",
        "mental_health_therapy": "Mental Health",
        "anger_management": "Behavioral",
        "cognitive_behavioral": "Behavioral",
        "vocational_carpentry": "Vocational",
        "vocational_welding": "Vocational",
        "vocational_it": "Vocational",
        "education_basic": "Education",
        "education_ged": "Education",
        "family_counseling": "Counseling",
    }
    
    FACILITIES = ["Colombo_Main", "Kandy_Central", "Galle_Regional", "Jaffna_North", "Anuradhapura_Central"]
    ZONES = ["Western", "Central", "Southern", "Northern", "North_Central"]
    
    def __init__(self, seed=42):
        """Initialize with random seed for reproducibility"""
        random.seed(seed)
        np.random.seed(seed)
    
    def generate_inmate_id(self, index: int) -> str:
        """Generate unique inmate ID"""
        return f"INM{str(index).zfill(6)}"
    
    def generate_booking_number(self, index: int) -> str:
        """Generate booking number"""
        year = random.randint(2020, 2025)
        return f"BK{year}{str(index).zfill(5)}"
    
    def generate_inmate_profiles(self, n: int = 1000) -> pd.DataFrame:
        """Generate comprehensive inmate profiles"""
        print(f"Generating {n} inmate profiles...")
        
        records = []
        for i in range(n):
            crime_type = random.choice(list(self.CRIME_PROFILES.keys()))
            crime_profile = self.CRIME_PROFILES[crime_type]
            
            # Basic demographics
            age = int(np.random.normal(35, 12))
            age = max(18, min(70, age))
            gender = np.random.choice(["Male", "Female"], p=[0.92, 0.08])
            
            # Sentence information
            base_sentence = crime_profile["avg_sentence_months"]
            sentence_months = int(np.random.normal(base_sentence, base_sentence * 0.3))
            sentence_months = max(6, min(240, sentence_months))
            
            time_served = random.randint(1, sentence_months)
            remaining = sentence_months - time_served
            
            admission_date = datetime.now() - timedelta(days=time_served * 30)
            parole_date = datetime.now() + timedelta(days=remaining * 30 * 0.7) if remaining > 6 else None
            
            # Risk and behavioral scores
            base_risk = 0.3 + (crime_profile["violence_risk"] * 0.4)
            risk_score = min(0.95, max(0.05, base_risk + np.random.normal(0, 0.15)))
            
            # Behavior improves over time
            time_factor = time_served / sentence_months
            behavior_base = 40 + (time_factor * 30)
            behavior_score = min(100, max(0, behavior_base + np.random.normal(0, 15)))
            
            discipline_score = min(100, max(0, behavior_score + np.random.normal(0, 10)))
            
            # Health factors based on crime profile
            has_substance = random.random() < crime_profile["substance_abuse"]
            has_mental_health = random.random() < crime_profile["mental_health"]
            
            # Program participation
            programs_completed = int(time_factor * random.randint(0, 5))
            programs_enrolled = random.randint(0, 3)
            attendance_rate = 0.5 + (time_factor * 0.3) + np.random.uniform(-0.1, 0.1)
            attendance_rate = min(1.0, max(0.0, attendance_rate))
            
            # Prior convictions
            prior_convictions = np.random.choice([0, 1, 2, 3, 4, 5], p=[0.3, 0.3, 0.2, 0.1, 0.07, 0.03])
            violations = np.random.choice([0, 1, 2, 3, 4], p=[0.4, 0.3, 0.2, 0.07, 0.03])
            
            facility = random.choice(self.FACILITIES)
            zone = self.ZONES[self.FACILITIES.index(facility)]
            
            record = {
                "inmate_id": self.generate_inmate_id(i),
                "booking_number": self.generate_booking_number(i),
                "first_name": f"FirstName{i}",
                "last_name": f"LastName{i}",
                "date_of_birth": (datetime.now() - timedelta(days=age * 365)).date(),
                "gender": gender,
                "age": age,
                "education_level": random.choice(["Elementary", "High School", "GED", "Some College", "College"]),
                "sentence_length_months": sentence_months,
                "time_served_months": time_served,
                "remaining_sentence_months": remaining,
                "crime_type": crime_type,
                "security_level": np.random.choice(["Minimum", "Medium", "Maximum"], p=[0.3, 0.5, 0.2]),
                "facility": facility,
                "block": random.choice(["A", "B", "C", "D"]),
                "cell_number": f"{random.randint(1, 50)}",
                "behavior_score": round(behavior_score, 2),
                "discipline_score": round(discipline_score, 2),
                "risk_score": round(risk_score, 3),
                "prior_convictions": prior_convictions,
                "institutional_violations": violations,
                "has_substance_abuse": has_substance,
                "has_mental_health_issues": has_mental_health,
                "requires_medical_attention": random.random() < 0.15,
                "programs_completed": programs_completed,
                "programs_enrolled": programs_enrolled,
                "total_attendance_rate": round(attendance_rate, 3),
                "admission_date": admission_date.date(),
                "parole_eligibility_date": parole_date.date() if parole_date else None,
                "zone": zone
            }
            records.append(record)
        
        df = pd.DataFrame(records)
        print(f"✓ Generated {len(df)} inmate profiles")
        return df
    
    def generate_behavioral_records(self, inmate_df: pd.DataFrame, avg_per_inmate: int = 3) -> pd.DataFrame:
        """Generate behavioral incident records"""
        print(f"Generating behavioral records...")
        
        incident_types = ["violence", "disobedience", "theft", "substance_use", "rule_violation", "contraband"]
        severities = ["minor", "moderate", "severe", "critical"]
        
        records = []
        record_id = 0
        
        for _, inmate in inmate_df.iterrows():
            # Inmates with higher risk have more incidents
            num_incidents = np.random.poisson(avg_per_inmate * inmate["risk_score"])
            num_incidents = min(num_incidents, 15)  # Cap at 15
            
            for _ in range(num_incidents):
                days_ago = random.randint(1, inmate["time_served_months"] * 30)
                incident_date = datetime.now() - timedelta(days=days_ago)
                
                # Severity correlated with risk
                if inmate["risk_score"] > 0.7:
                    severity = np.random.choice(severities, p=[0.1, 0.3, 0.4, 0.2])
                else:
                    severity = np.random.choice(severities, p=[0.4, 0.4, 0.15, 0.05])
                
                points_map = {"minor": 5, "moderate": 15, "severe": 30, "critical": 50}
                
                resolved = random.random() < 0.8
                resolution_date = incident_date + timedelta(days=random.randint(1, 30)) if resolved else None
                
                record = {
                    "record_id": f"BEH{str(record_id).zfill(6)}",
                    "inmate_id": inmate["inmate_id"],
                    "incident_date": incident_date,
                    "incident_type": random.choice(incident_types),
                    "severity": severity,
                    "description": f"{severity.capitalize()} incident of {random.choice(incident_types)}",
                    "disciplinary_action": random.choice([
                        "verbal_warning", "written_warning", "loss_of_privileges",
                        "solitary_confinement", "program_suspension"
                    ]) if severity in ["severe", "critical"] else "verbal_warning",
                    "points_deducted": points_map[severity],
                    "resolved": resolved,
                    "resolution_date": resolution_date
                }
                records.append(record)
                record_id += 1
        
        df = pd.DataFrame(records)
        print(f"✓ Generated {len(df)} behavioral records")
        return df
    
    def generate_program_outcomes(self, inmate_df: pd.DataFrame) -> pd.DataFrame:
        """Generate program participation outcomes"""
        print(f"Generating program outcomes...")
        
        statuses = ["completed", "in_progress", "dropped_out", "enrolled"]
        records = []
        outcome_id = 0
        
        for _, inmate in inmate_df.iterrows():
            total_programs = inmate["programs_completed"] + inmate["programs_enrolled"]
            
            if total_programs == 0:
                continue
            
            # Generate outcomes for each program
            for _ in range(total_programs):
                program_name = random.choice(list(self.PROGRAMS.keys()))
                program_type = self.PROGRAMS[program_name]
                
                days_ago = random.randint(30, inmate["time_served_months"] * 30)
                start_date = (datetime.now() - timedelta(days=days_ago)).date()
                
                # Status based on start date
                if days_ago > 180:
                    status = np.random.choice(["completed", "dropped_out"], p=[0.7, 0.3])
                elif days_ago > 90:
                    status = np.random.choice(["in_progress", "completed", "dropped_out"], p=[0.5, 0.4, 0.1])
                else:
                    status = np.random.choice(["enrolled", "in_progress"], p=[0.4, 0.6])
                
                if status == "completed":
                    end_date = start_date + timedelta(days=random.randint(60, 180))
                    completion_pct = 100.0
                    attendance = 0.7 + random.random() * 0.3
                    performance = 60 + random.random() * 40
                    cert_awarded = random.random() < 0.8
                elif status == "in_progress":
                    end_date = None
                    completion_pct = 30 + random.random() * 60
                    attendance = 0.6 + random.random() * 0.3
                    performance = 50 + random.random() * 40
                    cert_awarded = False
                elif status == "dropped_out":
                    end_date = start_date + timedelta(days=random.randint(14, 90))
                    completion_pct = random.random() * 50
                    attendance = 0.2 + random.random() * 0.4
                    performance = 20 + random.random() * 50
                    cert_awarded = False
                else:  # enrolled
                    end_date = None
                    completion_pct = 0.0
                    attendance = 0.0
                    performance = None
                    cert_awarded = False
                
                behavioral_improvement = random.uniform(-10, 30) if status in ["in_progress", "completed"] else None
                
                record = {
                    "outcome_id": f"OUT{str(outcome_id).zfill(6)}",
                    "inmate_id": inmate["inmate_id"],
                    "program_name": program_name,
                    "program_type": program_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "status": status,
                    "completion_percentage": round(completion_pct, 2),
                    "attendance_rate": round(attendance, 3),
                    "performance_score": round(performance, 2) if performance else None,
                    "behavioral_improvement": round(behavioral_improvement, 2) if behavioral_improvement else None,
                    "instructor_notes": f"Student shows {'good' if completion_pct > 70 else 'moderate'} progress",
                    "certificate_awarded": cert_awarded
                }
                records.append(record)
                outcome_id += 1
        
        df = pd.DataFrame(records)
        print(f"✓ Generated {len(df)} program outcomes")
        return df
    
    def generate_counseling_notes(self, inmate_df: pd.DataFrame, avg_per_inmate: int = 8) -> pd.DataFrame:
        """Generate counseling session notes with sentiment"""
        print(f"Generating counseling notes...")
        
        positive_templates = [
            "Inmate shows excellent progress. Engaged positively in session. Demonstrates good coping skills.",
            "Very cooperative today. Discussed future goals and employment. Showing reduced anxiety.",
            "Strong session. Inmate is taking responsibility for actions. Working well on rehabilitation goals.",
            "Positive attitude observed. Making concrete plans for release. Family relationships improving.",
            "Excellent engagement. Completed all assigned exercises. Ready to progress to next phase."
        ]
        
        neutral_templates = [
            "Standard session. Inmate participated adequately. No significant changes noted.",
            "Discussed daily routine and challenges. Maintaining stable behavior. Continue monitoring.",
            "Regular check-in completed. No major concerns. Progressing as expected.",
            "Session focused on routine issues. Inmate cooperative but reserved. Standard progress.",
            "Covered program requirements. Inmate understands expectations. Continue current plan."
        ]
        
        negative_templates = [
            "Difficult session. Inmate resistant to feedback. Showing signs of frustration and anger.",
            "Poor engagement today. Refusing to discuss important issues. May need intervention.",
            "Concerning behavior observed. Inmate withdrew from conversation. Risk factors present.",
            "Minimal cooperation. Discussed rule violations. Appears unmotivated for change.",
            "Challenging session. Inmate defensive and hostile. Recommend increased supervision."
        ]
        
        session_types = ["individual", "group", "crisis", "family"]
        
        records = []
        note_id = 0
        
        for _, inmate in inmate_df.iterrows():
            # More sessions for inmates with mental health issues
            num_sessions = avg_per_inmate
            if inmate["has_mental_health_issues"]:
                num_sessions = int(avg_per_inmate * 1.5)
            
            for _ in range(num_sessions):
                days_ago = random.randint(1, inmate["time_served_months"] * 30)
                session_date = datetime.now() - timedelta(days=days_ago)
                
                # Sentiment correlates with behavior score
                if inmate["behavior_score"] > 70:
                    sentiment = np.random.choice(["positive", "neutral"], p=[0.7, 0.3])
                elif inmate["behavior_score"] > 40:
                    sentiment = np.random.choice(["positive", "neutral", "negative"], p=[0.3, 0.5, 0.2])
                else:
                    sentiment = np.random.choice(["neutral", "negative"], p=[0.3, 0.7])
                
                if sentiment == "positive":
                    notes = random.choice(positive_templates)
                    progress_rating = 6 + random.random() * 4
                elif sentiment == "neutral":
                    notes = random.choice(neutral_templates)
                    progress_rating = 4 + random.random() * 4
                else:
                    notes = random.choice(negative_templates)
                    progress_rating = 1 + random.random() * 4
                
                risk_indicators = []
                if sentiment == "negative":
                    risk_indicators = random.sample([
                        "aggression", "self_harm", "substance_relapse", "isolation", "non_compliance"
                    ], k=random.randint(1, 3))
                
                record = {
                    "note_id": f"NOTE{str(note_id).zfill(6)}",
                    "inmate_id": inmate["inmate_id"],
                    "session_date": session_date,
                    "counselor_id": f"COUN{random.randint(1, 20):03d}",
                    "session_type": random.choice(session_types),
                    "duration_minutes": random.choice([30, 45, 60, 90]),
                    "notes": notes,
                    "sentiment": sentiment,
                    "risk_indicators": ", ".join(risk_indicators) if risk_indicators else "",
                    "progress_rating": round(progress_rating, 1),
                    "next_session_date": session_date + timedelta(days=random.randint(7, 30))
                }
                records.append(record)
                note_id += 1
        
        df = pd.DataFrame(records)
        print(f"✓ Generated {len(df)} counseling notes")
        return df
    
    def generate_early_release_data(self, inmate_df: pd.DataFrame) -> pd.DataFrame:
        """Generate early release eligibility assessments"""
        print(f"Generating early release data...")
        
        records = []
        record_id = 0
        
        for _, inmate in inmate_df.iterrows():
            # Only consider inmates who have served significant time
            if inmate["time_served_months"] < 6:
                continue
            
            time_served_pct = inmate["time_served_months"] / inmate["sentence_length_months"]
            
            # Calculate eligibility score
            behavior_factor = inmate["behavior_score"] / 100
            discipline_factor = inmate["discipline_score"] / 100
            program_factor = min(1.0, inmate["programs_completed"] / 3)
            risk_factor = 1 - inmate["risk_score"]
            time_factor = min(1.0, time_served_pct)
            
            eligibility_score = (
                behavior_factor * 0.3 +
                discipline_factor * 0.25 +
                program_factor * 0.2 +
                risk_factor * 0.15 +
                time_factor * 0.1
            )
            
            # Add some noise
            eligibility_score = min(1.0, max(0.0, eligibility_score + np.random.normal(0, 0.05)))
            
            # Recommendation based on score
            if eligibility_score > 0.7:
                recommendation = "eligible"
                approved = random.random() < 0.8
            elif eligibility_score > 0.5:
                recommendation = "pending_review"
                approved = random.random() < 0.5
            else:
                recommendation = "not_eligible"
                approved = False
            
            assessment_date = (datetime.now() - timedelta(days=random.randint(1, 90))).date()
            
            record = {
                "record_id": f"ER{str(record_id).zfill(6)}",
                "inmate_id": inmate["inmate_id"],
                "assessment_date": assessment_date,
                "eligibility_score": round(eligibility_score, 3),
                "recommendation": recommendation,
                "behavior_score": inmate["behavior_score"],
                "program_completion_count": inmate["programs_completed"],
                "discipline_score": inmate["discipline_score"],
                "time_served_percentage": round(time_served_pct, 3),
                "risk_assessment": inmate["risk_score"],
                "victim_impact_statement": "Reviewed" if random.random() < 0.6 else None,
                "community_support": random.random() < 0.4,
                "approved_by": f"ADMIN{random.randint(1, 10):03d}" if approved else None,
                "approval_date": assessment_date + timedelta(days=random.randint(7, 30)) if approved else None,
                "actual_release_date": None  # Future prediction
            }
            records.append(record)
            record_id += 1
        
        df = pd.DataFrame(records)
        print(f"✓ Generated {len(df)} early release records")
        return df
    
    def generate_industrial_training(self, inmate_df: pd.DataFrame) -> pd.DataFrame:
        """Generate industrial/vocational training records"""
        print(f"Generating industrial training records...")
        
        training_programs = {
            "carpentry": {"skill_levels": ["beginner", "intermediate", "advanced"], "hours": 240, "demand": "high"},
            "welding": {"skill_levels": ["beginner", "intermediate", "advanced"], "hours": 200, "demand": "high"},
            "plumbing": {"skill_levels": ["beginner", "intermediate"], "hours": 180, "demand": "medium"},
            "electrical": {"skill_levels": ["beginner", "intermediate", "advanced"], "hours": 260, "demand": "high"},
            "automotive": {"skill_levels": ["beginner", "intermediate"], "hours": 220, "demand": "medium"},
            "it_basics": {"skill_levels": ["beginner", "intermediate"], "hours": 160, "demand": "high"},
            "agriculture": {"skill_levels": ["beginner", "intermediate"], "hours": 180, "demand": "medium"},
            "culinary": {"skill_levels": ["beginner", "intermediate"], "hours": 200, "demand": "medium"},
        }
        
        records = []
        training_id = 0
        
        for _, inmate in inmate_df.iterrows():
            # Inmates in vocational programs get training records
            if random.random() < 0.3:  # 30% participate
                num_trainings = random.randint(1, 3)
                
                for _ in range(num_trainings):
                    program_name = random.choice(list(training_programs.keys()))
                    program_info = training_programs[program_name]
                    
                    skill_level = random.choice(program_info["skill_levels"])
                    total_hours = program_info["hours"]
                    
                    days_ago = random.randint(30, inmate["time_served_months"] * 30)
                    start_date = (datetime.now() - timedelta(days=days_ago)).date()
                    
                    # Completion based on behavior
                    if inmate["behavior_score"] > 60:
                        hours_completed = random.uniform(0.6, 1.0) * total_hours
                        completed = random.random() < 0.7
                    else:
                        hours_completed = random.uniform(0.2, 0.6) * total_hours
                        completed = random.random() < 0.3
                    
                    end_date = start_date + timedelta(days=int(total_hours / 4)) if completed else None
                    
                    performance_rating = 4 + (inmate["behavior_score"] / 100) * 6
                    performance_rating = min(10, max(1, performance_rating + np.random.normal(0, 1)))
                    
                    employment_potential = "high" if performance_rating > 7 else "medium" if performance_rating > 4 else "low"
                    
                    record = {
                        "training_id": f"TRN{str(training_id).zfill(6)}",
                        "inmate_id": inmate["inmate_id"],
                        "training_program": program_name,
                        "skill_level": skill_level,
                        "start_date": start_date,
                        "end_date": end_date,
                        "hours_completed": round(hours_completed, 1),
                        "certification_earned": completed and performance_rating > 6,
                        "performance_rating": round(performance_rating, 1),
                        "employment_potential": employment_potential,
                        "industry_demand": program_info["demand"],
                        "instructor_feedback": f"{'Excellent' if performance_rating > 7 else 'Good' if performance_rating > 4 else 'Needs improvement'} performance in {program_name}"
                    }
                    records.append(record)
                    training_id += 1
        
        df = pd.DataFrame(records)
        print(f"✓ Generated {len(df)} industrial training records")
        return df
    
    def generate_home_leave_records(self, inmate_df: pd.DataFrame) -> pd.DataFrame:
        """Generate home leave/furlough records"""
        print(f"Generating home leave records...")
        
        leave_types = ["emergency", "family_visit", "medical", "earned"]
        
        records = []
        leave_id = 0
        
        for _, inmate in inmate_df.iterrows():
            # Only good behavior inmates get home leave
            if inmate["behavior_score"] < 50:
                continue
            
            # Number of leaves based on behavior
            if inmate["behavior_score"] > 80:
                num_leaves = random.randint(1, 4)
            elif inmate["behavior_score"] > 60:
                num_leaves = random.randint(0, 2)
            else:
                num_leaves = random.randint(0, 1)
            
            for _ in range(num_leaves):
                leave_type = random.choice(leave_types)
                
                days_ago = random.randint(30, inmate["time_served_months"] * 30)
                request_date = (datetime.now() - timedelta(days=days_ago)).date()
                
                # Approval based on behavior
                if inmate["behavior_score"] > 75:
                    approval_status = np.random.choice(["approved", "completed"], p=[0.3, 0.7])
                elif inmate["behavior_score"] > 60:
                    approval_status = np.random.choice(["approved", "denied", "completed"], p=[0.4, 0.2, 0.4])
                else:
                    approval_status = np.random.choice(["denied", "pending"], p=[0.6, 0.4])
                
                if approval_status in ["approved", "completed"]:
                    start_date = request_date + timedelta(days=random.randint(7, 30))
                    duration_days = random.randint(2, 7) if leave_type == "earned" else random.randint(1, 3)
                    end_date = start_date + timedelta(days=duration_days)
                    approved_by = f"ADMIN{random.randint(1, 10):03d}"
                    approval_date = request_date + timedelta(days=random.randint(3, 14))
                    returned_on_time = random.random() < 0.95
                    incident = random.random() < 0.05
                else:
                    start_date = request_date + timedelta(days=random.randint(14, 60))
                    duration_days = random.randint(2, 7)
                    end_date = start_date + timedelta(days=duration_days)
                    approved_by = None
                    approval_date = None
                    returned_on_time = None
                    incident = False
                
                record = {
                    "leave_id": f"LEAVE{str(leave_id).zfill(6)}",
                    "inmate_id": inmate["inmate_id"],
                    "request_date": request_date,
                    "leave_type": leave_type,
                    "start_date": start_date,
                    "end_date": end_date,
                    "duration_days": duration_days,
                    "reason": f"{leave_type.replace('_', ' ').title()} request",
                    "approval_status": approval_status,
                    "approved_by": approved_by,
                    "approval_date": approval_date,
                    "returned_on_time": returned_on_time,
                    "incident_during_leave": incident,
                    "notes": f"{'Successful' if approval_status == 'completed' and returned_on_time else 'Pending'} leave"
                }
                records.append(record)
                leave_id += 1
        
        df = pd.DataFrame(records)
        print(f"✓ Generated {len(df)} home leave records")
        return df
    
    def generate_rehab_stations(self) -> pd.DataFrame:
        """Generate rehabilitation station/facility data"""
        print(f"Generating rehab stations...")
        
        stations = [
            {
                "station_id": "RS001",
                "station_name": "Colombo Rehabilitation Center",
                "location": "Colombo",
                "zone": "Western",
                "capacity": 200,
                "current_occupancy": random.randint(150, 200),
                "facility_type": "mixed",
                "specializations": "substance_abuse, mental_health, vocational",
                "security_level": "Medium",
                "available_programs": "substance_abuse_intensive, mental_health_therapy, vocational_carpentry, education_ged",
                "staff_count": 45,
                "rating": 4.2
            },
            {
                "station_id": "RS002",
                "station_name": "Kandy Vocational Center",
                "location": "Kandy",
                "zone": "Central",
                "capacity": 150,
                "current_occupancy": random.randint(100, 150),
                "facility_type": "vocational",
                "specializations": "vocational, education",
                "security_level": "Minimum",
                "available_programs": "vocational_carpentry, vocational_welding, vocational_it, education_basic",
                "staff_count": 30,
                "rating": 4.5
            },
            {
                "station_id": "RS003",
                "station_name": "Galle Mental Health Unit",
                "location": "Galle",
                "zone": "Southern",
                "capacity": 100,
                "current_occupancy": random.randint(70, 100),
                "facility_type": "mental_health",
                "specializations": "mental_health, counseling",
                "security_level": "Medium",
                "available_programs": "mental_health_therapy, cognitive_behavioral, family_counseling",
                "staff_count": 35,
                "rating": 4.3
            },
            {
                "station_id": "RS004",
                "station_name": "Jaffna Substance Abuse Center",
                "location": "Jaffna",
                "zone": "Northern",
                "capacity": 120,
                "current_occupancy": random.randint(80, 120),
                "facility_type": "substance_abuse",
                "specializations": "substance_abuse",
                "security_level": "Medium",
                "available_programs": "substance_abuse_intensive, substance_abuse_standard, counseling",
                "staff_count": 28,
                "rating": 4.0
            },
            {
                "station_id": "RS005",
                "station_name": "Anuradhapura Education Center",
                "location": "Anuradhapura",
                "zone": "North_Central",
                "capacity": 180,
                "current_occupancy": random.randint(120, 180),
                "facility_type": "education",
                "specializations": "education, behavioral",
                "security_level": "Minimum",
                "available_programs": "education_basic, education_ged, anger_management",
                "staff_count": 32,
                "rating": 4.4
            }
        ]
        
        df = pd.DataFrame(stations)
        print(f"✓ Generated {len(df)} rehab stations")
        return df
    
    def generate_all_datasets(self, n_inmates: int = 1000) -> Dict[str, pd.DataFrame]:
        """Generate all datasets"""
        print(f"\n{'='*60}")
        print(f"GENERATING COMPREHENSIVE REHABILITATION DATASETS")
        print(f"{'='*60}\n")
        
        # Generate base inmate profiles
        inmate_df = self.generate_inmate_profiles(n_inmates)
        
        # Generate related datasets
        datasets = {
            "inmate_profiles": inmate_df,
            "behavioral_records": self.generate_behavioral_records(inmate_df),
            "program_outcomes": self.generate_program_outcomes(inmate_df),
            "counseling_notes": self.generate_counseling_notes(inmate_df),
            "early_release_data": self.generate_early_release_data(inmate_df),
            "industrial_training": self.generate_industrial_training(inmate_df),
            "home_leave_records": self.generate_home_leave_records(inmate_df),
            "rehab_stations": self.generate_rehab_stations()
        }
        
        print(f"\n{'='*60}")
        print(f"DATASET GENERATION COMPLETE")
        print(f"{'='*60}\n")
        
        return datasets
    
    def save_datasets(self, datasets: Dict[str, pd.DataFrame], output_dir: str = "datasets"):
        """Save datasets to CSV and Excel files"""
        import os
        
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\nSaving datasets to {output_dir}/...")
        
        for name, df in datasets.items():
            # Save as CSV
            csv_path = os.path.join(output_dir, f"{name}.csv")
            df.to_csv(csv_path, index=False)
            print(f"✓ Saved {name}.csv ({len(df)} records)")
            
            # Save as Excel
            excel_path = os.path.join(output_dir, f"{name}.xlsx")
            df.to_excel(excel_path, index=False, engine='openpyxl')
            print(f"✓ Saved {name}.xlsx ({len(df)} records)")
        
        # Create combined Excel workbook
        combined_path = os.path.join(output_dir, "rehabilitation_complete_dataset.xlsx")
        with pd.ExcelWriter(combined_path, engine='openpyxl') as writer:
            for name, df in datasets.items():
                sheet_name = name[:31]  # Excel sheet name limit
                df.to_excel(writer, sheet_name=sheet_name, index=False)
        print(f"\n✓ Saved combined workbook: rehabilitation_complete_dataset.xlsx")
        
        print(f"\n{'='*60}")
        print(f"All datasets saved successfully!")
        print(f"{'='*60}\n")


# Standalone function for easy import
def generate_rehabilitation_datasets(n_inmates: int = 1000, save: bool = True, output_dir: str = "datasets"):
    """
    Generate comprehensive rehabilitation datasets
    
    Args:
        n_inmates: Number of inmate profiles to generate
        save: Whether to save datasets to files
        output_dir: Directory to save datasets
    
    Returns:
        Dictionary of DataFrames
    """
    generator = RealisticDatasetGenerator()
    datasets = generator.generate_all_datasets(n_inmates)
    
    if save:
        generator.save_datasets(datasets, output_dir)
    
    return datasets
