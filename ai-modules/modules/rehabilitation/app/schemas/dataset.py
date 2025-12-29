"""
Dataset upload and management schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum


class DatasetType(str, Enum):
    """Supported dataset types"""
    INMATE_PROFILES = "inmate_profiles"
    BEHAVIORAL_RECORDS = "behavioral_records"
    PROGRAM_OUTCOMES = "program_outcomes"
    COUNSELING_NOTES = "counseling_notes"
    EARLY_RELEASE_DATA = "early_release_data"
    INDUSTRIAL_TRAINING = "industrial_training"
    HOME_LEAVE = "home_leave"
    REHAB_STATIONS = "rehab_stations"


class FileFormat(str, Enum):
    """Supported file formats"""
    CSV = "csv"
    EXCEL = "excel"
    XLSX = "xlsx"
    XLS = "xls"


class InmateProfile(BaseModel):
    """Inmate profile for rehabilitation eligibility"""
    inmate_id: str = Field(..., description="Unique inmate identifier")
    booking_number: str
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    age: int
    education_level: str
    sentence_length_months: int
    time_served_months: int
    remaining_sentence_months: int
    crime_type: str
    security_level: str
    facility: str
    block: str
    cell_number: Optional[str] = None
    
    # Behavioral & Risk Factors
    behavior_score: float = Field(..., ge=0, le=100, description="0-100 behavior rating")
    discipline_score: float = Field(..., ge=0, le=100, description="0-100 discipline rating")
    risk_score: float = Field(..., ge=0, le=1, description="0-1 risk assessment")
    prior_convictions: int = Field(..., ge=0)
    institutional_violations: int = Field(..., ge=0)
    
    # Health & Substance Issues
    has_substance_abuse: bool = False
    has_mental_health_issues: bool = False
    requires_medical_attention: bool = False
    
    # Program Participation
    programs_completed: int = Field(default=0, ge=0)
    programs_enrolled: int = Field(default=0, ge=0)
    total_attendance_rate: float = Field(default=0.0, ge=0, le=1)
    
    # Additional metadata
    admission_date: date
    parole_eligibility_date: Optional[date] = None
    zone: Optional[str] = None  # Geographic zone


class BehavioralRecord(BaseModel):
    """Behavioral incident records"""
    record_id: str
    inmate_id: str
    incident_date: datetime
    incident_type: str  # violence, disobedience, theft, substance_use, etc
    severity: str  # minor, moderate, severe, critical
    description: str
    disciplinary_action: Optional[str] = None
    points_deducted: int = Field(default=0, ge=0)
    resolved: bool = False
    resolution_date: Optional[datetime] = None


class ProgramOutcome(BaseModel):
    """Rehabilitation program participation and outcomes"""
    outcome_id: str
    inmate_id: str
    program_name: str
    program_type: str  # substance_abuse, mental_health, vocational, education, etc
    start_date: date
    end_date: Optional[date] = None
    status: str  # enrolled, in_progress, completed, dropped_out
    completion_percentage: float = Field(..., ge=0, le=100)
    attendance_rate: float = Field(..., ge=0, le=1)
    performance_score: Optional[float] = Field(None, ge=0, le=100)
    behavioral_improvement: Optional[float] = None  # Change in behavior score
    instructor_notes: Optional[str] = None
    certificate_awarded: bool = False


class CounselingNote(BaseModel):
    """Counseling session notes"""
    note_id: str
    inmate_id: str
    session_date: datetime
    counselor_id: str
    session_type: str  # individual, group, crisis, family
    duration_minutes: int
    notes: str
    sentiment: Optional[str] = None  # positive, neutral, negative
    risk_indicators: List[str] = Field(default_factory=list)
    progress_rating: Optional[float] = Field(None, ge=0, le=10)
    next_session_date: Optional[datetime] = None


class EarlyReleaseData(BaseModel):
    """Early release eligibility data"""
    record_id: str
    inmate_id: str
    assessment_date: date
    eligibility_score: float = Field(..., ge=0, le=1)
    recommendation: str  # eligible, not_eligible, pending_review
    behavior_score: float = Field(..., ge=0, le=100)
    program_completion_count: int = Field(..., ge=0)
    discipline_score: float = Field(..., ge=0, le=100)
    time_served_percentage: float = Field(..., ge=0, le=1)
    risk_assessment: float = Field(..., ge=0, le=1)
    victim_impact_statement: Optional[str] = None
    community_support: bool = False
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    actual_release_date: Optional[date] = None


class IndustrialTrainingRecord(BaseModel):
    """Industrial/vocational training records"""
    training_id: str
    inmate_id: str
    training_program: str  # carpentry, welding, IT, agriculture, etc
    skill_level: str  # beginner, intermediate, advanced
    start_date: date
    end_date: Optional[date] = None
    hours_completed: float = Field(..., ge=0)
    certification_earned: bool = False
    performance_rating: float = Field(..., ge=0, le=10)
    employment_potential: str  # low, medium, high
    industry_demand: str  # low, medium, high
    instructor_feedback: Optional[str] = None


class HomeLeaveRecord(BaseModel):
    """Home leave/furlough records"""
    leave_id: str
    inmate_id: str
    request_date: date
    leave_type: str  # emergency, family_visit, medical, earned
    start_date: date
    end_date: date
    duration_days: int
    reason: str
    approval_status: str  # pending, approved, denied, completed
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    returned_on_time: Optional[bool] = None
    incident_during_leave: bool = False
    notes: Optional[str] = None


class RehabStation(BaseModel):
    """Rehabilitation station/facility information"""
    station_id: str
    station_name: str
    location: str
    zone: str
    capacity: int
    current_occupancy: int
    facility_type: str  # substance_abuse, mental_health, vocational, education
    specializations: List[str]
    security_level: str  # minimum, medium, maximum
    available_programs: List[str]
    staff_count: int
    rating: float = Field(..., ge=0, le=5)


class DatasetUploadRequest(BaseModel):
    """Request to upload dataset file"""
    dataset_type: DatasetType
    file_format: FileFormat
    description: Optional[str] = None
    replace_existing: bool = False


class DatasetUploadResponse(BaseModel):
    """Response from dataset upload"""
    success: bool
    message: str
    dataset_type: DatasetType
    records_count: int
    validation_errors: List[str] = Field(default_factory=list)
    sample_records: List[Dict[str, Any]] = Field(default_factory=list)
    upload_timestamp: datetime


class EligibilityAssessmentRequest(BaseModel):
    """
    Direct eligibility assessment request - NO inmate_id required
    Accepts full inmate profile data for immediate assessment
    """
    # Core Profile
    age: Optional[int] = Field(None, ge=18, le=100)
    gender: Optional[str] = None
    crime_type: Optional[str] = None
    sentence_length_months: Optional[int] = Field(None, ge=0)
    time_served_months: Optional[int] = Field(None, ge=0)
    
    # Behavioral Assessment
    behavior_score: float = Field(..., ge=0, le=100, description="Current behavior score (required)")
    discipline_score: float = Field(..., ge=0, le=100, description="Discipline compliance score (required)")
    risk_score: float = Field(..., ge=0, le=1, description="Risk assessment score (required)")
    
    # Program Participation
    programs_completed: int = Field(0, ge=0, description="Number of completed rehabilitation programs")
    programs_enrolled: int = Field(0, ge=0)
    total_attendance_rate: Optional[float] = Field(None, ge=0, le=1)
    
    # Disciplinary Record
    institutional_violations: int = Field(0, ge=0, description="Number of violations")
    total_incidents: int = Field(0, ge=0, description="Total behavioral incidents")
    points_deducted: int = Field(0, ge=0)
    
    # Additional Factors
    has_substance_abuse: bool = False
    has_mental_health_issues: bool = False
    education_level: Optional[str] = None
    prior_convictions: int = Field(0, ge=0)
    
    # Optional Identification (for tracking only)
    inmate_id: Optional[str] = Field(None, description="Optional ID for tracking - NOT required for assessment")
    
    class Config:
        schema_extra = {
            "example": {
                "behavior_score": 75.5,
                "discipline_score": 82.3,
                "risk_score": 0.42,
                "programs_completed": 3,
                "programs_enrolled": 1,
                "total_attendance_rate": 0.89,
                "institutional_violations": 2,
                "total_incidents": 5,
                "points_deducted": 15,
                "time_served_months": 24,
                "sentence_length_months": 60,
                "has_substance_abuse": True,
                "has_mental_health_issues": False,
                "age": 32,
                "crime_type": "drug_trafficking",
                "education_level": "secondary",
                "prior_convictions": 1,
                "inmate_id": "INM-2024-1234"
            }
        }


class EligibilityAssessmentResponse(BaseModel):
    """Enhanced eligibility assessment result with AI reasoning"""
    inmate_id: Optional[str] = Field(None, description="Inmate ID if provided in request")
    eligible: bool
    eligibility_score: float = Field(..., ge=0, le=1)
    confidence: float = Field(..., ge=0, le=1)
    recommended_programs: List[str]
    
    # AI-Enhanced Fields
    reasoning: Optional[str] = Field(None, description="OpenAI-generated reasoning (if enabled)")
    risk_factors: List[str] = Field(default_factory=list, description="Identified risk factors")
    strengths: List[str] = Field(default_factory=list, description="Identified strengths")
    
    # Detailed Scoring
    scores_breakdown: Dict[str, float] = Field(default_factory=dict)
    assessment_date: datetime = Field(default_factory=datetime.now)


class RehabPlanRequest(BaseModel):
    """Request to generate rehabilitation plan"""
    inmate_id: str
    approved_programs: List[str]
    target_station_id: Optional[str] = None
    duration_weeks: int = Field(..., ge=1, le=104)
    special_requirements: List[str] = Field(default_factory=list)


class Activity(BaseModel):
    """Rehabilitation activity"""
    activity_id: str
    activity_name: str
    activity_type: str  # counseling, training, education, therapy, work
    scheduled_date: datetime
    duration_minutes: int
    location: str
    instructor: Optional[str] = None
    objectives: List[str]
    materials_needed: List[str] = Field(default_factory=list)


class Milestone(BaseModel):
    """Rehabilitation milestone"""
    milestone_id: str
    milestone_name: str
    description: str
    target_date: date
    completion_criteria: List[str]
    achieved: bool = False
    achievement_date: Optional[date] = None


class RehabPlan(BaseModel):
    """Generated rehabilitation plan"""
    plan_id: str
    inmate_id: str
    station_id: str
    programs: List[str]
    start_date: date
    end_date: date
    total_duration_weeks: int
    
    # Weekly schedule
    weekly_activities: List[Activity]
    
    # Milestones
    milestones: List[Milestone]
    
    # Objectives
    primary_objectives: List[str]
    secondary_objectives: List[str]
    
    # Resources
    required_resources: List[str]
    assigned_staff: List[str]
    
    # Metrics
    success_metrics: List[str]
    evaluation_schedule: List[date]
    
    # Generated summary
    plan_summary: str
    created_date: datetime
    created_by: str = "AI_SYSTEM"


class ProgressUpdate(BaseModel):
    """Progress update for rehab plan"""
    update_id: str
    plan_id: str
    inmate_id: str
    update_date: datetime
    activities_completed: int
    attendance_rate: float
    behavioral_score: float
    performance_score: float
    counselor_notes: str
    issues_identified: List[str] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)


class PredictionRequest(BaseModel):
    """Request for predictions (early release, training, home leave)"""
    inmate_id: str
    prediction_type: str  # early_release, industrial_training, home_leave


class PredictionResponse(BaseModel):
    """Prediction response"""
    inmate_id: str
    prediction_type: str
    prediction: str  # eligible, not_eligible, pending
    probability: float = Field(..., ge=0, le=1)
    confidence: float = Field(..., ge=0, le=1)
    factors_supporting: List[Dict[str, Any]]
    factors_against: List[Dict[str, Any]]
    recommendation: str
    predicted_date: Optional[date] = None
    reasoning: str
