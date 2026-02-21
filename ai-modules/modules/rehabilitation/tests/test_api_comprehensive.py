"""
Comprehensive API Testing Script
Tests all rehabilitation AI endpoints with uploaded datasets
"""

import requests
import json
from pathlib import Path
import pandas as pd

BASE_URL = "http://localhost:8001/api/v1"

def print_section(title):
    """Print formatted section header"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")


def test_health():
    """Test health endpoint"""
    print_section("1. HEALTH CHECK")
    response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.status_code == 200


def test_generate_datasets():
    """Test dataset generation"""
    print_section("2. GENERATE SAMPLE DATASETS")
    response = requests.post(
        f"{BASE_URL}/upload/generate-sample",
        params={"n_inmates": 100}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Generated datasets:")
        for dataset_type, count in result['datasets_generated'].items():
            print(f"  - {dataset_type}: {count} records")
        print(f"Total records: {result['total_records']}")
    return response.status_code == 200


def test_dataset_status():
    """Test dataset status check"""
    print_section("3. DATASET STATUS")
    response = requests.get(f"{BASE_URL}/upload/status")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        status = response.json()
        print(f"Loaded datasets: {status['loaded_datasets']}/{status['total_dataset_types']}")
        for dataset, info in status['datasets'].items():
            if info['loaded']:
                print(f"\n  {dataset}:")
                print(f"    Records: {info['record_count']}")
                print(f"    Memory: {info['memory_usage']}")
    return response.status_code == 200


def test_get_sample_inmates():
    """Get sample inmates for testing predictions"""
    print_section("4. GET SAMPLE INMATES")
    response = requests.get(
        f"{BASE_URL}/upload/dataset/inmate_profiles",
        params={"limit": 5}
    )
    
    if response.status_code == 200:
        data = response.json()
        inmates = data['data']
        print(f"Retrieved {len(inmates)} inmates:")
        for inmate in inmates:
            print(f"\n  ID: {inmate['inmate_id']}")
            print(f"  Name: {inmate['first_name']} {inmate['last_name']}")
            print(f"  Behavior: {inmate['behavior_score']:.1f}")
            print(f"  Discipline: {inmate['discipline_score']:.1f}")
            print(f"  Risk: {inmate['risk_score']:.2f}")
            print(f"  Programs: {inmate['programs_completed']}")
        return [inmate['inmate_id'] for inmate in inmates]
    return []


def test_models_status():
    """Test models status"""
    print_section("5. PREDICTION MODELS STATUS")
    response = requests.get(f"{BASE_URL}/predictions/models/status")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        status = response.json()
        print(f"Models loaded: {status['total_models']}")
        for model, loaded in status['models_available'].items():
            print(f"  {model}: {'✓ Loaded' if loaded else '✗ Not loaded'}")
    return response.status_code == 200


def test_eligibility_prediction(inmate_id):
    """Test rehabilitation eligibility prediction"""
    print_section(f"6. ELIGIBILITY PREDICTION - {inmate_id}")
    response = requests.post(
        f"{BASE_URL}/predictions/eligibility",
        params={"inmate_id": inmate_id}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\nEligibility Assessment:")
        print(f"  Inmate: {result['inmate_id']}")
        print(f"  Eligible: {result['eligible']}")
        print(f"  Score: {result['eligibility_score']:.2%}")
        print(f"  Confidence: {result['confidence']:.2%}")
        print(f"\n  Recommended Programs:")
        for program in result['recommended_programs']:
            print(f"    - {program}")
        print(f"\n  Risk Factors:")
        for factor in result['risk_factors']:
            print(f"    - {factor}")
        print(f"\n  Strengths:")
        for strength in result['strengths']:
            print(f"    + {strength}")
        print(f"\n  Reasoning: {result['reasoning']}")
    return response.status_code == 200


def test_early_release_prediction(inmate_id):
    """Test early release prediction"""
    print_section(f"7. EARLY RELEASE PREDICTION - {inmate_id}")
    response = requests.post(
        f"{BASE_URL}/predictions/early-release",
        params={"inmate_id": inmate_id}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\nEarly Release Assessment:")
        print(f"  Inmate: {result['inmate_id']}")
        print(f"  Prediction: {result['prediction']}")
        print(f"  Probability: {result['probability']:.2%}")
        print(f"  Confidence: {result['confidence']:.2%}")
        print(f"  Recommendation: {result['recommendation']}")
        if result['predicted_date']:
            print(f"  Estimated Release: {result['predicted_date']}")
        
        print(f"\n  Supporting Factors:")
        for factor in result['factors_supporting']:
            print(f"    + {factor['factor']}: {factor['value']}")
        
        print(f"\n  Opposing Factors:")
        for factor in result['factors_against']:
            print(f"    - {factor['factor']}: {factor['value']}")
        
        print(f"\n  Reasoning: {result['reasoning']}")
    return response.status_code == 200


def test_industrial_training_prediction(inmate_id):
    """Test industrial training prediction"""
    print_section(f"8. INDUSTRIAL TRAINING PREDICTION - {inmate_id}")
    response = requests.post(
        f"{BASE_URL}/predictions/industrial-training",
        params={"inmate_id": inmate_id}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\nIndustrial Training Assessment:")
        print(f"  Inmate: {result['inmate_id']}")
        print(f"  Prediction: {result['prediction']}")
        print(f"  Probability: {result['probability']:.2%}")
        print(f"  Top Recommendation: {result['recommendation']}")
        print(f"\n  Reasoning: {result['reasoning']}")
    return response.status_code == 200


def test_home_leave_prediction(inmate_id):
    """Test home leave prediction"""
    print_section(f"9. HOME LEAVE PREDICTION - {inmate_id}")
    response = requests.post(
        f"{BASE_URL}/predictions/home-leave",
        params={"inmate_id": inmate_id}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\nHome Leave Assessment:")
        print(f"  Inmate: {result['inmate_id']}")
        print(f"  Prediction: {result['prediction']}")
        print(f"  Probability: {result['probability']:.2%}")
        print(f"  Leave Type: {result['recommendation']}")
        
        print(f"\n  Supporting Factors:")
        for factor in result['factors_supporting']:
            print(f"    + {factor['factor']}: {factor['value']}")
        
        print(f"\n  Opposing Factors:")
        for factor in result['factors_against']:
            print(f"    - {factor['factor']}: {factor['value']}")
        
        print(f"\n  Reasoning: {result['reasoning']}")
    return response.status_code == 200


def test_batch_assessment():
    """Test batch eligibility assessment"""
    print_section("10. BATCH ELIGIBILITY ASSESSMENT")
    response = requests.get(
        f"{BASE_URL}/predictions/batch-assessment",
        params={"min_behavior_score": 65, "limit": 10}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\nBatch Assessment Results:")
        print(f"  Total Assessed: {result['total_assessed']}")
        print(f"  Eligible Count: {result['eligible_count']}")
        print(f"\n  Top 10 Candidates:")
        for i, inmate in enumerate(result['inmates'][:10], 1):
            print(f"\n    {i}. {inmate['name']} ({inmate['inmate_id']})")
            print(f"       Eligibility: {inmate['eligibility_score']:.2%}")
            print(f"       Behavior: {inmate['behavior_score']:.1f}")
            print(f"       Facility: {inmate['facility']}")
    return response.status_code == 200


def test_dataset_statistics():
    """Test dataset statistics"""
    print_section("11. DATASET STATISTICS")
    response = requests.get(
        f"{BASE_URL}/upload/statistics",
        params={"dataset_type": "inmate_profiles"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print(f"\nInmate Profiles Statistics:")
        print(f"  Total Records: {stats['total_records']}")
        print(f"\n  Numeric Column Statistics:")
        for col, values in list(stats['statistics'].items())[:5]:
            print(f"\n    {col}:")
            print(f"      Mean: {values['mean']:.2f}")
            print(f"      Min: {values['min']:.2f}")
            print(f"      Max: {values['max']:.2f}")
    return response.status_code == 200


def main():
    """Run all API tests"""
    print("\n" + "="*80)
    print("  REHABILITATION AI MODULE - COMPREHENSIVE API TEST")
    print("="*80)
    
    results = {}
    
    # Test 1: Health
    try:
        results['health'] = test_health()
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        results['health'] = False
    
    # Test 2: Generate datasets
    try:
        results['generate'] = test_generate_datasets()
    except Exception as e:
        print(f"❌ Dataset generation failed: {e}")
        results['generate'] = False
    
    # Test 3: Dataset status
    try:
        results['status'] = test_dataset_status()
    except Exception as e:
        print(f"❌ Status check failed: {e}")
        results['status'] = False
    
    # Test 4: Get sample inmates
    try:
        sample_inmates = test_get_sample_inmates()
        results['samples'] = len(sample_inmates) > 0
    except Exception as e:
        print(f"❌ Get samples failed: {e}")
        results['samples'] = False
        sample_inmates = []
    
    # Test 5: Models status
    try:
        results['models'] = test_models_status()
    except Exception as e:
        print(f"❌ Models status failed: {e}")
        results['models'] = False
    
    # If we have sample inmates, test predictions
    if sample_inmates:
        test_inmate = sample_inmates[0]
        
        # Test 6: Eligibility
        try:
            results['eligibility'] = test_eligibility_prediction(test_inmate)
        except Exception as e:
            print(f"❌ Eligibility prediction failed: {e}")
            results['eligibility'] = False
        
        # Test 7: Early release
        try:
            results['early_release'] = test_early_release_prediction(test_inmate)
        except Exception as e:
            print(f"❌ Early release prediction failed: {e}")
            results['early_release'] = False
        
        # Test 8: Industrial training
        try:
            results['training'] = test_industrial_training_prediction(test_inmate)
        except Exception as e:
            print(f"❌ Industrial training prediction failed: {e}")
            results['training'] = False
        
        # Test 9: Home leave
        try:
            results['home_leave'] = test_home_leave_prediction(test_inmate)
        except Exception as e:
            print(f"❌ Home leave prediction failed: {e}")
            results['home_leave'] = False
    
    # Test 10: Batch assessment
    try:
        results['batch'] = test_batch_assessment()
    except Exception as e:
        print(f"❌ Batch assessment failed: {e}")
        results['batch'] = False
    
    # Test 11: Statistics
    try:
        results['statistics'] = test_dataset_statistics()
    except Exception as e:
        print(f"❌ Statistics failed: {e}")
        results['statistics'] = False
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(results.values())
    total = len(results)
    print(f"\nTests Passed: {passed}/{total}")
    print(f"Success Rate: {passed/total*100:.1f}%\n")
    
    for test, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}  {test}")
    
    print("\n" + "="*80 + "\n")


if __name__ == "__main__":
    main()
