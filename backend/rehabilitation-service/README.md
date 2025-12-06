# Rehabilitation Service - Prison Management System

## Overview

The Rehabilitation Service is a comprehensive microservice for managing inmate rehabilitation programs in a prison management system. It combines **Spring Boot backend** with **AI-powered recommendations** via Python FastAPI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Rehabilitation Service                       │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │  REST APIs   │───▶│  Business    │───▶│  AI Service     │  │
│  │  (Spring)    │    │  Logic       │    │  Client         │  │
│  └──────────────┘    └──────────────┘    └─────────────────┘  │
│         │                    │                      │            │
│         │                    ▼                      ▼            │
│         │            ┌──────────────┐      ┌──────────────┐    │
│         │            │  PostgreSQL  │      │   FastAPI    │    │
│         │            │  Database    │      │   (Python)   │    │
│         │            └──────────────┘      └──────────────┘    │
│         │                                          │            │
│         ▼                                          │            │
│   ┌──────────────┐                                │            │
│   │    Kafka     │                                │            │
│   │   Events     │                        ┌───────▼─────────┐  │
│   └──────────────┘                        │  ML Models      │  │
│                                           │  - Classifier   │  │
│                                           │  - Recommender  │  │
│                                           │  - RAG/LLM      │  │
│                                           └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 1. **AI-Powered Recommendations**
- Inmate suitability classification (drug rehab, PTSD, vocational, etc.)
- Program recommendations with confidence scores
- Medical officer & station assignment using scoring algorithm
- Early release score prediction

### 2. **Smart Assignment**
Assignment algorithm scores candidates based on:
- **Specialization match** (40%): Match between inmate needs and officer/station skills
- **Proximity score** (20%): Zone-based matching for large prisons
- **Load factor** (20%): Current workload of officer/station
- **Success rate** (20%): Historical performance

### 3. **Data Integration**
- Medical reports from healthcare officers
- Counseling notes with AI summarization
- Progress tracking and logging
- Mental health component integration

### 4. **Event-Driven Architecture**
Kafka events:
- `inmate.admitted`
- `medical.report.added`
- `counseling.note.added`
- `rehab.recommendation.created`
- `rehab.progress.updated`

---

## Data Model

### Core Entities

1. **RehabProfile** - Inmate rehabilitation profile with features
2. **Program** - Rehabilitation program catalog (substance abuse, mental health, vocational)
3. **RehabStation** - Physical rehab facilities with capacity & specializations
4. **MedicalOfficer** - Officers with specializations and workload
5. **Recommendation** - AI-generated rehab plan with assignments
6. **ProgressLog** - Track progress through programs
7. **MedicalReport** - Medical assessments
8. **CounselingNote** - Counselor session notes with AI analysis

---

## API Endpoints

### Profile & Recommendations
```http
GET    /api/rehab/profile/{inmateId}           # Get rehabilitation profile
POST   /api/rehab/recommend                    # Generate AI recommendation
GET    /api/rehab/recommendations/{inmateId}   # Get all recommendations
```

### Data Collection
```http
POST   /api/rehab/medical-report              # Add medical report
POST   /api/rehab/counseling-note             # Add counseling note
POST   /api/rehab/progress                    # Log progress
```

### Resources
```http
GET    /api/rehab/programs                    # Get all programs
GET    /api/rehab/health                      # Health check
```

---

## Setup Instructions

### Prerequisites
- Java 21
- PostgreSQL 15+
- Kafka (optional, can be mocked)
- Python 3.10+ (for AI service)

### 1. Database Setup
```sql
CREATE DATABASE rehabilitation;
CREATE USER authuser WITH PASSWORD 'authpass';
GRANT ALL PRIVILEGES ON DATABASE rehabilitation TO authuser;
```

### 2. Start Spring Boot Service
```bash
cd backend/rehabilitation-service
./mvnw clean install
./mvnw spring-boot:run
```

Service runs on **http://localhost:4006**

### 3. API Documentation
Swagger UI: **http://localhost:4006/swagger-ui.html**

---

## AI Service Integration

### Python FastAPI Service (Minimal Stub)

The Spring Boot service calls a Python FastAPI AI service for ML predictions. Here's a **minimal stub** to get started:

