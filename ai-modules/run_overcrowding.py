"""
Overcrowding Module Entry Point
Run this file to start the Overcrowding AI Service
"""

import sys
from pathlib import Path
import uvicorn

# Add modules to path
sys.path.insert(0, str(Path(__file__).parent))

from modules.overcrowding.main import create_app

app = create_app()

if __name__ == "__main__":
    PORT = 8002
    HOST = "0.0.0.0"
    print(f"Starting Overcrowding AI Service on port {PORT}")
    uvicorn.run(
        "run_overcrowding:app",
        host=HOST,
        port=PORT,
        reload=True
    )
