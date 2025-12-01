"""
Router package initialization
"""

# Use local auth instead of Supabase auth
from app.routers import auth_local as auth

__all__ = ["auth"]
