"""
DEPRECATED: Main entry point (backward compatibility)
Please use module-specific run files:
  - run_rehabilitation.py
  - run_overcrowding.py (placeholder)
  - run_violence.py (placeholder)
  - run_mental_health.py (placeholder)
  - run_all.py (run all modules)
"""

import sys
import warnings

warnings.warn(
    "run.py is deprecated. Use 'python run_rehabilitation.py' or 'python run_all.py' instead.",
    DeprecationWarning,
    stacklevel=2
)

if __name__ == "__main__":
    print("=" * 70)
    print("DEPRECATION WARNING")
    print("=" * 70)
    print("This file (run.py) is deprecated.")
    print("The project has been restructured into multiple modules.")
    print()
    print("To run modules:")
    print("  python run_rehabilitation.py    # Rehabilitation module (Port 8001)")
    print("  python run_overcrowding.py      # Overcrowding module (Port 8002)")
    print("  python run_violence.py          # Violence module (Port 8003)")
    print("  python run_mental_health.py     # Mental Health module (Port 8004)")
    print("  python run_all.py               # All modules")
    print("=" * 70)
    print()
    
    response = input("Would you like to start the Rehabilitation module now? (y/n): ")
    if response.lower() == 'y':
        import subprocess
        subprocess.run([sys.executable, "run_rehabilitation.py"])
    else:
        print("Please run 'python run_rehabilitation.py' when you're ready.")
        sys.exit(0)
