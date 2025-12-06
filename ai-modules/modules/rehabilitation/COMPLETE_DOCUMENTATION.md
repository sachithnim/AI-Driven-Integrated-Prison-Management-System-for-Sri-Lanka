# Rehabilitation AI Module - Comprehensive Guide

## Overview

The Rehabilitation AI Module is an advanced system for prison rehabilitation program management using machine learning and natural language processing. It provides AI-powered recommendations for inmate rehabilitation, analyzes counseling notes, and predicts early release eligibility.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│          Rehabilitation AI Service (FastAPI)            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           API Endpoints                          │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ • /api/v1/recommend (XGBoost Recommendations)    │   │
│  │ • /api/v1/analyze (Transformer-based NLP)        │   │
│  │ • /api/v1/scoring (Early Release Prediction)     │   │
│  │ • /api/v1/data (Data Management & Training)      │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │        AI/ML Models                              │   │
│  ├──────────────────────────────────────────────────┤   │
│  │ • XGBoost Classifier (Recommendations)           │   │
│  │ • Logistic Regression (Early Release)            │   │
│  │ • DistilBERT (Sentiment Analysis)                │   │
│  │ • BART (Text Summarization)                      │   │
│  │ • BERT NER (Entity Recognition)                  │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │    Auth Service Integration                      │   │
│  │    (JWT Authentication)                          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## AI/ML Technologies

### 1. **Recommendation Engine (XGBoost)**
- **Model**: XGBoost Classifier
- **Purpose**: Predict suitable rehabilitation programs
- **Features**: Program completion %, attendance rate, behavioral score, risk score
- **Output**: Top 3 programs with scores and rationale

### 2. **NLP Analysis (Transformers)**
- **Sentiment Analysis**: DistilBERT (distilbert-base-uncased-finetuned-sst-2-english)
- **Text Summarization**: BART (facebook/bart-large-cnn)
- **Named Entity Recognition**: BERT NER (dslim/bert-base-uncased-ner)
- **Purpose**: Analyze counseling notes for insights

### 3. **Early Release Prediction (Logistic Regression)**
- **Model**: Logistic Regression (calibrated probabilities)
- **Features**: Behavior score, program completion count, disciplinary score
- **Output**: Eligibility score (0-1) and recommendation

### 4. **Dataset Generation**
- **Synthetic Data**: Realistic inmate profiles and outcomes
- **Training Data**: Program outcomes and counseling notes
- **Size**: Configurable (100-10,000 records)

## Installation

### Prerequisites
```bash
Python 3.8+
PyTorch (installed via transformers)
scikit-learn, XGBoost
FastAPI, Uvicorn
```

### Setup

1. **Install dependencies**:
```bash
pip install -r requirements.txt
```

2. **Initialize the module**:
```bash
cd ai-modules/modules/rehabilitation
python init_module.py
```

This will:
- Generate 500 sample inmate profiles
- Train the recommendation and early release models
- Create the models directory

3. **Run the service**:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## API Endpoints

### Authentication
All endpoints support JWT token authentication (optional, controlled by `REQUIRE_AUTH` setting)

### Core Endpoints

#### 1. Program Recommendations
```bash
POST /api/v1/recommend
Content-Type: application/json

{
  "inmateId": "INM00123",
  "profileFeatures": {
    "completion_percentage": 75.5,
    "attendance_rate": 85.0,
    "behavioral_score": 70.0
  },
  "suitabilityGroup": "substance_abuse",
  "riskScore": 0.65
}
```

**Response**:
```json
{
  "programs": [
    {
      "programType": "substance_abuse_intensive",
      "programName": "Intensive Drug Rehabilitation Program",
      "durationWeeks": 12,
      "score": 0.87,
      "reason": "Recommended based on suitability match and ML model score."
    }
  ],
  "explanation": "ML-based recommendations for suitability group...",
  "confidence": 0.82
}
```

#### 2. Analyze Counseling Notes
```bash
POST /api/v1/analyze
Content-Type: application/json

{
  "inmateId": "INM00123",
  "text": "Inmate showing good progress in rehabilitation. Positive behavioral changes observed with strong motivation for self-improvement."
}
```

