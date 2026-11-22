"""
Portfolio Router
CRUD endpoints for user portfolios
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import LocalUser, Portfolio
from app.routers.auth_local import get_current_user

router = APIRouter()


# ========================================
# Pydantic Schemas
# ========================================

class PortfolioCreate(BaseModel):
    """Schema for creating a portfolio"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    initial_value: float = Field(default=0.0, ge=0)
    is_default: bool = False


class PortfolioUpdate(BaseModel):
    """Schema for updating a portfolio"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_default: Optional[bool] = None


class PortfolioResponse(BaseModel):
    """Schema for portfolio response"""
    id: int
    user_id: int
    name: str
    description: Optional[str]
    initial_value: float
    current_value: float
    total_returns: float
    total_returns_percentage: float
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ========================================
# Portfolio Endpoints
# ========================================

@router.get("/", response_model=List[PortfolioResponse])
async def list_portfolios(
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Get all portfolios for the current user
    """
    portfolios = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).all()
    return portfolios


@router.post("/", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    portfolio_data: PortfolioCreate,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Create a new portfolio for the current user
    """
    # If this is set as default, unset other defaults
    if portfolio_data.is_default:
        db.query(Portfolio).filter(
            Portfolio.user_id == current_user.id,
            Portfolio.is_default == True
        ).update({"is_default": False})

    portfolio = Portfolio(
        user_id=current_user.id,
        name=portfolio_data.name,
        description=portfolio_data.description,
        initial_value=portfolio_data.initial_value,
        current_value=portfolio_data.initial_value,
        is_default=portfolio_data.is_default
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Get a specific portfolio by ID
    """
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    return portfolio


@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_data: PortfolioUpdate,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Update a portfolio
    """
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    # Handle default flag
    if portfolio_data.is_default:
        db.query(Portfolio).filter(
            Portfolio.user_id == current_user.id,
            Portfolio.is_default == True,
            Portfolio.id != portfolio_id
        ).update({"is_default": False})

    # Update fields
    update_data = portfolio_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(portfolio, field, value)

    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Delete a portfolio
    """
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()

    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )

    db.delete(portfolio)
    db.commit()
    return None
