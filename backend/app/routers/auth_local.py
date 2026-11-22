"""
Local Authentication Router - No Supabase Required
Handles user registration, login, logout with JWT tokens and PostgreSQL
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status, Header
from sqlalchemy.orm import Session
from typing import Optional
import logging
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
from jose import JWTError, jwt
import bcrypt
import os

from app.database import get_db
from app.models import LocalUser
from app.rate_limit import limiter, AUTH_RATE_LIMIT
from app.schemas import UserRegister, UserLogin

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter()

# ========================================
# Password Hashing (bcrypt)
# ========================================
# Older accounts were stored as "<salt>$<sha256 hex>". Those still verify, and
# are re-hashed with bcrypt on the next successful login (see needs_rehash).

def _pw_bytes(password: str) -> bytes:
    # bcrypt only uses the first 72 bytes and bcrypt>=5 raises beyond that
    return password.encode("utf-8")[:72]

def get_password_hash(password: str) -> str:
    """Hash a password with bcrypt"""
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt()).decode("utf-8")

def _is_legacy_hash(hashed_password: str) -> bool:
    return not hashed_password.startswith("$2")

def needs_rehash(hashed_password: str) -> bool:
    """True if the stored hash uses the old SHA-256 scheme"""
    return _is_legacy_hash(hashed_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt or legacy SHA-256 hash"""
    try:
        if _is_legacy_hash(hashed_password):
            salt, stored_hash = hashed_password.split('$')
            new_hash = hashlib.sha256((salt + plain_password).encode()).hexdigest()
            return hmac.compare_digest(new_hash, stored_hash)
        return bcrypt.checkpw(_pw_bytes(plain_password), hashed_password.encode("utf-8"))
    except Exception:
        return False

# ========================================
# JWT Configuration
# ========================================

_DEV_FALLBACK_SECRET = "inviai-dev-only-secret-do-not-use-in-production"
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("ENVIRONMENT", "development") != "development":
        raise RuntimeError("JWT_SECRET_KEY must be set when ENVIRONMENT is not 'development'")
    logger.warning("⚠️ JWT_SECRET_KEY not set - using an insecure development secret")
    SECRET_KEY = _DEV_FALLBACK_SECRET
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


# ========================================
# Helper Functions
# ========================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> LocalUser:
    """Get current authenticated user from JWT token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Invalid scheme")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    email = payload.get("sub")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    
    user = db.query(LocalUser).filter(LocalUser.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    
    return user


# ========================================
# Authentication Endpoints
# ========================================

@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit(AUTH_RATE_LIMIT)
async def register(request: Request, user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user with email and password
    """
    # Check if user already exists
    existing_user = db.query(LocalUser).filter(LocalUser.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Create new user
    new_user = LocalUser(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=get_password_hash(user_data.password),
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": new_user.email})
    
    logger.info(f"New user registered: {new_user.email}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "is_active": new_user.is_active,
            "created_at": new_user.created_at.isoformat() if new_user.created_at else None
        }
    }


@router.post("/login")
@limiter.limit(AUTH_RATE_LIMIT)
async def login(request: Request, credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password
    """
    # Find user
    user = db.query(LocalUser).filter(LocalUser.email == credentials.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Upgrade old SHA-256 hashes to bcrypt now that we know the password
    if needs_rehash(user.password_hash):
        user.password_hash = get_password_hash(credentials.password)
        logger.info(f"Upgraded password hash to bcrypt for user id={user.id}")

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email})
    
    logger.info(f"User logged in: {user.email}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    }


@router.post("/logout")
async def logout():
    """
    Logout - client should remove the token
    """
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(current_user: LocalUser = Depends(get_current_user)):
    """
    Get current logged-in user info
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }


@router.get("/verify")
async def verify_token(current_user: LocalUser = Depends(get_current_user)):
    """
    Verify if the token is valid
    """
    return {"valid": True, "email": current_user.email}
