"""
Shared Logging Configuration
Centralized logging setup for all modules
"""

import logging
import sys
from modules.shared.config import shared_settings


def setup_module_logging(module_name: str):
    """
    Configure logging for a specific module
    
    Args:
        module_name: Name of the module (e.g., 'rehabilitation', 'overcrowding')
    
    Returns:
        Configured logger instance
    """
    
    logging.basicConfig(
        level=getattr(logging, shared_settings.LOG_LEVEL),
        format=f"%(asctime)s - {module_name} - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    logger = logging.getLogger(module_name)
    logger.setLevel(getattr(logging, shared_settings.LOG_LEVEL))
    
    return logger
