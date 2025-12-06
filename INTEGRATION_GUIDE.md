# Integration Guide: Rehabilitation AI Module with Java Backend

## Overview

This guide explains how to integrate the Python AI Module with the Java Rehabilitation Service.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React/Vue)                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              API Gateway (Spring Boot)                           │
│              Port: 4004                                          │
└──────────────────────┬──────────────────────┬──────────────────┘
                       │                       │
           ┌───────────▼──────────┐  ┌────────▼──────────┐
           │  Rehabilitation      │  │  Inmate Service   │
           │  Service (Java)      │  │  (Java)           │
           │  Port: 8003          │  │  Port: 8002       │
           └───────────┬──────────┘  └───────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Rehabilitation AI Service   │
        │  (Python/FastAPI)            │
        │  Port: 8001                  │
        │                              │
        │  • XGBoost Recommendations   │
        │  • NLP Analysis              │
        │  • Early Release Prediction  │
        └──────────────────────────────┘
```

## Configuration

### 1. Environment Setup

**Java Service Configuration** (`application.properties`):
```properties
# AI Service Configuration
ai.service.url=http://localhost:8001
ai.service.connect-timeout=5000
ai.service.read-timeout=30000
```

Or in YAML format (`application.yml`):
```yaml
ai:
  service:
    url: http://localhost:8001
    connect-timeout: 5000
    read-timeout: 30000
```

**Python Service Configuration** (`.env`):
```bash
HOST=0.0.0.0
REHABILITATION_PORT=8001
AUTH_SERVICE_URL=http://localhost:4005
JWT_SECRET_KEY=your-production-secret
REQUIRE_AUTH=false  # Set to true if using authentication
```

### 2. Start Services in Order

```bash
# 1. Start Auth Service (optional, required if REQUIRE_AUTH=true)
cd backend/auth-service
./mvnw spring-boot:run

# 2. Start Python Rehabilitation AI Module
cd ai-modules/modules/rehabilitation
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# 3. Start Java Rehabilitation Service
cd backend/rehabilitation-service
./mvnw spring-boot:run

# 4. Start Inmate Service (dependency)
cd backend/inmate-service
./mvnw spring-boot:run

# 5. Start API Gateway
cd backend/api-gateway
./mvnw spring-boot:run
```

## API Integration Points

### 1. Program Recommendations

**Java Call:**
```java
// From RehabilitationController.java
AIRecommendationRequest request = new AIRecommendationRequest();
request.setInmateId("INM00123");
request.setSuitabilityGroup("substance_abuse");
request.setRiskScore(0.65);

AIRecommendationResponse response = aiServiceClient.getRecommendations(request);
```

**Python Service:**
```
POST http://localhost:8001/api/v1/recommend
Content-Type: application/json

{
  "inmateId": "INM00123",
  "suitabilityGroup": "substance_abuse",
  "riskScore": 0.65,
  "profileFeatures": {
    "completion_percentage": 75,
    "attendance_rate": 85,
    "behavioral_score": 70
  }
}
```

### 2. Counseling Notes Analysis

**Java Call:**
```java
String analysis = aiServiceClient.analyzeCounselingNotes("INM00123", notesText);
```

**Python Service:**
```
POST http://localhost:8001/api/v1/analyze
Content-Type: application/json

{
  "inmateId": "INM00123",
  "text": "Inmate showing good progress in rehabilitation..."
}
```

### 3. Early Release Score

**Java Call:**
```java
Double score = aiServiceClient.calculateEarlyReleaseScore("INM00123");
```

**Python Service:**
```
GET http://localhost:8001/api/v1/scoring/early-release/INM00123
```

## Data Flow Example

### Use Case: Get Program Recommendations for Inmate

1. **Frontend Request**:
   ```
   GET /api/inmates/INM00123/rehabilitation/recommendations
   ```

2. **API Gateway Routes to Java Service**:
   ```
   GET http://localhost:8003/api/inmates/INM00123/rehabilitation/recommendations
   ```

3. **Java Rehabilitation Service**:
   - Fetches inmate profile from Inmate Service
   - Prepares AIRecommendationRequest with extracted features
   - Calls Python AI Service

4. **Python AI Module**:
   - Receives request with inmate profile
   - XGBoost model predicts suitable programs
   - Returns top 3 recommendations with scores

5. **Java Service**:
   - Stores recommendations in database
   - Returns to frontend with additional metadata

6. **Frontend**:
   - Displays program recommendations to user

## Data Mapping

### Inmate Profile → AI Service

**Java Model**:
```java
public class InmateResponseDTO {
    private String inmateId;
    private int age;
    private String gender;
    private String educationLevel;
    private int sentenceLengthMonths;
    private int timeServedMonths;
    // ... more fields
}
```

**Mapped to Python Request**:
```python
request = RecommendationRequest(
    inmateId=inmate.inmateId,
    suitabilityGroup=inmate.getSuitabilityGroup(),  # Calculated or stored
    riskScore=calculateRiskScore(inmate),  # From Java service
    profileFeatures={
        'completion_percentage': programCompletionRate,
        'attendance_rate': attendanceRate,
        'behavioral_score': behavioralScore
    }
)
```

## Authentication

### Enable JWT Authentication

1. **Configure Auth Service in Python**:
```bash
REQUIRE_AUTH=true
AUTH_SERVICE_URL=http://localhost:4005
JWT_SECRET_KEY=shared-secret-with-auth-service
```

2. **Java Service Includes Token in Request**:
```java
HttpHeaders headers = new HttpHeaders();
headers.setContentType(MediaType.APPLICATION_JSON);
headers.set("Authorization", "Bearer " + token);

