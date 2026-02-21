
import asyncio
import sys
import os
from pathlib import Path
from unittest.mock import MagicMock, patch
import json

# Add app directory to path to match service content
app_path = Path.cwd() / "ai-modules/modules/rehabilitation/app"
sys.path.insert(0, str(app_path))

# Mocking modules
sys.modules['joblib'] = MagicMock()
sklearn_mock = MagicMock()
sys.modules['sklearn'] = sklearn_mock
sys.modules['sklearn.ensemble'] = MagicMock()
sys.modules['sklearn.preprocessing'] = MagicMock()
sys.modules['sklearn.metrics'] = MagicMock()
sys.modules['sklearn.model_selection'] = MagicMock()
sys.modules['sklearn.linear_model'] = MagicMock()
sys.modules['xgboost'] = MagicMock()

# Mock settings
with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test", "OPENAI_MODEL": "gpt-3.5-turbo"}):
    from schemas.recommendation import RecommendationRequest
    from services.recommendation_service import recommendation_service
    from core.openai_client import openai_client
    from services.rag_service import rag_service

async def verify_detailed_plans():
    print("Verifying 'Next Level' AI Recommendations...\n")
    
    # Mock RAG
    # We need an awaitable mock for search since the service awaits it
    async def mock_search(*args, **kwargs):
        return [
            {"content": "NVQ Level 3 Carpentry is suitable for non-violent offenders. Centers: Kandy, Welikada.", "metadata": {"title": "Guidelines"}},
            {"content": "Bhavana (Meditation) recommended for anger management.", "metadata": {"title": "Cultural Program"}}
        ]
    
    rag_service.search = mock_search
    rag_service.format_context = MagicMock(return_value="NVQ Level 3 Carpentry available. Bhavana meditation recommended.")

    rag_service.search = mock_search
    rag_service.format_context = MagicMock(return_value="NVQ Level 3 Carpentry available. Bhavana meditation recommended.")

    # Mock OpenAI Plan Generation
    expected_plan = {
        "short_term_goals": ["Attend daily meditation", "Enroll in Carpentry NVQ"],
        "long_term_goals": ["Obtain NVQ Level 3 Certificate", "Secure job placement"],
        "weekly_schedule": [
            {"day": "Monday", "activity": "08:00 Carpentry Theory, 14:00 Bhavana Session"},
            {"day": "Tuesday", "activity": "08:00 Carpentry Practical, 16:00 Sports"}
        ],
        "key_milestones": [
            {"week": "Week 4", "milestone": "Complete safety training"},
            {"week": "Week 12", "milestone": "Final project submission"}
        ]
    }
    
    # Enable client
    openai_client.enabled = True
    
    # Patch the method using patch.object context manager would be best, but we are in async function.
    # Let's manually overwrite and force it to accept kwargs
    
    async def mock_generate_plan(inmate_data, context=""):
        print(f"   [GenAI] Generating personalized plan... (Context len: {len(context)})")
        return expected_plan

    # Print original method to debug
    print(f"Original method: {openai_client.generate_rehabilitation_plan}")
    
    # Force overwrite on the INSTANCE
    openai_client.generate_rehabilitation_plan = mock_generate_plan

    # Test Case: Youth Offender
    req_data = {
        "inmateId": "TEST001",
        "suitabilityGroup": "educational_deficit",
        "riskScore": 0.3,
        "profileFeatures": {
            "education_level": "Grade 8",
            "crime_type": "theft", 
            "age": 19,
            "background_summary": "School dropout due to poverty."
        }
    }
    
    request = RecommendationRequest(**req_data)
    
    try:
        response = await recommendation_service.generate_recommendations(request)
        
        print("\n=== Recommendation Result ===")
        print(f"Programs: {[p.programName for p in response.programs]}")
        print(f"Explanation: {response.explanation}")
        
        if response.structured_plan:
            print("\n=== AI-Generated Structured Plan (The 'Next Level' Feature) ===")
            print("Short Term Goals:", response.structured_plan.short_term_goals)
            print("Milestones:", json.dumps(response.structured_plan.key_milestones, indent=2))
            print("Weekly Schedule (Sample):", json.dumps(response.structured_plan.weekly_schedule[0], indent=2))
            print("\nVerification SUCCESS: Detailed plan generated!")
        else:
            print("\nFAILED: No structured plan returned.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_detailed_plans())
