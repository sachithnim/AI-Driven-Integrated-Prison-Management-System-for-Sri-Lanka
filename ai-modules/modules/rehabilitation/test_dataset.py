
import sys
from pathlib import Path
sys.path.insert(0, str(Path.cwd() / "ai-modules/modules/rehabilitation"))

from app.utils.realistic_dataset_generator import generate_rehabilitation_datasets
import pandas as pd

try:
    print("Generating sample dataset with Sri Lankan context...")
    datasets = generate_rehabilitation_datasets(n_inmates=5, save=False)
    
    inmates = datasets['inmate_profiles']
    print("\n--- Sample Inmate Profile ---")
    sample = inmates.iloc[0]
    print(f"ID: {sample['inmate_id']}")
    print(f"Education: {sample['education_level']}")
    print(f"Background: {sample['background_summary']}")
    print(f"Crime: {sample['crime_type']}")
    
    print("\nAll generated columns:", inmates.columns.tolist())
    print("\nVerification Successful!")
except Exception as e:
    print(f"Verification Failed: {e}")
    import traceback
    traceback.print_exc()
