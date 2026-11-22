"""
Transactions Router - Track buy/sell history and portfolio transactions
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from app.database import get_db
from app.models import Transaction, Portfolio, Asset, TransactionType
from app.routers.auth_local import get_current_user
from app.routers.assets import recalculate_portfolio

router = APIRouter()


# ========================================
# Schemas
# ========================================

class TransactionTypeEnum(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    DIVIDEND = "DIVIDEND"
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    FEE = "FEE"


class TransactionCreate(BaseModel):
    asset_id: Optional[int] = None
    transaction_type: TransactionTypeEnum
    transaction_date: datetime = Field(default_factory=datetime.utcnow)
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: float
    fee: Optional[float] = 0.0
    notes: Optional[str] = None
    reference_id: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    portfolio_id: int
    asset_id: Optional[int]
    transaction_type: str
    transaction_date: datetime
    quantity: Optional[float]
    price: Optional[float]
    amount: float
    fee: Optional[float]
    notes: Optional[str]
    reference_id: Optional[str]
    created_at: datetime
    # Additional computed fields
    asset_symbol: Optional[str] = None
    asset_name: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionSummary(BaseModel):
    total_invested: float
    total_withdrawn: float
    total_dividends: float
    total_fees: float
    net_deposits: float
    transaction_count: int


# ========================================
# Endpoints
# ========================================

@router.get("/{portfolio_id}/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    portfolio_id: int,
    transaction_type: Optional[TransactionTypeEnum] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all transactions for a portfolio with optional filters
    """
    # Verify portfolio ownership
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Build query
    query = db.query(Transaction).filter(Transaction.portfolio_id == portfolio_id)
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type.value)
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    # Order by date descending and apply pagination
    transactions = query.order_by(desc(Transaction.transaction_date)).offset(offset).limit(limit).all()
    
    # Enrich with asset info
    result = []
    for txn in transactions:
        txn_dict = {
            "id": txn.id,
            "portfolio_id": txn.portfolio_id,
            "asset_id": txn.asset_id,
            "transaction_type": txn.transaction_type.value if txn.transaction_type else None,
            "transaction_date": txn.transaction_date,
            "quantity": txn.quantity,
            "price": txn.price,
            "amount": txn.amount,
            "fee": txn.fee,
            "notes": txn.notes,
            "reference_id": txn.reference_id,
            "created_at": txn.created_at,
            "asset_symbol": None,
            "asset_name": None
        }
        
        if txn.asset_id:
            asset = db.query(Asset).filter(Asset.id == txn.asset_id).first()
            if asset:
                txn_dict["asset_symbol"] = asset.symbol
                txn_dict["asset_name"] = asset.name
        
        result.append(TransactionResponse(**txn_dict))
    
    return result


