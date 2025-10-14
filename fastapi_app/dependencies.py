"""
FastAPI Dependencies
Shared dependencies for authentication, database, etc.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import logging

from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()
security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """
    Get current user from Django session or JWT token
    Returns None if not authenticated (for optional authentication)
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    
    # TODO: Implement JWT validation
    # For now, this is a placeholder
    # You can implement JWT token validation here
    # or session validation via Redis
    
    try:
        # Example: Validate token and get user
        # user = await validate_token(token)
        # return user
        return None
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return None

async def get_current_user_required(
    user: Optional[User] = Depends(get_current_user)
) -> User:
    """
    Require authentication - raises 401 if not authenticated
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def get_current_active_user(
    user: User = Depends(get_current_user_required)
) -> User:
    """
    Require active user
    """
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return user

async def require_staff_user(
    user: User = Depends(get_current_active_user)
) -> User:
    """
    Require staff privileges
    """
    if not user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff privileges required"
        )
    return user
