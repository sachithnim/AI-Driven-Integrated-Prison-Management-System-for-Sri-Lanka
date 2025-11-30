"""
Unit tests for the API endpoints

Run tests with:
    pytest tests/

Install pytest:
    pip install pytest pytest-asyncio httpx
"""

import pytest
from fastapi.testclient import TestClient
from app.main import create_app

# Create test client
app = create_app()
client = TestClient(app)


class TestHealthEndpoints:
    """Test health check endpoints"""
    
    def test_root_endpoint(self):
        """Test root endpoint returns service info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert "service" in data
        assert "version" in data
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestRecommendationEndpoints:
    """Test recommendation API endpoints"""
    
    def test_recommend_substance_abuse(self):
        """Test recommendation for substance abuse group"""
        payload = {
            "inmateId": "TEST001",
            "profileFeatures": {},
            "suitabilityGroup": "substance_abuse",
            "riskScore": 0.75
        }
        response = client.post("/api/v1/recommend", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "programs" in data
        assert "explanation" in data
        assert "confidence" in data
        assert len(data["programs"]) > 0
        
        # Check first program
        program = data["programs"][0]
        assert "programType" in program
        assert "programName" in program
        assert "durationWeeks" in program
        assert "score" in program
        assert "reason" in program
    
    def test_recommend_mental_health(self):
        """Test recommendation for mental health group"""
        payload = {
            "inmateId": "TEST002",
            "profileFeatures": {},
            "suitabilityGroup": "mental_health",
            "riskScore": 0.5
        }
        response = client.post("/api/v1/recommend", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["programs"]) > 0


class TestAnalysisEndpoints:
    """Test analysis API endpoints"""
    
    def test_analyze_positive_notes(self):
        """Test analyzing notes with positive sentiment"""
        payload = {
            "inmateId": "TEST001",
            "text": "Inmate showed good progress today. Very cooperative."
        }
        response = client.post("/api/v1/analyze/notes", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "sentiment" in data
        assert "keyPoints" in data
        assert data["sentiment"] == "positive"
    
    def test_analyze_negative_notes(self):
        """Test analyzing notes with negative sentiment"""
        payload = {
            "inmateId": "TEST002",
            "text": "Inmate was aggressive and showed resistance."
        }
        response = client.post("/api/v1/analyze/notes", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["sentiment"] == "negative"


class TestScoringEndpoints:
    """Test scoring API endpoints"""
    
    def test_early_release_score(self):
        """Test early release score calculation"""
        response = client.get("/api/v1/scoring/early-release/TEST001")
        assert response.status_code == 200
        data = response.json()
        
        assert "inmateId" in data
        assert "score" in data
        assert "recommendation" in data
        assert 0 <= data["score"] <= 1
        assert data["recommendation"] in ["eligible", "not_recommended"]
    
    def test_models_info(self):
        """Test models information endpoint"""
        response = client.get("/api/v1/scoring/models/info")
        assert response.status_code == 200
        data = response.json()
        
        assert "models" in data
        assert len(data["models"]) > 0
        
        # Check first model
        model = data["models"][0]
        assert "name" in model
        assert "type" in model
        assert "status" in model
        assert "note" in model


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
