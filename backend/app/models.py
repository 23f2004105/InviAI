"""
Envi AI Database Models
SQLAlchemy ORM models for users, portfolios, assets, and transactions
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


# ========================================
# Enumerations
# ========================================

class AssetType(str, enum.Enum):
    """Types of financial assets"""
    STOCK = "stock"
    BOND = "bond"
    ETF = "etf"
    CRYPTO = "crypto"
    MUTUAL_FUND = "mutual_fund"
    COMMODITY = "commodity"
    CASH = "cash"
    OTHER = "other"


class TransactionType(str, enum.Enum):
    """Types of portfolio transactions"""
    BUY = "buy"
    SELL = "sell"
    DIVIDEND = "dividend"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    FEE = "fee"


class RiskTolerance(str, enum.Enum):
    """User's risk tolerance levels"""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


# ========================================
# User Model
# ========================================

class LocalUser(Base):
    """
    User model for local email/password authentication (table: local_users).
    Portfolios reference this table; the legacy Supabase `users` table is gone.
    """
    __tablename__ = "local_users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    portfolios = relationship("Portfolio", back_populates="owner", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<LocalUser(id={self.id}, email='{self.email}')>"


# ========================================
# Portfolio Model
# ========================================

class Portfolio(Base):
    """
    Portfolio model representing a user's investment portfolio
    """
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("local_users.id", ondelete="CASCADE"), nullable=False)
    
    # Portfolio details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Financial metrics
    initial_value = Column(Float, default=0.0)
    current_value = Column(Float, default=0.0)
    total_returns = Column(Float, default=0.0)
    total_returns_percentage = Column(Float, default=0.0)
    
    # Portfolio settings
    is_default = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    target_allocation = Column(Text, nullable=True)  # JSON string of target allocations
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_optimized = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    owner = relationship("LocalUser", back_populates="portfolios")
    assets = relationship("Asset", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Portfolio(id={self.id}, name='{self.name}', value={self.current_value})>"


# ========================================
# Asset Model
# ========================================

class Asset(Base):
    """
    Asset model representing individual holdings within a portfolio
    """
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    
    # Asset identification
    symbol = Column(String(20), nullable=False, index=True)  # e.g., AAPL, BTC
    name = Column(String(255), nullable=False)
    asset_type = Column(SQLEnum(AssetType), nullable=False)
    
    # Holding details
    quantity = Column(Float, nullable=False, default=0.0)
    average_cost = Column(Float, nullable=False, default=0.0)
    current_price = Column(Float, nullable=False, default=0.0)
    
    # Calculated values
    total_cost = Column(Float, default=0.0)  # quantity * average_cost
    current_value = Column(Float, default=0.0)  # quantity * current_price
    unrealized_gain_loss = Column(Float, default=0.0)
    unrealized_gain_loss_percentage = Column(Float, default=0.0)
    
    # Portfolio allocation
    portfolio_percentage = Column(Float, default=0.0)
    target_percentage = Column(Float, nullable=True)  # Target allocation
    
    # Market data
    market_cap = Column(Float, nullable=True)
    sector = Column(String(100), nullable=True)
    exchange = Column(String(50), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_price_update = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="assets")
    transactions = relationship("Transaction", back_populates="asset", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Asset(id={self.id}, symbol='{self.symbol}', quantity={self.quantity})>"


# ========================================
# Transaction Model
# ========================================

class Transaction(Base):
    """
    Transaction model for recording all portfolio activities
    """
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    
    # Transaction details
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    transaction_date = Column(DateTime(timezone=True), nullable=False, default=func.now())
    
    # Financial details
    quantity = Column(Float, nullable=True)  # Null for deposits/withdrawals
    price = Column(Float, nullable=True)  # Price per unit
    amount = Column(Float, nullable=False)  # Total transaction amount
    fee = Column(Float, default=0.0)
    
    # Additional information
    notes = Column(Text, nullable=True)
    reference_id = Column(String(255), nullable=True)  # External transaction ID
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")
    asset = relationship("Asset", back_populates="transactions")
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, type='{self.transaction_type}', amount={self.amount})>"


# ========================================
# Market Data Cache (Optional)
# ========================================

class MarketDataCache(Base):
    """
    Cache for market data to reduce API calls
    """
    __tablename__ = "market_data_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    
    # Price data
    current_price = Column(Float, nullable=False)
    open_price = Column(Float, nullable=True)
    high_price = Column(Float, nullable=True)
    low_price = Column(Float, nullable=True)
    close_price = Column(Float, nullable=True)
    volume = Column(Float, nullable=True)
    
    # Additional data
    market_cap = Column(Float, nullable=True)
    pe_ratio = Column(Float, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    
    # Metadata
    data_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<MarketDataCache(symbol='{self.symbol}', price={self.current_price})>"
