# Prison Management AI System

> A modular, multi-service AI system for comprehensive prison management

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)]()

## 🎯 Overview

Multi-module AI platform providing intelligent solutions for:
- ✅ **Rehabilitation** (Active) - Program recommendations & analysis
- 🚧 **Overcrowding** (Planned) - Capacity management
- 🚧 **Violence Prevention** (Planned) - Risk assessment
- 🚧 **Mental Health** (Planned) - Screening & support

📚 **[Read Complete Documentation](DOCUMENTATION.md)** for detailed information.

## 🚀 Quick Start

### Installation

```
ai-modules/
├── modules/                          # AI Modules
│   ├── rehabilitation/              # ✅ Rehabilitation Module (Active)
│   │   ├── app/
│   │   │   ├── api/                # API endpoints
│   │   │   ├── services/           # Business logic
│   │   │   ├── schemas/            # Data models
│   │   │   ├── core/               # Config & utilities
│   │   │   └── main.py             # App factory
│   │   └── tests/                  # Module tests
│   │
│   ├── overcrowding/               # 🚧 Overcrowding Module (Planned)
│   │   └── __init__.py
│   │
│   ├── violence/                   # 🚧 Violence Module (Planned)
│   │   └── __init__.py
│   │
│   ├── mental_health/              # 🚧 Mental Health Module (Planned)
│   │   └── __init__.py
│   │
│   └── shared/                     # Shared utilities
│       ├── config.py               # Shared configuration
│       ├── logging.py              # Centralized logging
│       └── utils.py                # Common utilities
│
├── run_rehabilitation.py           # Run rehabilitation module
├── run_overcrowding.py             # Run overcrowding module (placeholder)
├── run_violence.py                 # Run violence module (placeholder)
├── run_mental_health.py            # Run mental health module (placeholder)
├── run_all.py                      # Run all modules
│
├── run.py                          # Deprecated (backward compatibility)
├── main.py                         # Deprecated (backward compatibility)
│
├── requirements.txt
├── .env.example
└── README.md
```

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Optional: Copy environment template
cp .env.example .env
```

### Run

```bash
# Start rehabilitation module
python run_rehabilitation.py

# Access API documentation
open http://localhost:8001/docs
```

## 📡 API Endpoints

### Rehabilitation Module (Port 8001) - ✅ Active

- `POST /api/v1/recommend` - Program recommendations
- `POST /api/v1/analyze/notes` - Counseling analysis  
- `GET /api/v1/scoring/early-release/{id}` - Early release scoring

**Interactive Docs**: http://localhost:8001/docs

**Quick Test**:
```bash
curl http://localhost:8001/health
```

## 📚 Documentation

For complete documentation including:
- Detailed API reference
- Configuration guide  
- Migration instructions
- Development best practices
- Troubleshooting

👉 **[Read DOCUMENTATION.md](DOCUMENTATION.md)**

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Follow the module structure
4. Add tests for new features
5. Submit a pull request

## 📄 License

[Your License]

---

**Version**: 2.0.0 | **Status**: Production Ready (Rehabilitation Module)
- Input validation via Pydantic
- Environment-based configuration
- No hardcoded credentials

## 📦 Dependencies

### Core Dependencies
- FastAPI - Web framework
- Pydantic - Data validation
- Uvicorn - ASGI server

### Optional ML Dependencies
Uncomment in `requirements.txt` when needed:
- scikit-learn
- xgboost
- transformers
- torch

## 🐳 Docker Support (Future)

Each module can be containerized:

```dockerfile
# Dockerfile for rehabilitation module
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY modules/rehabilitation modules/rehabilitation
COPY modules/shared modules/shared
CMD ["python", "run_rehabilitation.py"]
```

## 📚 Documentation

- `README.md` - This file (main documentation)
- `RESTRUCTURING_GUIDE.md` - Detailed restructuring explanation
- `MODULE_OVERVIEW.md` - Module-by-module breakdown
- `PROJECT_SUMMARY.md` - Quick reference guide

## 🤝 Contributing

1. Choose a module to implement
2. Follow the existing structure
3. Add comprehensive tests
4. Update documentation
5. Submit pull request

## 📄 License

[Your License Here]

## 👥 Authors

[Your Team Name]

---

## 🎯 Current Status Summary

| Component | Status | Details |
|-----------|--------|---------|
| Rehabilitation Module | ✅ **Active** | Fully functional with all endpoints |
| Overcrowding Module | 🚧 **Planned** | Folder structure ready |
| Violence Module | 🚧 **Planned** | Folder structure ready |
| Mental Health Module | 🚧 **Planned** | Folder structure ready |
| Shared Utilities | ✅ **Active** | Configuration, logging, utils |
| Documentation | ✅ **Complete** | Comprehensive guides available |

---

**Ready to build the future of prison management AI!** 🚀
