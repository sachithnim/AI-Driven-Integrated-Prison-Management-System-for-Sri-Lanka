"""
JWT Authentication utilities
Integrates with Auth Service for token validation
"""

import jwt
import os
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from functools import lru_cache
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.logging import logger


class JWTConfig:
    """JWT Configuration"""
    
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
        self.algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.expiration_hours = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    @property
    def expiration_delta(self) -> timedelta:
        return timedelta(hours=self.expiration_hours)


class JWTHandler:
    """Handles JWT token creation, validation, and claims extraction"""
    
    def __init__(self, config: Optional[JWTConfig] = None):
        self.config = config or JWTConfig()
        logger.info(f"JWTHandler initialized with algorithm: {self.config.algorithm}")
    
    def create_token(
        self,
        subject: str,
        roles: list = None,
        additional_claims: dict = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT token
        
        Args:
            subject: Subject (typically user ID)
            roles: List of user roles
            additional_claims: Additional claims to include
            expires_delta: Custom expiration time
            
        Returns:
            Encoded JWT token
        """
        
        if expires_delta is None:
            expires_delta = self.config.expiration_delta
        
        expires = datetime.utcnow() + expires_delta
        
        payload = {
            "sub": subject,
            "exp": expires,
            "iat": datetime.utcnow(),
            "roles": roles or [],
        }
        
        if additional_claims:
            payload.update(additional_claims)
        
        token = jwt.encode(
            payload,
            self.config.secret_key,
            algorithm=self.config.algorithm
        )
        
        logger.debug(f"Token created for subject: {subject}")
        return token
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode a JWT token
        
        Args:
            token: JWT token to verify
            
        Returns:
            Decoded token claims
            
        Raises:
            jwt.InvalidTokenError: If token is invalid
        """
        
        try:
            payload = jwt.decode(
                token,
                self.config.secret_key,
                algorithms=[self.config.algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            raise
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise
    
    def extract_claims(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Extract claims from token without verification (unsafe)
        Used only for debugging
        
        Args:
            token: JWT token
            
        Returns:
            Decoded claims or None if invalid
        """
        try:
            return jwt.decode(token, options={"verify_signature": False})
        except Exception as e:
            logger.error(f"Error extracting claims: {e}")
            return None
    
    def get_subject(self, token: str) -> Optional[str]:
        """Get subject from verified token"""
        try:
            payload = self.verify_token(token)
            return payload.get("sub")
        except Exception:
            return None
    
    def get_roles(self, token: str) -> list:
        """Get roles from verified token"""
        try:
            payload = self.verify_token(token)
            return payload.get("roles", [])
        except Exception:
            return []


class AuthService:
    """Service to integrate with Auth Service for token validation"""
    
    def __init__(self):
        self.jwt_handler = JWTHandler()
        self.auth_service_url = os.getenv("AUTH_SERVICE_URL", "http://localhost:4005")
        logger.info(f"AuthService initialized with auth service URL: {self.auth_service_url}")
    
    def validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate token (locally with JWT or remotely with Auth Service)
        
        Args:
            token: JWT token
            
        Returns:
            Validation result with claims
        """
        
        try:
            # First try local validation
            claims = self.jwt_handler.verify_token(token)
            return {
                "valid": True,
                "claims": claims,
                "method": "local"
            }
        except Exception as e:
            logger.warning(f"Local validation failed: {e}")
            
            # Could add remote validation here
            return {
                "valid": False,
                "error": str(e),
                "method": "local"
            }
    
    def validate_token_with_roles(
        self,
        token: str,
        required_roles: list = None
    ) -> Dict[str, Any]:
        """
        Validate token and check for required roles
        
        Args:
            token: JWT token
            required_roles: List of required roles
            
        Returns:
            Validation result
        """
        
        validation = self.validate_token(token)
        
        if not validation["valid"]:
            return validation
        
        if required_roles:
            user_roles = validation["claims"].get("roles", [])
            has_role = any(role in user_roles for role in required_roles)
            
            if not has_role:
                return {
                    "valid": False,
                    "error": "Insufficient permissions",
                    "required_roles": required_roles,
                    "user_roles": user_roles
                }
        
        return validation


# Singleton instance
jwt_config = JWTConfig()
jwt_handler = JWTHandler(jwt_config)
auth_service = AuthService()