@router.post("/{portfolio_id}/transactions", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    portfolio_id: int,
    transaction: TransactionCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new transaction and update asset/portfolio accordingly
    """
    # Verify portfolio ownership
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Verify asset if provided
    asset = None
    if transaction.asset_id:
        asset = db.query(Asset).filter(
            Asset.id == transaction.asset_id,
            Asset.portfolio_id == portfolio_id
        ).first()
        
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found in this portfolio"
            )
    
    # Create transaction
    db_transaction = Transaction(
        portfolio_id=portfolio_id,
        asset_id=transaction.asset_id,
        transaction_type=TransactionType[transaction.transaction_type.value],
        transaction_date=transaction.transaction_date,
        quantity=transaction.quantity,
        price=transaction.price,
        amount=transaction.amount,
        fee=transaction.fee or 0.0,
        notes=transaction.notes,
        reference_id=transaction.reference_id
    )
    
    db.add(db_transaction)
    
    # Update asset quantity for BUY/SELL transactions
    if asset and transaction.quantity:
        if transaction.transaction_type == TransactionTypeEnum.BUY:
            # Update average cost
            total_cost = (asset.quantity * asset.average_cost) + (transaction.quantity * (transaction.price or 0))
            asset.quantity += transaction.quantity
            if asset.quantity > 0:
                asset.average_cost = total_cost / asset.quantity
            asset.total_cost = asset.quantity * asset.average_cost
            asset.current_value = asset.quantity * asset.current_price
            asset.unrealized_gain_loss = asset.current_value - asset.total_cost
            if asset.total_cost > 0:
                asset.unrealized_gain_loss_percentage = (asset.unrealized_gain_loss / asset.total_cost) * 100
            
        elif transaction.transaction_type == TransactionTypeEnum.SELL:
            if transaction.quantity > asset.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot sell {transaction.quantity} units, only {asset.quantity} available"
                )
            asset.quantity -= transaction.quantity
            asset.total_cost = asset.quantity * asset.average_cost
            asset.current_value = asset.quantity * asset.current_price
            asset.unrealized_gain_loss = asset.current_value - asset.total_cost
            if asset.total_cost > 0:
                asset.unrealized_gain_loss_percentage = (asset.unrealized_gain_loss / asset.total_cost) * 100
        
        asset.updated_at = datetime.utcnow()
    
    # Cash movements change the invested capital; BUY/SELL only change holdings
    if transaction.transaction_type == TransactionTypeEnum.DEPOSIT:
        portfolio.initial_value = (portfolio.initial_value or 0) + transaction.amount
    elif transaction.transaction_type == TransactionTypeEnum.WITHDRAWAL:
        portfolio.initial_value = max((portfolio.initial_value or 0) - transaction.amount, 0)
    
    portfolio.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_transaction)
    recalculate_portfolio(db, portfolio)
    
    return TransactionResponse(
        id=db_transaction.id,
        portfolio_id=db_transaction.portfolio_id,
        asset_id=db_transaction.asset_id,
        transaction_type=db_transaction.transaction_type.value,
        transaction_date=db_transaction.transaction_date,
        quantity=db_transaction.quantity,
        price=db_transaction.price,
        amount=db_transaction.amount,
        fee=db_transaction.fee,
        notes=db_transaction.notes,
        reference_id=db_transaction.reference_id,
        created_at=db_transaction.created_at,
        asset_symbol=asset.symbol if asset else None,
        asset_name=asset.name if asset else None
    )


@router.get("/{portfolio_id}/transactions/summary", response_model=TransactionSummary)
async def get_transaction_summary(
    portfolio_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get transaction summary statistics for a portfolio
    """
    # Verify portfolio ownership
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Build query
    query = db.query(Transaction).filter(Transaction.portfolio_id == portfolio_id)
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    transactions = query.all()
    
    # Calculate summary
    total_invested = sum(t.amount for t in transactions if t.transaction_type in [TransactionType.BUY, TransactionType.DEPOSIT])
    total_withdrawn = sum(t.amount for t in transactions if t.transaction_type in [TransactionType.SELL, TransactionType.WITHDRAWAL])
    total_dividends = sum(t.amount for t in transactions if t.transaction_type == TransactionType.DIVIDEND)
    total_fees = sum(t.fee or 0 for t in transactions)
    
    return TransactionSummary(
        total_invested=total_invested,
        total_withdrawn=total_withdrawn,
        total_dividends=total_dividends,
        total_fees=total_fees,
        net_deposits=total_invested - total_withdrawn,
        transaction_count=len(transactions)
    )


@router.delete("/{portfolio_id}/transactions/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    portfolio_id: int,
    transaction_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a transaction (use with caution - may affect asset quantities)
    """
    # Verify portfolio ownership
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    transaction = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.portfolio_id == portfolio_id
    ).first()
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Reverse the holding change made when this BUY/SELL was recorded
    asset = db.query(Asset).filter(Asset.id == transaction.asset_id).first() if transaction.asset_id else None
    if asset and transaction.quantity:
        if transaction.transaction_type == TransactionType.BUY:
            asset.quantity = max(asset.quantity - transaction.quantity, 0)
        elif transaction.transaction_type == TransactionType.SELL:
            asset.quantity += transaction.quantity
        asset.total_cost = asset.quantity * asset.average_cost
        asset.current_value = asset.quantity * asset.current_price
        asset.unrealized_gain_loss = asset.current_value - asset.total_cost
        asset.unrealized_gain_loss_percentage = (asset.unrealized_gain_loss / asset.total_cost * 100) if asset.total_cost > 0 else 0
    
    db.delete(transaction)
    db.commit()
    recalculate_portfolio(db, portfolio)
    
    return None
