"""
DEPRECATED: This file is kept for backward compatibility only.
Please use 'run.py' or 'python -m uvicorn run:app --reload' to start the server.

The application has been restructured into a modular architecture:
- app/api/ - API endpoints (routers)
- app/services/ - Business logic
- app/schemas/ - Pydantic models
- app/core/ - Configuration and utilities
- run.py - Entry point

To run the application:
    python run.py
    
Or with uvicorn directly:
    uvicorn run:app --host 0.0.0.0 --port 8001 --reload
"""

import sys
import warnings

warnings.warn(
    "main.py is deprecated. Use 'python run.py' or 'uvicorn run:app --reload' instead.",
    DeprecationWarning,
    stacklevel=2
)

if __name__ == "__main__":
    print("=" * 70)
    print("DEPRECATION WARNING")
    print("=" * 70)
    print("This file (main.py) is deprecated.")
    print("The application has been restructured into modules.")
    print()
    print("To run the application, use:")
    print("  python run.py")
    print()
    print("Or with uvicorn directly:")
    print("  uvicorn run:app --host 0.0.0.0 --port 8001 --reload")
    print("=" * 70)
    print()
    
    # Ask user if they want to start the new application
    response = input("Would you like to start the new modular application now? (y/n): ")
    if response.lower() == 'y':
        import uvicorn
        from app.main import create_app
        from app.core.config import settings
        
        app = create_app()
        uvicorn.run(
            app,
            host=settings.HOST,
            port=settings.PORT,
            log_level=settings.LOG_LEVEL.lower()
        )
    else:
        print("Please run 'python run.py' when you're ready.")
        sys.exit(0)