HttpEntity<AIRecommendationRequest> entity = new HttpEntity<>(request, headers);
```

3. **Python Service Validates Token**:
```python
@app.post("/api/v1/recommend")
async def generate_recommendations(
    request: RecommendationRequest,
    authorization: str = Header(None)
):
    if authorization:
        token = authorization.replace("Bearer ", "")
        validation = auth_service.validate_token(token)
        if not validation["valid"]:
            raise HTTPException(status_code=401, detail="Unauthorized")
    # Continue with recommendation logic
```

## Error Handling

### Network Errors

**Java Implementation** (AIServiceClient.java):
```java
try {
    AIRecommendationResponse response = restTemplate.postForObject(url, entity, AIRecommendationResponse.class);
    return response;
} catch (Exception e) {
    log.error("Error calling AI service: {}", e.getMessage(), e);
    return getFallbackRecommendation(request);  // Uses rule-based logic
}
```

### Model Unavailable

**Python Implementation**:
```python
if self.model is None or self.scaler is None:
    logger.warning("ML model not available, using statistical estimation")
    score = self._predict_statistical(features)
else:
    score = self._predict_with_model(features)
```

## Docker Compose

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  auth-service:
    image: auth-service:latest
    ports:
      - "4005:4005"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/prison_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: password

  rehabilitation-ai:
    image: rehabilitation-ai:latest
    ports:
      - "8001:8001"
    environment:
      AUTH_SERVICE_URL: http://auth-service:4005
      REQUIRE_AUTH: "false"
      REHABILITATION_PORT: 8001
    depends_on:
      - auth-service

  rehabilitation-service:
    image: rehabilitation-service:latest
    ports:
      - "8003:8003"
    environment:
      AI_SERVICE_URL: http://rehabilitation-ai:8001
      AUTH_SERVICE_URL: http://auth-service:4005
    depends_on:
      - rehabilitation-ai
      - auth-service

  inmate-service:
    image: inmate-service:latest
    ports:
      - "8002:8002"
    depends_on:
      - postgres

  api-gateway:
    image: api-gateway:latest
    ports:
      - "4004:4004"
    depends_on:
      - rehabilitation-service
      - inmate-service

  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: prison_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
```

## Testing Integration

### 1. Test AI Service Directly

```bash
curl -X POST http://localhost:8001/api/v1/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "inmateId": "INM00123",
    "suitabilityGroup": "substance_abuse",
    "riskScore": 0.65,
    "profileFeatures": {}
  }'
```

### 2. Test Through Java Service

```bash
curl -X GET http://localhost:4004/api/inmates/INM00123/recommendations
```

### 3. Test Data Flow

```python
# Python test script
import requests

# 1. Get inmate data
inmate = requests.get("http://localhost:4004/api/inmates/INM00123").json()

# 2. Call AI service directly
response = requests.post(
    "http://localhost:8001/api/v1/recommend",
    json={
        "inmateId": inmate["inmateId"],
        "suitabilityGroup": inmate["suitabilityGroup"],
        "riskScore": inmate["riskScore"],
        "profileFeatures": {}
    }
)

print(response.json())
```

## Monitoring

### Health Checks

```bash
# Python service
curl http://localhost:8001/health

# Java service
curl http://localhost:8003/actuator/health

# API Gateway
curl http://localhost:4004/health
```

### Logs

```bash
# Python service logs
tail -f logs/rehabilitation_*.log

# Java service logs
docker logs rehabilitation-service

# Combined logs with docker
docker-compose logs -f
```

## Performance Considerations

### Caching

- **Model Caching**: ML models loaded once on startup
- **Response Caching**: Consider adding Redis for frequent queries
- **Database Caching**: Cache inmate profiles

### Batch Processing

For processing multiple inmates:

```bash
POST /api/v1/recommend/batch
[
  {"inmateId": "INM001", ...},
  {"inmateId": "INM002", ...},
  ...
]
```

### Load Balancing

Deploy multiple AI service instances:

```yaml
rehabilitation-ai-1:
  image: rehabilitation-ai:latest
  ports:
    - "8001:8001"

rehabilitation-ai-2:
  image: rehabilitation-ai:latest
  ports:
    - "8002:8001"

nginx:
  image: nginx:latest
  ports:
    - "8000:80"
  # Configure to load balance between AI services
```

## Troubleshooting

### Connection Issues

```bash
# Check if Python service is running
netstat -an | grep 8001

# Check if Java service can reach Python service
curl http://localhost:8001/health

# Check network connectivity
docker network inspect prison-network
```

### Model Loading Issues

```bash
# SSH into Python container
docker exec -it rehabilitation-ai bash

# Check if models exist
ls -la app/models/

# Initialize models
python init_module.py --test
```

### Authentication Issues

```bash
# Check JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8001/api/v1/data/inmate-sample

# Check token validation
python -c "
from app.utils.auth_utils import jwt_handler
jwt_handler.verify_token('YOUR_TOKEN')
"
```

## Next Steps

1. **Deploy to Production**: Use Kubernetes or Docker Swarm
2. **Add Monitoring**: Prometheus + Grafana
3. **Set Up CI/CD**: GitHub Actions or Jenkins
4. **Fine-tune Models**: Train on real prison data
5. **Add Analytics**: Track recommendation usage
6. **Implement Feedback Loop**: Improve models with user feedback

---

**Last Updated**: December 2025
**Version**: 1.0.0
