"""
Shared Utilities
Common utility functions used across all modules
"""

from typing import Dict, Any
import json


def format_response(data: Any, message: str = "Success") -> Dict[str, Any]:
    """
    Format API response in a consistent way
    
    Args:
        data: Response data
        message: Response message
    
    Returns:
        Formatted response dictionary
    """
    return {
        "status": "success",
        "message": message,
        "data": data
    }


def format_error(error: str, details: Any = None) -> Dict[str, Any]:
    """
    Format error response in a consistent way
    
    Args:
        error: Error message
        details: Additional error details
    
    Returns:
        Formatted error dictionary
    """
    response = {
        "status": "error",
        "error": error
    }
    if details:
        response["details"] = details
    return response


def serialize_model_output(model_output: Any) -> Dict[str, Any]:
    """
    Serialize ML model output to JSON-compatible format
    
    Args:
        model_output: Output from ML model
    
    Returns:
        JSON-serializable dictionary
    """
    # Add serialization logic here
    # Handle numpy arrays, tensors, etc.
    return model_output
