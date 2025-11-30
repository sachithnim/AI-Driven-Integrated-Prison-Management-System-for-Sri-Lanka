"""
Run All Modules
Start all AI modules simultaneously (for development/testing)
"""

import sys
from pathlib import Path
import subprocess
import time

sys.path.insert(0, str(Path(__file__).parent))

from modules.shared.config import shared_settings

MODULES = [
    ("Rehabilitation", "run_rehabilitation.py", shared_settings.REHABILITATION_PORT),
    ("Overcrowding", "run_overcrowding.py", shared_settings.OVERCROWDING_PORT),
    ("Violence", "run_violence.py", shared_settings.VIOLENCE_PORT),
    ("Mental Health", "run_mental_health.py", shared_settings.MENTAL_HEALTH_PORT),
]

if __name__ == "__main__":
    print("=" * 70)
    print("PRISON MANAGEMENT AI SYSTEM - ALL MODULES")
    print("=" * 70)
    print()
    print("Available Modules:")
    for name, script, port in MODULES:
        print(f"  • {name:20} → Port {port} → {script}")
    print()
    print("=" * 70)
    print()
    
    response = input("Start all modules? (y/n): ")
    
    if response.lower() == 'y':
        print("\nStarting modules...")
        print("Note: Only Rehabilitation module is fully implemented.")
        print("Other modules will show placeholder messages.")
        print()
        
        # For now, just run rehabilitation
        print("Starting Rehabilitation module...")
        subprocess.run([sys.executable, "run_rehabilitation.py"])
    else:
        print("\nTo run individual modules:")
        for name, script, port in MODULES:
            print(f"  python {script}")
