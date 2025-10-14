"""
Security and Authentication for Production
"""

from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import logging
from datetime import datetime, timedelta

from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model

from fastapi_app.config import settings

logger = logging.getLogger(__name__)
User = get_user_model()

security = HTTPBearer(auto_error=False)

class RateLimiter:
    """Rate limiting using Redis"""
    
    def __init__(self, max_requests: int = 100, window: int = 60):
        self.max_requests = max_requests
        self.window = window
    
    async def check_rate_limit(self, client_id: str) -> bool:
        """Check if client has exceeded rate limit"""
        from fastapi_app.core.cache import get_redis
        
        try:
            client = get_redis()
            if not client:
                return True  # Allow if Redis unavailable
            
            key = f"ratelimit:{client_id}"
            current = client.get(key)
            
            if current is None:
                client.setex(key, self.window, 1)
                return True
            
            count = int(current)
            if count >= self.max_requests:
                return False
            
            client.incr(key)
            return True
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            return True  # Fail open

rate_limiter = RateLimiter(max_requests=1000, window=60)

async def verify_jwt_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(
            token,
            settings.DJANGO_SECRET_KEY or settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        return None

async def get_user_from_token(token: str):
    """Get Django user from JWT token"""
    payload = await verify_jwt_token(token)
    if not payload:
        return None
    
    user_id = payload.get("user_id")
    if not user_id:
        return None
    
    @sync_to_async
    def get_user():
        try:
            return User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return None
    
    return await get_user()

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = None
):
    """Get current user (optional - returns None if not authenticated)"""
    if not credentials:
        return None
    
    user = await get_user_from_token(credentials.credentials)
    return user

async def require_authentication(
    credentials: Optional[HTTPAuthorizationCredentials] = None
):
    """Require authentication - raises 401 if not authenticated"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await get_user_from_token(credentials.credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user

async def require_staff(user) -> bool:
    """Check if user is staff"""
    if not user.is_staff:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff privileges required"
        )
    return True

async def check_rate_limit(request: Request):
    """Check rate limit for request"""
    client_id = request.client.host
    
    # Use user ID if authenticated
    if hasattr(request.state, "user") and request.state.user:
        client_id = f"user:{request.state.user.id}"
    
    allowed = await rate_limiter.check_rate_limit(client_id)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    return True
