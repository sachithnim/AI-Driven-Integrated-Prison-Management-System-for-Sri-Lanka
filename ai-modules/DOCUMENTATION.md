# Prison Management AI System - Complete Documentation

> **Complete Guide**: Architecture, Setup, API Reference, and Migration

---

## 📑 Table of Contents

1. [System Overview](#-system-overview)
2. [Quick Start](#-quick-start)
3. [Project Structure](#-project-structure)
4. [Module Details](#-module-details)
5. [API Reference](#-api-reference)
6. [Configuration](#-configuration)
7. [Migration Guide](#-migration-guide)
8. [Development Guide](#-development-guide)

---

## 🎯 System Overview

The Prison Management AI System is a modular, multi-service platform providing intelligent solutions across multiple domains of prison management.

### Available Modules

| Module | Port | Status | Description |
|--------|------|--------|-------------|
| **Rehabilitation** | 8001 | ✅ Active | Program recommendations & counseling analysis |
| **Overcrowding** | 8002 | 🚧 Planned | Capacity management & population prediction |
| **Violence** | 8003 | 🚧 Planned | Risk assessment & incident prediction |
| **Mental Health** | 8004 | 🚧 Planned | Screening & support recommendations |

### Architecture Benefits

- ✅ **Independent Modules**: Each service runs independently on its own port
- ✅ **Shared Components**: Common configuration, logging, and utilities
- ✅ **Scalable**: Add new modules without affecting existing ones
- ✅ **Flexible Deployment**: Run only the modules you need
- ✅ **Microservices Ready**: Easy to containerize and deploy separately

---

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Installation

```bash
# Clone the repository
cd ai-modules

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings (optional)
# Default values work out of the box
```

### Running Modules

#### Run Individual Module

```bash
# Rehabilitation module (Active)
python run_rehabilitation.py

# Access at: http://localhost:8001/docs
```

#### Run Placeholder Modules (Not Yet Implemented)

```bash
python run_overcrowding.py    # Shows planned features
python run_violence.py         # Shows planned features
python run_mental_health.py    # Shows planned features
```

#### Run All Modules

```bash
python run_all.py  # Interactive menu to select modules
```

### Verify Installation

```bash
# Test the API
curl http://localhost:8001/

# Expected response:
# {"service":"Rehabilitation AI Service","version":"1.0.0","status":"running"}
```

---

## 📁 Project Structure

```
ai-modules/
│
├── modules/                          # AI Modules Container
│   │
│   ├── rehabilitation/              # ✅ Active Module
│   │   ├── __init__.py
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py             # FastAPI application
│   │   │   │
│   │   │   ├── api/                # API Endpoints
│   │   │   │   ├── health.py      # Health checks
│   │   │   │   ├── recommendation.py
│   │   │   │   ├── analysis.py
│   │   │   │   └── scoring.py
│   │   │   │
│   │   │   ├── services/           # Business Logic
│   │   │   │   ├── recommendation_service.py
│   │   │   │   ├── nlp_service.py
│   │   │   │   └── scoring_service.py
│   │   │   │
│   │   │   ├── schemas/            # Pydantic Models
│   │   │   │   ├── recommendation.py
│   │   │   │   ├── analysis.py
│   │   │   │   └── scoring.py
│   │   │   │
│   │   │   └── core/               # Core Utilities
│   │   │       ├── config.py       # Configuration
│   │   │       └── logging.py      # Logging setup
│   │   │
│   │   └── tests/                  # Test Suite
│   │       └── test_api.py
│   │
│   ├── overcrowding/               # 🚧 Planned Module
│   │   └── __init__.py
│   │
│   ├── violence/                   # 🚧 Planned Module
│   │   └── __init__.py
│   │
│   ├── mental_health/              # 🚧 Planned Module
│   │   └── __init__.py
│   │
│   └── shared/                     # Shared Utilities
│       ├── config.py               # Shared configuration
│       ├── logging.py              # Centralized logging
│       └── utils.py                # Common utilities
│
├── run_rehabilitation.py           # Run rehabilitation module
├── run_overcrowding.py             # Run overcrowding (placeholder)
├── run_violence.py                 # Run violence (placeholder)
├── run_mental_health.py            # Run mental health (placeholder)
├── run_all.py                      # Run all modules
│
├── run.py                          # Deprecated (backward compatibility)
├── main.py                         # Deprecated (backward compatibility)
│
├── requirements.txt                # Python dependencies
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
└── DOCUMENTATION.md                # This file
```

---

## 📦 Module Details

### Rehabilitation Module (Active)

**Purpose**: Provide AI-driven rehabilitation recommendations and counseling analysis

**Features**:
- Program recommendation engine
- NLP-based counseling note analysis
- Risk scoring and early release assessment
- Multi-factor decision support

**Technology Stack**:
- FastAPI 0.104.1
- Pydantic 2.5.0
- Uvicorn 0.24.0
- spaCy (for NLP - optional)

**Architecture Layers**:

1. **API Layer** (`app/api/`): HTTP request handling
   - `health.py`: Service health and status
   - `recommendation.py`: Program recommendation endpoints
   - `analysis.py`: Text analysis endpoints
   - `scoring.py`: Risk scoring endpoints

2. **Service Layer** (`app/services/`): Business logic
   - `recommendation_service.py`: Recommendation algorithm
   - `nlp_service.py`: Natural language processing
   - `scoring_service.py`: Risk assessment calculations

3. **Schema Layer** (`app/schemas/`): Data validation
   - Pydantic models for request/response validation
   - Type-safe data structures

4. **Core Layer** (`app/core/`): Configuration & utilities
   - Environment-based configuration
   - Structured logging setup

### Planned Modules

#### Overcrowding Module (Port 8002)
**Planned Features**:
- Capacity forecasting
- Population trend analysis
- Resource optimization
- Transfer recommendations

#### Violence Module (Port 8003)
**Planned Features**:
- Violence risk assessment
- Incident prediction
- Behavioral pattern analysis
- Intervention recommendations

#### Mental Health Module (Port 8004)
**Planned Features**:
- Mental health screening
- Crisis detection
- Treatment matching
- Support recommendations

### Shared Module

**Purpose**: Provide common utilities across all modules

**Components**:
- `config.py`: Shared configuration (ports, environments)
- `logging.py`: Centralized logging setup
- `utils.py`: Common utility functions

---

## 📡 API Reference

### Rehabilitation Module API (Port 8001)

#### Health Endpoints

```bash
GET /
```
**Description**: Service information  
**Response**:
```json
{
  "service": "Rehabilitation AI Service",
  "version": "1.0.0",
  "status": "running"
}
```

```bash
GET /health
```
**Description**: Health check  
**Response**:
```json
{
  "status": "healthy",
  "service": "Rehabilitation AI Service",
  "timestamp": "2025-11-30T10:30:00"
}
```

#### Recommendation Endpoint

```bash
POST /api/v1/recommend
```
**Description**: Generate rehabilitation program recommendations

**Request Body**:
```json
{
  "inmate_id": "INM001",
  "age": 28,
  "offense_type": "theft",
  "sentence_length": 36,
  "risk_level": "medium",
  "education_level": "high_school",
  "work_experience": ["carpentry", "construction"],
  "behavioral_record": {
    "incidents": 2,
    "positive_behaviors": 15
  }
}
```

**Response**:
```json
{
  "inmate_id": "INM001",
  "recommendations": [
    {
      "program_id": "VOC_001",
      "program_name": "Vocational Training - Carpentry",
      "category": "vocational",
      "confidence": 0.89,
      "duration": "6 months",
      "description": "Advanced carpentry skills training",
      "benefits": ["skill development", "employment preparation"]
    }
  ],
  "risk_factors": ["repeat offense", "limited education"],
  "strengths": ["work experience", "good behavior"],
  "priority": "high"
}
```

#### Analysis Endpoint

```bash
POST /api/v1/analyze/notes
```
**Description**: Analyze counseling session notes using NLP

**Request Body**:
```json
{
  "inmate_id": "INM001",
  "session_date": "2025-11-30",
  "notes": "Patient showed positive attitude during session. Expressed interest in educational programs. Some anxiety about family situation.",
  "counselor_id": "CNS_005"
}
```

**Response**:
```json
{
  "inmate_id": "INM001",
  "session_date": "2025-11-30",
  "analysis": {
    "sentiment": {
      "overall": "positive",
      "score": 0.72,
      "confidence": 0.85
    },
    "key_themes": [
      "educational_interest",
      "family_concerns",
      "positive_attitude"
    ],
    "concerns": ["anxiety", "family_issues"],
    "recommendations": [
      "Consider family counseling program",
      "Enroll in educational assessment"
    ],
    "summary": "Positive engagement with educational interests, family support needs identified"
  }
}
```

#### Scoring Endpoints

```bash
GET /api/v1/scoring/early-release/{inmate_id}
```
**Description**: Calculate early release eligibility score

**Response**:
```json
{
  "inmate_id": "INM001",
  "score": 75,
  "category": "good",
  "eligible": true,
  "factors": {
    "behavior": 85,
    "participation": 70,
    "risk_assessment": 65
  },
  "recommendation": "Eligible for early release consideration"
}
```

```bash
GET /api/v1/scoring/models/info
```
**Description**: Get ML model information

**Response**:
```json
{
  "models": [
    {
      "name": "Recommendation Model",
      "version": "1.0.0",
      "status": "placeholder",
      "description": "Ready for ML model integration"
    }
  ],
  "last_updated": "2025-11-30T10:00:00"
}
```

#### Interactive Documentation

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Application Settings
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO

# Module Ports
REHABILITATION_PORT=8001
OVERCROWDING_PORT=8002
VIOLENCE_PORT=8003
MENTAL_HEALTH_PORT=8004

# API Settings
API_VERSION=v1
API_TITLE=Prison Management AI System

# CORS Settings (optional)
CORS_ORIGINS=["http://localhost:3000"]

# Database Settings (when needed)
# DATABASE_URL=postgresql://user:password@localhost/pms_db
```

### Configuration Files

#### `modules/shared/config.py`
Shared configuration for all modules:
```python
class SharedSettings(BaseSettings):
    environment: str = "development"
    log_level: str = "INFO"
    
    # Module ports
    rehabilitation_port: int = 8001
    overcrowding_port: int = 8002
    violence_port: int = 8003
    mental_health_port: int = 8004
```

#### Module-Specific Configuration
Each module can extend shared settings:
```python
from modules.shared.config import SharedSettings

class ModuleSettings(SharedSettings):
    # Module-specific settings
    pass
```

---

## 🔄 Migration Guide

### Migrating from Single Module to Multi-Module

#### Before (Old Structure)
```
ai-modules/
├── app/
├── run.py
└── main.py
```

#### After (New Structure)
```
ai-modules/
├── modules/
│   ├── rehabilitation/app/
│   ├── shared/
│   └── ...
├── run_rehabilitation.py
└── run_all.py
```

### Update Import Statements

**Old Code**:
```python
from app.core.config import settings
from app.services.recommendation_service import RecommendationService
```

**New Code**:
```python
# If importing from within rehabilitation module
from core.config import settings
from services.recommendation_service import RecommendationService

# If importing from outside the module
from modules.rehabilitation.app.core.config import settings
```

### Update Run Commands

**Old**:
```bash
python run.py
```

**New**:
```bash
python run_rehabilitation.py
```

### Backward Compatibility

The old `run.py` and `main.py` files are kept for backward compatibility but will show deprecation warnings:

```bash
python run.py
# ⚠️ DEPRECATED: Please use 'python run_rehabilitation.py' instead
```

---

## 💻 Development Guide

### Adding a New Module

1. **Create module directory**:
```bash
mkdir -p modules/new_module/app/{api,services,schemas,core}
mkdir -p modules/new_module/tests
```

2. **Create `__init__.py`**:
```python
# modules/new_module/__init__.py
__version__ = "1.0.0"
__module_name__ = "New Module"
__status__ = "active"
```

3. **Create module structure** (copy from rehabilitation as template)

4. **Create run file**:
```python
# run_new_module.py
import uvicorn
from modules.new_module.app.main import app
from modules.shared.config import shared_settings

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)
```

5. **Update shared configuration**:
```python
# modules/shared/config.py
class SharedSettings(BaseSettings):
    # ... existing settings ...
    new_module_port: int = 8005
```

### Testing

```bash
# Run tests for rehabilitation module
pytest modules/rehabilitation/tests/

# Run all tests
pytest modules/

# Run with coverage
pytest --cov=modules --cov-report=html
```

### Code Style

```bash
# Format code
black modules/

# Lint code
flake8 modules/

# Type checking
mypy modules/
```

### Logging

All modules use centralized logging:

```python
from core.logging import logger

logger.info("Processing recommendation request")
logger.error("Error occurred", exc_info=True)
```

### Best Practices

1. **Separation of Concerns**
   - API layer: HTTP handling only
   - Service layer: Business logic
   - Schema layer: Data validation

2. **Type Safety**
   - Use Pydantic models for all data
   - Add type hints to functions

3. **Error Handling**
   - Use FastAPI's HTTPException
   - Provide meaningful error messages
   - Log errors appropriately

4. **Documentation**
   - Add docstrings to all functions
   - Use OpenAPI descriptions in endpoints
   - Keep API documentation up to date

### Common Commands

```bash
# Start development server with auto-reload
python run_rehabilitation.py

# Check for port conflicts
lsof -i :8001

# Kill process on port
lsof -ti:8001 | xargs kill -9

# View logs
tail -f logs/rehabilitation.log

# Test API endpoint
curl -X POST http://localhost:8001/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{"inmate_id": "INM001", "age": 28, ...}'
```

---

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (Future)                  │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐         ┌────▼────┐         ┌───▼─────┐
   │  Port   │         │  Port   │         │  Port   │
   │  8001   │         │  8002   │         │  8003   │
   └────┬────┘         └────┬────┘         └───┬─────┘
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│ Rehabilitation │  │  Overcrowding  │  │   Violence  │
│     Module     │  │     Module     │  │    Module   │
└───────┬────────┘  └───────┬────────┘  └──────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │ Shared Modules │
                    │ - Config       │
                    │ - Logging      │
                    │ - Utilities    │
                    └────────────────┘
```

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8001

# Kill the process
lsof -ti:8001 | xargs kill -9
```

### Import Errors

- Ensure you're running from the project root
- Check that virtual environment is activated
- Verify all `__init__.py` files exist

### Module Not Found

```bash
# Reinstall dependencies
pip install -r requirements.txt

# Check Python path
python -c "import sys; print('\n'.join(sys.path))"
```

### API Not Responding

```bash
# Check if service is running
curl http://localhost:8001/health

# Check logs
cat logs/rehabilitation.log
```

---

## 📚 Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Pydantic Documentation**: https://docs.pydantic.dev/
- **Uvicorn Documentation**: https://www.uvicorn.org/

---

## 📝 Change Log

### Version 2.0.0 (Multi-Module Architecture)
- ✅ Restructured to multi-module architecture
- ✅ Added shared utilities module
- ✅ Created placeholder modules for future features
- ✅ Updated documentation
- ✅ Maintained backward compatibility

### Version 1.0.0 (Initial Release)
- ✅ Single rehabilitation module
- ✅ Basic API endpoints
- ✅ NLP analysis features

---

## 📄 License

[Your License Here]

## 👥 Contributors

[Your Contributors Here]

---

**Last Updated**: November 30, 2025  
**Version**: 2.0.0  
**Status**: Production Ready (Rehabilitation Module) | Planned (Other Modules)
