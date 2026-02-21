
import asyncio
import sys
import os
from pathlib import Path
from unittest.mock import MagicMock, patch
import json

# Add parent directory to path
sys.path.insert(0, str(Path.cwd() / "ai-modules/modules/rehabilitation"))

# Mocking modules
sys.modules['joblib'] = MagicMock()

# Mock sklearn and its submodules
sklearn_mock = MagicMock()
sys.modules['sklearn'] = sklearn_mock
sys.modules['sklearn.ensemble'] = MagicMock()
sys.modules['sklearn.preprocessing'] = MagicMock()
sys.modules['sklearn.metrics'] = MagicMock()
sys.modules['sklearn.model_selection'] = MagicMock()
sys.modules['sklearn.linear_model'] = MagicMock()

# Mock xgboost
sys.modules['xgboost'] = MagicMock()

# Mock settings
with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test", "OPENAI_MODEL": "gpt-3.5-turbo"}):
    from app.schemas.dataset import EligibilityAssessmentRequest
    from app.api import predictions
    from app.core.openai_client import openai_client

# Define Test Scenarios
SCENARIOS = [
    {
        "name": "Scenario 1: Corporate Fraud (Standard)",
        "data": {
            "firstName": "Saman", "lastName": "Perera",
            "caseType": "FRAUD",
            "crimeDescription": "Embezzlement of 10M LKR from bank",
            "behavior_score": 85.0, "discipline_score": 90.0, "risk_score": 0.1,
            "riskLevel": "LOW",
            "violentHistory": False,
            "medicalConditions": []
        }
    },
    {
        "name": "Scenario 2: Substance Abuse & Medical Needs",
        "data": {
            "firstName": "Kamal", "lastName": "Silva",
            "caseType": "NARCOTICS",
            "crimeDescription": "Possession of heroin for distribution",
            "behavior_score": 65.0, "discipline_score": 70.0, "risk_score": 0.5,
            "riskLevel": "MEDIUM",
            "violentHistory": False,
            "medicalConditions": ["Diabetes Type 2", "Withdrawal Symptoms"],
            "has_substance_abuse": True
        }
    },
    {
        "name": "Scenario 3: Violent Offender (High Risk)",
        "data": {
            "firstName": "Sunil", "lastName": "Fernando",
            "caseType": "ASSAULT",
            "crimeDescription": "Aggravated assault causing grievous hurt",
            "behavior_score": 45.0, "discipline_score": 40.0, "risk_score": 0.85,
            "riskLevel": "HIGH",
            "violentHistory": True,
            "medicalConditions": [],
            "institutional_violations": 4
        }
    }
]

async def run_scenarios():
    print("Running Multi-Scenario Accuracy Test...\n")
    
    # Mock OpenAI to return dummy reasoning but print received context
    async def mock_generate(*args, **kwargs):
        context = kwargs.get('context', '')
        print(f"   [RAG Context Used]: {context[:100]}..." if context else "   [RAG Context Used]: None")
        return f"AI Analysis based on: {kwargs.get('risk_factors')} and context."

    openai_client.generate_eligibility_reasoning = mock_generate
    openai_client.enabled = True

    for scenario in SCENARIOS:
        print(f"=== {scenario['name']} ===")
        print(f"Input: {json.dumps(scenario['data'], indent=2)}")
        
        request = EligibilityAssessmentRequest(**scenario['data'])
        
        try:
            response = await predictions.assess_rehab_eligibility(request)
            print(f"Result: {'ELIGIBLE' if response.eligible else 'NOT ELIGIBLE'}")
            print(f"Score: {response.eligibility_score:.2f}")
            print(f"Recommended: {response.recommended_programs}")
            print("-" * 50 + "\n")
        except Exception as e:
            print(f"Error: {e}\n")

if __name__ == "__main__":
    asyncio.run(run_scenarios())
