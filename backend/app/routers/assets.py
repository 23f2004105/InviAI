"""
Assets Router
CRUD endpoints for portfolio assets
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import LocalUser, Asset, Portfolio, AssetType
from app.routers.auth_local import get_current_user
from app.services.market_data import market_data_service, MarketDataService

router = APIRouter()


# ========================================
# Pydantic Schemas
# ========================================

class AssetCreate(BaseModel):
    """Schema for adding an asset to a portfolio"""
    symbol: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=255)
    asset_type: str = Field(default="stock")
    quantity: float = Field(..., gt=0)
    average_cost: float = Field(..., ge=0)
    exchange: Optional[str] = Field(default="NSE")


class AssetUpdate(BaseModel):
    """Schema for updating an asset"""
    quantity: Optional[float] = Field(None, gt=0)
    average_cost: Optional[float] = Field(None, ge=0)
    target_percentage: Optional[float] = Field(None, ge=0, le=100)


class AssetResponse(BaseModel):
    """Schema for asset response"""
    id: int
    portfolio_id: int
    symbol: str
    name: str
    asset_type: str
    quantity: float
    average_cost: float
    current_price: float
    total_cost: float
    current_value: float
    unrealized_gain_loss: float
    unrealized_gain_loss_percentage: float
    portfolio_percentage: float
    exchange: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ========================================
# Helper Functions
# ========================================

def get_portfolio_or_404(db: Session, portfolio_id: int, user_id: int) -> Portfolio:
    """Get portfolio or raise 404"""
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == user_id
    ).first()
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    return portfolio


def recalculate_portfolio(db: Session, portfolio: Portfolio):
    """Recalculate portfolio totals after asset changes"""
    assets = db.query(Asset).filter(Asset.portfolio_id == portfolio.id).all()
    total_value = sum(asset.current_value for asset in assets)

    # Update portfolio percentages
    for asset in assets:
        asset.portfolio_percentage = (asset.current_value / total_value * 100) if total_value > 0 else 0

    # Update portfolio value; returns are measured against the cost basis of holdings
    portfolio.current_value = total_value
    total_cost = sum(asset.total_cost or 0 for asset in assets)
    portfolio.total_returns = total_value - total_cost
    portfolio.total_returns_percentage = (portfolio.total_returns / total_cost * 100) if total_cost > 0 else 0
    db.commit()


# ========================================
# Asset Endpoints
# ========================================

@router.get("/{portfolio_id}/assets", response_model=List[AssetResponse])
async def list_assets(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Get all assets in a portfolio
    """
    portfolio = get_portfolio_or_404(db, portfolio_id, current_user.id)
    assets = db.query(Asset).filter(Asset.portfolio_id == portfolio.id).all()
    return assets


@router.post("/{portfolio_id}/assets", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def add_asset(
    portfolio_id: int,
    asset_data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Add an asset to a portfolio
    """
    portfolio = get_portfolio_or_404(db, portfolio_id, current_user.id)

    # Format symbol for Indian stocks if needed
    symbol = asset_data.symbol.upper()
    if asset_data.exchange in ("NSE", "BSE") and not symbol.endswith((".NS", ".BO")):
        symbol = MarketDataService.format_indian_symbol(symbol, asset_data.exchange)

    # Fetch current price
    price_data = market_data_service.get_current_price(symbol)
    current_price = price_data.get("current_price", asset_data.average_cost) if price_data else asset_data.average_cost

    # Calculate values
    total_cost = asset_data.quantity * asset_data.average_cost
    current_value = asset_data.quantity * current_price
    unrealized = current_value - total_cost
    unrealized_pct = (unrealized / total_cost * 100) if total_cost > 0 else 0

    # Map asset type
    try:
        asset_type_enum = AssetType(asset_data.asset_type.lower())
    except ValueError:
        asset_type_enum = AssetType.OTHER

    asset = Asset(
        portfolio_id=portfolio.id,
        symbol=symbol,
        name=asset_data.name,
        asset_type=asset_type_enum,
        quantity=asset_data.quantity,
        average_cost=asset_data.average_cost,
        current_price=current_price,
        total_cost=total_cost,
        current_value=current_value,
        unrealized_gain_loss=unrealized,
        unrealized_gain_loss_percentage=unrealized_pct,
        exchange=asset_data.exchange,
        last_price_update=datetime.utcnow()
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    # Recalculate portfolio
    recalculate_portfolio(db, portfolio)
    db.refresh(asset)

    return asset


@router.get("/{portfolio_id}/assets/{asset_id}", response_model=AssetResponse)
async def get_asset(
    portfolio_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Get a specific asset
    """
    portfolio = get_portfolio_or_404(db, portfolio_id, current_user.id)
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.portfolio_id == portfolio.id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    return asset


@router.put("/{portfolio_id}/assets/{asset_id}", response_model=AssetResponse)
async def update_asset(
    portfolio_id: int,
    asset_id: int,
    asset_data: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Update an asset (quantity, cost basis, target allocation)
    """
    portfolio = get_portfolio_or_404(db, portfolio_id, current_user.id)
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.portfolio_id == portfolio.id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    update_data = asset_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(asset, field, value)

    # Recalculate derived values
    asset.total_cost = asset.quantity * asset.average_cost
    asset.current_value = asset.quantity * asset.current_price
    asset.unrealized_gain_loss = asset.current_value - asset.total_cost
    asset.unrealized_gain_loss_percentage = (
        (asset.unrealized_gain_loss / asset.total_cost * 100) if asset.total_cost > 0 else 0
    )

    db.commit()
    recalculate_portfolio(db, portfolio)
    db.refresh(asset)
    return asset


@router.delete("/{portfolio_id}/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    portfolio_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Remove an asset from a portfolio
    """
    portfolio = get_portfolio_or_404(db, portfolio_id, current_user.id)
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.portfolio_id == portfolio.id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )

    db.delete(asset)
    db.commit()
    recalculate_portfolio(db, portfolio)
    return None


@router.post("/{portfolio_id}/assets/refresh-prices", response_model=List[AssetResponse])
async def refresh_asset_prices(
    portfolio_id: int,
    db: Session = Depends(get_db),
    current_user: LocalUser = Depends(get_current_user)
):
    """
    Refresh current prices for all assets in a portfolio
    """
    portfolio = get_portfolio_or_404(db, portfolio_id, current_user.id)
    assets = db.query(Asset).filter(Asset.portfolio_id == portfolio.id).all()

    for asset in assets:
        price_data = market_data_service.get_current_price(asset.symbol)
        if price_data and price_data.get("current_price"):
            asset.current_price = price_data["current_price"]
            asset.current_value = asset.quantity * asset.current_price
            asset.unrealized_gain_loss = asset.current_value - asset.total_cost
            asset.unrealized_gain_loss_percentage = (
                (asset.unrealized_gain_loss / asset.total_cost * 100) if asset.total_cost > 0 else 0
            )
            asset.last_price_update = datetime.utcnow()

    db.commit()
    recalculate_portfolio(db, portfolio)

    # Refresh all assets from DB
    assets = db.query(Asset).filter(Asset.portfolio_id == portfolio.id).all()
    return assets
