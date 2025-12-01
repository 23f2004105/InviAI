"""
Authentication Router with Supabase Integration
Handles user registration, login, logout, and JWT validation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
import logging
import os
from datetime import datetime

from app.database import get_db
from app.models import User
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse, PasswordReset
from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# ========================================
# Supabase Client Configuration
# ========================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase credentials not found. Authentication will not work properly.")
    supabase_client: Optional[Client] = None
else:
    try:
        supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        supabase_client = None


def get_supabase_client() -> Client:
    """Dependency to get Supabase client"""
    if supabase_client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable"
        )
    return supabase_client


# ========================================
# Authentication Helper Functions
# ========================================

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid authentication scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token with Supabase
    try:
        supabase = get_supabase_client()
        user_data = supabase.auth.get_user(token)
        
        if not user_data or not user_data.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        supabase_id = user_data.user.id
        
        # Get user from database
        user = db.query(User).filter(User.supabase_id == supabase_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found in database"
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_user_in_db(db: Session, email: str, supabase_id: str, full_name: Optional[str] = None) -> User:
    """
    Create user record in local database
    """
    user = User(
        supabase_id=supabase_id,
        email=email,
        full_name=full_name,
        is_active=True,
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"User created in database: {email}")
    return user


# ========================================
# Authentication Endpoints
# ========================================

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Register a new user
    
    - Creates user in Supabase Auth
    - Creates user record in local database
    - Returns access token
    """
    try:
        # Check if user already exists in local database
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Register user with Supabase
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user account"
            )
        
        # Create user in local database
        user = create_user_in_db(
            db=db,
            email=user_data.email,
            supabase_id=auth_response.user.id,
            full_name=user_data.full_name
        )
        
        # Return token and user data
        return TokenResponse(
            access_token=auth_response.session.access_token if auth_response.session else "",
            user=UserResponse.from_orm(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: Session = Depends(get_db),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Login user with email and password
    
    - Authenticates with Supabase
    - Returns access token and user data
    """
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Get user from local database
        user = db.query(User).filter(User.supabase_id == auth_response.user.id).first()
        
        if not user:
            # Create user if doesn't exist (migration scenario)
            user = create_user_in_db(
                db=db,
                email=credentials.email,
                supabase_id=auth_response.user.id
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        
        return TokenResponse(
            access_token=auth_response.session.access_token,
            user=UserResponse.from_orm(user)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/logout")
async def logout(
    supabase: Client = Depends(get_supabase_client),
    current_user: User = Depends(get_current_user)
):
    """
    Logout current user (invalidates token)
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return UserResponse.from_orm(current_user)


@router.post("/password-reset")
async def request_password_reset(
    reset_data: PasswordReset,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Request password reset email
    """
    try:
        supabase.auth.reset_password_for_email(reset_data.email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        # Don't reveal if email exists or not
        return {"message": "If the email exists, a password reset link has been sent"}


@router.get("/verify-email")
async def verify_email(
    token: str,
    supabase: Client = Depends(get_supabase_client),
    db: Session = Depends(get_db)
):
    """
    Verify user email with token
    """
    try:
        # Verify token with Supabase
        user_data = supabase.auth.get_user(token)
        
        if not user_data or not user_data.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
        
        # Update user verification status
        user = db.query(User).filter(User.supabase_id == user_data.user.id).first()
        if user:
            user.is_verified = True
            db.commit()
        
        return {"message": "Email verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification failed"
        )
