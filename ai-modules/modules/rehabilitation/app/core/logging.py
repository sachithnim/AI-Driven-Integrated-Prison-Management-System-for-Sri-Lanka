"""
Logging configuration
"""

import logging
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

# Import with fallbacks
try:
    from core.config import settings
    from modules.shared.logging import setup_module_logging
    logger = setup_module_logging(settings.MODULE_NAME)
except (ImportError, ModuleNotFoundError):
    # Fallback logging setup
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger("rehabilitation")
