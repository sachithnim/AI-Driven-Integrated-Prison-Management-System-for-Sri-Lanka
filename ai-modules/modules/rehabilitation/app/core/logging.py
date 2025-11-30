"""
Logging configuration
"""

import logging
import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from core.config import settings
from modules.shared.logging import setup_module_logging


# Use shared logging configuration
logger = setup_module_logging(settings.MODULE_NAME)
