"""
Redis Caching System for Production
"""

import redis
import json
import hashlib
from typing import Optional, Any
from functools import wraps
import logging

from fastapi_app.config import settings

logger = logging.getLogger(__name__)

# Redis client
redis_client = None

def get_redis():
    """Get Redis client instance"""
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=False,  # For binary data
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            # Test connection
            redis_client.ping()
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            redis_client = None
    return redis_client

def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments"""
    key_parts = [str(arg) for arg in args]
    key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()

async def get_cached(key: str) -> Optional[bytes]:
    """Get value from cache"""
    try:
        client = get_redis()
        if client:
            return client.get(key)
    except Exception as e:
        logger.error(f"Cache get error: {e}")
    return None

async def set_cached(key: str, value: bytes, expire: int = 3600):
    """Set value in cache with expiration"""
    try:
        client = get_redis()
        if client:
            client.setex(key, expire, value)
            return True
    except Exception as e:
        logger.error(f"Cache set error: {e}")
    return False

async def delete_cached(pattern: str):
    """Delete keys matching pattern"""
    try:
        client = get_redis()
        if client:
            keys = client.keys(pattern)
            if keys:
                client.delete(*keys)
            return True
    except Exception as e:
        logger.error(f"Cache delete error: {e}")
    return False

def cached(expire: int = 3600, key_prefix: str = "fastapi"):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            key = f"{key_prefix}:{func.__name__}:{cache_key(*args, **kwargs)}"
            
            # Try to get from cache
            cached_value = await get_cached(key)
            if cached_value:
                try:
                    return json.loads(cached_value)
                except:
                    pass
            
            # Call function
            result = await func(*args, **kwargs)
            
            # Cache result
            try:
                await set_cached(key, json.dumps(result).encode(), expire)
            except:
                pass
            
            return result
        return wrapper
    return decorator
