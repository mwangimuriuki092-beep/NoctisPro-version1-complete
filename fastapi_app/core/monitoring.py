"""
Monitoring and Metrics for Production
"""

import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import json

logger = logging.getLogger(__name__)

# In-memory metrics (for simple deployments)
# In production, use Prometheus or similar
metrics = {
    "requests_total": 0,
    "requests_failed": 0,
    "response_times": [],
    "active_requests": 0,
}

class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware for tracking request metrics"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Track active requests
        metrics["active_requests"] += 1
        start_time = time.time()
        
        # Track request
        metrics["requests_total"] += 1
        
        # Log request
        logger.info(f"Request: {request.method} {request.url.path}")
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time = time.time() - start_time
            metrics["response_times"].append(response_time)
            
            # Keep only last 1000 response times
            if len(metrics["response_times"]) > 1000:
                metrics["response_times"] = metrics["response_times"][-1000:]
            
            # Add response time header
            response.headers["X-Response-Time"] = f"{response_time:.3f}s"
            
            # Log response
            logger.info(
                f"Response: {request.method} {request.url.path} "
                f"- Status: {response.status_code} "
                f"- Time: {response_time:.3f}s"
            )
            
            return response
            
        except Exception as e:
            metrics["requests_failed"] += 1
            logger.error(f"Request failed: {request.method} {request.url.path} - {e}")
            raise
            
        finally:
            metrics["active_requests"] -= 1

def get_metrics():
    """Get current metrics"""
    avg_response_time = 0
    if metrics["response_times"]:
        avg_response_time = sum(metrics["response_times"]) / len(metrics["response_times"])
    
    return {
        "requests_total": metrics["requests_total"],
        "requests_failed": metrics["requests_failed"],
        "active_requests": metrics["active_requests"],
        "avg_response_time": f"{avg_response_time:.3f}s",
        "success_rate": (
            (metrics["requests_total"] - metrics["requests_failed"]) / 
            metrics["requests_total"] * 100
            if metrics["requests_total"] > 0 else 100
        ),
    }

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for detailed request logging"""
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Log request details
        logger.debug(f"Request Details: {request.method} {request.url}")
        logger.debug(f"Headers: {dict(request.headers)}")
        logger.debug(f"Client: {request.client.host if request.client else 'unknown'}")
        
        response = await call_next(request)
        return response