**Response**:
```json
{
  "summary": "Inmate showing good progress. Positive behavioral changes with strong motivation.",
  "sentiment": "positive",
  "keyPoints": [
    "Topic: behavioral",
    "Topic: progress",
    "Patient Name (PER)",
    "Topic: compliance"
  ]
}
```

#### 3. Early Release Eligibility
```bash
GET /api/v1/scoring/early-release/INM00123?behavior_score=85&program_completion_count=3&disciplinary_score=80
```

**Response**:
```json
{
  "inmateId": "INM00123",
  "score": 0.7841,
  "recommendation": "eligible"
}
```

#### 4. Sample Data Generation
```bash
POST /api/v1/data/generate-sample-data?n_samples=500
```

**Response**:
```json
{
  "status": "success",
  "n_samples": 500,
  "datasets": {
    "inmate_profiles": {...},
    "program_outcomes": {...},
    "counseling_notes": {...},
    "early_release": {...}
  }
}
```

#### 5. Model Training
```bash
POST /api/v1/data/train-models?n_samples=500
```

**Response**:
```json
{
  "status": "success",
  "training_samples": 500,
  "results": {
    "recommendation_accuracy": 0.8234,
    "early_release_accuracy": 0.7821,
    "models_saved": true,
    "training_samples": 500
  }
}
```

### Testing Endpoints

#### Get Sample Inmate
```bash
GET /api/v1/data/inmate-sample
```

#### Get Sample Counseling Note
```bash
GET /api/v1/data/counseling-note-sample
```

#### Get Statistics
```bash
GET /api/v1/data/statistics
```

## Configuration

### Environment Variables
```bash
# Server
HOST=0.0.0.0
REHABILITATION_PORT=8001

# Database (future)
DATABASE_URL=postgresql://user:password@localhost/prison_db

# Auth Service
AUTH_SERVICE_URL=http://localhost:4005
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Features
REQUIRE_AUTH=false
ENABLE_MODEL_TRAINING=true

# Logging
LOG_LEVEL=INFO
```

### .env File
Create `ai-modules/.env`:
```
REHABILITATION_PORT=8001
AUTH_SERVICE_URL=http://localhost:4005
JWT_SECRET_KEY=your-production-secret-key
REQUIRE_AUTH=true
LOG_LEVEL=INFO
```

## Data Structures

### Inmate Profile
```python
{
    "inmateId": "INM00001",
    "age": 35,
    "gender": "M",
    "educationLevel": "secondary",
    "sentenceLengthMonths": 60,
    "timeServedMonths": 24,
    "previousConvictions": 2,
    "substanceAbuseHistory": true,
    "mentalHealthDiagnosis": false,
    "disciplinaryIncidents": 3,
    "suitabilityGroup": "substance_abuse",
    "riskScore": 0.65
}
```

### Program Database
The system includes 8 core rehabilitation programs:
- `substance_abuse_intensive`: 12-week intensive program
- `substance_abuse_standard`: 8-week standard program
- `mental_health_therapy`: 10-week trauma therapy
- `vocational_training`: 16-week vocational skills
- `education_program`: 20-week GED prep
- `anger_management`: 10-week anger management
- `cognitive_behavioral`: 8-week CBT
- `family_counseling`: 12-week family reintegration

## Model Training

### Dataset Generation
```python
from app.utils.dataset_generator import DatasetGenerator

generator = DatasetGenerator()
datasets = generator.generate_all_datasets(n_inmates=500)

# Access datasets
inmate_profiles = datasets['inmate_profiles']
program_outcomes = datasets['program_outcomes']
counseling_notes = datasets['counseling_notes']
early_release = datasets['early_release']
```

### Model Training
```python
from app.utils.model_trainer import ModelTrainer

trainer = ModelTrainer(models_dir="app/models")
results = trainer.train_all_models(n_samples=500)

print(results['recommendation_accuracy'])   # XGBoost accuracy
print(results['early_release_accuracy'])    # Logistic Regression accuracy
```

## Performance Metrics

