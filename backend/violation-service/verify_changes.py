import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app.services.violence_detector import ViolenceDetectorService, detector
    from app.api.endpoints import stream
    print("Backend imports successful")
except Exception as e:
    print(f"Import failed: {e}")
    sys.exit(1)
