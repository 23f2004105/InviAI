"""
InviAI Backend - Main Application Entry Point
FastAPI application with CORS, middleware, and route configuration
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import os
import time
from datetime import datetime, timezone

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Import database initialization
from app.database import engine, Base
from app.rate_limit import limiter

# Import local auth model to ensure table is created
from app.routers.auth_local import LocalUser

# Import routers
from app.routers import auth_local as auth
from app.routers import portfolios, assets, transactions, market, ai_chat

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup
    logger.info("Starting InviAI Backend...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    
    # Create database tables
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")

    # Pre-fetch index and popular stock quotes in the background so the first
    # dashboard/trends load is served from cache
    def warm_market_cache():
        from concurrent.futures import ThreadPoolExecutor
        from app.services.market_data import market_data_service
        symbols = ["^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "RELIANCE.NS", "TCS.NS", "INFY.NS",
                   "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS",
                   "HINDUNILVR.NS", "KOTAKBANK.NS"]
        with ThreadPoolExecutor(max_workers=8) as pool:
            list(pool.map(market_data_service.get_stock_info, symbols))
        logger.info("Market data cache warmed")

    import threading
    threading.Thread(target=warm_market_cache, daemon=True).start()

    yield
    
    # Shutdown
    logger.info("Shutting down InviAI Backend...")


# Initialize FastAPI application
app = FastAPI(
    title="InviAI API",
    description="Intelligent Portfolio Planning & Financial Optimization Platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ========================================
# CORS Configuration
# ========================================
# Allow frontend to communicate with backend
# Comma-separated; in production set this to the Vercel URL(s)
cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================
# Global Exception Handlers
# ========================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle validation errors with detailed messages
    """
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "Validation error occurred"
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Handle unexpected errors gracefully
    """
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "detail": str(exc) if os.getenv("ENVIRONMENT") == "development" else "An error occurred"
        }
    )


# ========================================
# Root & Health Check Endpoints
# ========================================

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - API information
    """
    return {
        "name": "InviAI API",
        "version": "0.1.0",
        "status": "operational",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint for monitoring
    """
    try:
        # Test database connection
        from sqlalchemy import text
        from app.database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "api": "healthy",
            "database": db_status
        }
    }


# ========================================
# Include Routers
# ========================================

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(portfolios.router, prefix="/api/portfolios", tags=["Portfolios"])
app.include_router(assets.router, prefix="/api/portfolios", tags=["Assets"])
app.include_router(transactions.router, prefix="/api/portfolios", tags=["Transactions"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(ai_chat.router, prefix="/api/ai", tags=["AI Chat"])


# ========================================
# Middleware for Request Logging
# ========================================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Log all incoming requests
    """
    start_time = time.perf_counter()
    logger.info(f"Request: {request.method} {request.url.path}")

    response = await call_next(request)

    process_time = time.perf_counter() - start_time
    logger.info(f"Response: {response.status_code} | Time: {process_time:.3f}s")
    
    # Add custom headers
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-API-Version"] = "0.1.0"
    
    return response


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