```python
# ai_service/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any

app = FastAPI(title="Rehab AI Service")

class RecommendationRequest(BaseModel):
    inmateId: str
    profileFeatures: Dict[str, Any]
    suitabilityGroup: str
    riskScore: float

class ProgramRecommendation(BaseModel):
    programType: str
    programName: str
    durationWeeks: int
    score: float
    reason: str

class RecommendationResponse(BaseModel):
    programs: List[ProgramRecommendation]
    explanation: str
    confidence: float

@app.post("/api/v1/recommend")
def recommend(request: RecommendationRequest) -> RecommendationResponse:
    """Rule-based recommendation (replace with ML model)"""
    
    # Simple rule-based logic
    if "substance" in request.suitabilityGroup.lower():
        program = ProgramRecommendation(
            programType="substance_abuse",
            programName="Drug Rehabilitation Program",
            durationWeeks=12,
            score=0.85,
            reason="High risk for substance abuse detected"
        )
    elif "mental" in request.suitabilityGroup.lower():
        program = ProgramRecommendation(
            programType="mental_health",
            programName="Mental Health Support",
            durationWeeks=8,
            score=0.80,
            reason="Mental health indicators present"
        )
    else:
        program = ProgramRecommendation(
            programType="vocational",
            programName="Vocational Training",
            durationWeeks=16,
            score=0.70,
            reason="Standard vocational training recommended"
        )
    
    return RecommendationResponse(
        programs=[program],
        explanation=f"Recommended based on profile analysis",
        confidence=0.75
    )

@app.post("/api/v1/analyze-notes")
def analyze_notes(request: Dict[str, str]):
    """Analyze counseling notes (stub for LLM/RAG)"""
    text = request.get("text", "")
    return {
        "summary": f"Summary of session: {text[:100]}...",
        "sentiment": "neutral",
        "keyPoints": ["cooperation noted", "progress observed"]
    }

@app.get("/api/v1/early-release-score/{inmateId}")
def early_release_score(inmateId: str) -> float:
    """Calculate early release score (stub)"""
    return 0.65  # Replace with actual ML model

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Run AI Service
```bash
pip install fastapi uvicorn pydantic
python ai_service/main.py
```

AI service runs on **http://localhost:8001**

---

## Configuration

Edit `application.properties`:

```properties
# AI Service URL
ai.service.url=http://localhost:8001

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/rehabilitation

# Kafka (optional)
spring.kafka.bootstrap-servers=localhost:9092
```

---

## Sample API Calls

### 1. Generate Recommendation
```bash
curl -X POST http://localhost:4006/api/rehab/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "inmateId": "INM001",
    "inmateData": {
      "caseType": "drug_offense",
      "riskLevel": "medium",
      "zone": "zone_a"
    }
  }'
```

### 2. Add Medical Report
```bash
curl -X POST http://localhost:4006/api/rehab/medical-report \
  -H "Content-Type: application/json" \
  -d '{
    "inmateId": "INM001",
    "officerId": "OFF001",
    "diagnosis": "Substance dependency",
    "notes": "Patient showing withdrawal symptoms",
    "vitals": {
      "bloodPressure": "120/80",
      "heartRate": 72
    }
  }'
```

### 3. Log Progress
```bash
curl -X POST http://localhost:4006/api/rehab/progress \
  -H "Content-Type: application/json" \
  -d '{
    "recommendationId": 1,
    "status": "GOOD",
    "progressPercentage": 60,
    "notes": "Excellent participation in group sessions",
    "recordedBy": "OFF001"
  }'
```

---

## Development Roadmap

### Phase 1: Core Functionality (Current)
- ✅ Entity models and repositories
- ✅ REST APIs
- ✅ Assignment algorithm
- ✅ AI service integration stub

### Phase 2: AI Enhancement
- 🔲 Implement ML models (XGBoost/Random Forest)
- 🔲 RAG-based counseling note summarization
- 🔲 Early release prediction model
- 🔲 SHAP/LIME explainability

### Phase 3: Advanced Features
- 🔲 Real-time streaming with Kafka
- 🔲 Batch ETL jobs for feature engineering
- 🔲 Dashboard for officers
- 🔲 Mobile app integration

---

## ML Model Integration

For production ML models, replace the stub with:

1. **Classification**: Train XGBoost/Random Forest on historical inmate data
2. **Recommendation**: Hybrid collaborative filtering + content-based
3. **NLP**: Use HuggingFace transformers for counseling note analysis
4. **Serving**: Deploy with BentoML or FastAPI + Docker

---

## Testing

```bash
# Run tests
./mvnw test

# Build Docker image
docker build -t pms-rehabilitation-service .

# Run with Docker Compose
docker-compose up
```

---

## Integration with Other Services

This service integrates with:
- **Auth Service** (port 4005): User authentication
- **API Gateway** (port 4004): Routing and load balancing
- **Mental Health Service**: Risk assessment data
- **Inmate Service**: Inmate records

---

## Support

For issues or questions:
- Check API docs: http://localhost:4006/swagger-ui.html
- Review logs: `./logs/rehabilitation-service.log`
- Database console: http://localhost:5432

---

## License

Internal use - Sri Lanka Prison Management System