### Recommendation Model (XGBoost)
- **Accuracy**: ~82-84%
- **Training Time**: ~2-3 seconds (500 samples)
- **Features**: 5
- **Output Classes**: 2 (recommended/not recommended)

### Early Release Model (Logistic Regression)
- **Accuracy**: ~78-80%
- **Training Time**: <1 second
- **Features**: 3
- **Output**: Probability (0-1)

### NLP Models (Transformers)
- **Sentiment Analysis**: DistilBERT (6-layer, 66M parameters)
- **Summarization**: BART (12-layer encoder, 12-layer decoder)
- **NER**: BERT (12-layer, 110M parameters)
- **Inference Time**: ~500-1000ms per request

## Integration with Auth Service

The module integrates with the Auth Service for JWT token validation:

```python
from app.utils.auth_utils import auth_service

# Validate token
validation = auth_service.validate_token(token)
if validation["valid"]:
    claims = validation["claims"]
    user_id = claims.get("sub")
    roles = claims.get("roles", [])
```

## Logging

Logs are written to both console and file:
```
logs/
├── rehabilitation_YYYY-MM-DD.log
└── console output (real-time)
```

Log levels:
- DEBUG: Detailed model predictions and scores
- INFO: Service startup, API calls, model training
- WARNING: Non-critical errors, fallback logic
- ERROR: Critical failures

## Testing

### Unit Tests
```bash
cd ai-modules/modules/rehabilitation
pytest tests/
```

### Quick Functionality Test
```bash
python init_module.py --test
```

### Manual Testing
```bash
# Test recommendation
curl -X POST http://localhost:8001/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d @test_request.json

# Test NLP
curl -X POST http://localhost:8001/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{"inmateId":"INM001", "text":"Good progress noted"}'

# Generate sample data
curl -X POST "http://localhost:8001/api/v1/data/generate-sample-data?n_samples=100"
```

## Docker Deployment

### Build Image
```bash
docker build -t rehabilitation-ai:latest -f Dockerfile .
```

### Run Container
```bash
docker run -d \
  --name rehabilitation-ai \
  -p 8001:8001 \
  -e AUTH_SERVICE_URL=http://auth-service:4005 \
  -e REQUIRE_AUTH=true \
  rehabilitation-ai:latest
```

## Performance Optimization

### Recommendations for Production

1. **Model Caching**: Models are loaded once on startup
2. **Lazy Loading**: NLP models loaded on first request
3. **Batch Processing**: Support for bulk recommendations
4. **Response Caching**: Consider Redis for frequently accessed data
5. **Load Balancing**: Deploy multiple instances behind nginx

### Scaling

- Horizontal scaling: Deploy multiple instances
- Model optimization: Use ONNX for faster inference
- Quantization: Use 8-bit or 16-bit models for memory efficiency

## Troubleshooting

### Issue: Models not found
**Solution**:
```bash
python init_module.py
# or
curl -X POST http://localhost:8001/api/v1/data/train-models
```

### Issue: Transformer models slow on first request
**Solution**: Pre-load models at startup by accessing endpoints:
```bash
# This will download and cache models
curl http://localhost:8001/api/v1/data/counseling-note-sample
```

### Issue: Out of memory with large batch
**Solution**: Reduce batch size or use smaller models
```python
# Use distilbert instead of bert for faster inference
# Use smaller batch sizes in batch processing
```

## Future Enhancements

1. **Survival Analysis**: Cox proportional hazards model for release timing
2. **Deep Learning**: LSTM for temporal behavior patterns
3. **Reinforcement Learning**: Optimize program assignment
4. **Transfer Learning**: Fine-tune on domain-specific data
5. **Explainability**: SHAP values for model interpretability
6. **Real-time Updates**: Stream processing for continuous learning

## References

- [XGBoost Documentation](https://xgboost.readthedocs.io/)
- [HuggingFace Transformers](https://huggingface.co/transformers/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [scikit-learn](https://scikit-learn.org/)

## License

This module is part of the AI-Driven Integrated Prison Management System.

## Support

For issues or questions:
1. Check documentation above
2. Review log files
3. Run tests: `python init_module.py --test`
4. Contact development team

---

**Last Updated**: December 2025
**Version**: 1.0.0
