"""
Application Configuration
Centralized configuration management using Pydantic Settings
"""

from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    """
    Application settings from environment variables
    """
    # Application
    APP_NAME: str = "InviAI API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_ANON_KEY: Optional[str] = None
    
    # External APIs / Market Data
    MARKET_DATA_SOURCE: str = "yahoo_finance"
    ALPHA_VANTAGE_API_KEY: Optional[str] = None  # Optional backup
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # Server
    BACKEND_PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Initialize settings
try:
    settings = Settings()
except Exception as e:
    print(f"Warning: Could not load settings: {e}")
    print("Using default values. Make sure to configure your .env file.")
    # Create minimal settings for testing
    settings = None
