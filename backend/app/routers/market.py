"""
Market Data Router - Real-time stock data from NSE/BSE via Yahoo Finance
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import logging
import asyncio

from app.services.market_data import market_data_service

router = APIRouter()
logger = logging.getLogger(__name__)
market_service = market_data_service


# ========================================
# Schemas
# ========================================

class StockQuote(BaseModel):
    symbol: str
    name: str
    exchange: str
    current_price: float
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    previous_close: Optional[float] = None
    change: float
    change_percent: float
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    last_updated: datetime
    is_mock: bool = False   # True when Yahoo was unreachable and sample prices were used


class HistoricalDataPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockSearch(BaseModel):
    symbol: str
    name: str
    exchange: str
    type: str


class MarketIndex(BaseModel):
    symbol: str
    name: str
    value: float
    change: float
    change_percent: float
    high: Optional[float] = None
    low: Optional[float] = None
    last_updated: datetime


class MarketOverview(BaseModel):
    nifty_50: Optional[MarketIndex] = None
    sensex: Optional[MarketIndex] = None
    nifty_bank: Optional[MarketIndex] = None
    top_gainers: List[StockQuote] = []
    top_losers: List[StockQuote] = []
    most_active: List[StockQuote] = []
    # Breadth across the tracked large caps (not the whole exchange)
    tracked: int = 0
    advances: int = 0
    declines: int = 0
    total_volume: int = 0


# ========================================
# Endpoints
# ========================================

@router.get("/quote/{symbol}", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    """
    Get real-time quote for a stock symbol.
    For NSE stocks, use symbol.NS (e.g., RELIANCE.NS)
    For BSE stocks, use symbol.BO (e.g., RELIANCE.BO)
    """
    try:
        data = market_service.get_stock_info(symbol)
        
        if not data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock symbol '{symbol}' not found"
            )
        
        current_price = data.get('currentPrice') or data.get('regularMarketPrice', 0)
        previous_close = data.get('previousClose') or data.get('regularMarketPreviousClose', 0)
        change = current_price - previous_close if previous_close else 0
        change_percent = (change / previous_close * 100) if previous_close else 0
        
        return StockQuote(
            symbol=symbol,
            name=data.get('longName') or data.get('shortName', symbol),
            exchange=data.get('exchange', 'NSE'),
            current_price=current_price,
            open_price=data.get('open') or data.get('regularMarketOpen'),
            high_price=data.get('dayHigh') or data.get('regularMarketDayHigh'),
            low_price=data.get('dayLow') or data.get('regularMarketDayLow'),
            previous_close=previous_close,
            change=round(change, 2),
            change_percent=round(change_percent, 2),
            volume=data.get('volume') or data.get('regularMarketVolume'),
            market_cap=data.get('marketCap'),
            pe_ratio=data.get('trailingPE'),
            dividend_yield=data.get('dividendYield'),
            fifty_two_week_high=data.get('fiftyTwoWeekHigh'),
            fifty_two_week_low=data.get('fiftyTwoWeekLow'),
            last_updated=datetime.now(timezone.utc),
            is_mock=bool(data.get('is_mock', False)),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stock data: {str(e)}"
        )


@router.get("/history/{symbol}", response_model=List[HistoricalDataPoint])
async def get_stock_history(
    symbol: str,
    period: str = Query(default="1mo", description="Valid periods: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max"),
    interval: str = Query(default="1d", description="Valid intervals: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo")
):
    """
    Get historical price data for a stock
    """
    try:
        history = market_service.get_stock_history(symbol, period=period, interval=interval)
        
        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No historical data found for '{symbol}'"
            )

        # The service returns list[dict]: Yahoo rows use capitalised keys and a
        # 'Date' Timestamp, mock rows use lowercase keys and an ISO 'date' string.
        def field(row, name):
            return row.get(name.capitalize(), row.get(name))

        result = []
        for row in history:
            raw_date = row.get('Date') or row.get('date')
            date_str = raw_date.strftime('%Y-%m-%d') if hasattr(raw_date, 'strftime') else str(raw_date)[:10]
            result.append(HistoricalDataPoint(
                date=date_str,
                open=round(field(row, 'open'), 2),
                high=round(field(row, 'high'), 2),
                low=round(field(row, 'low'), 2),
                close=round(field(row, 'close'), 2),
                volume=int(field(row, 'volume') or 0)
            ))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch historical data: {str(e)}"
        )


@router.get("/search", response_model=List[StockSearch])
async def search_stocks(
    q: str = Query(..., min_length=1, description="Search query"),
    exchange: Optional[str] = Query(default=None, description="Filter by exchange: NSE, BSE")
):
    """
    Search for stocks by name or symbol
    """
    # Popular Indian stocks for quick search
    indian_stocks = [
        {"symbol": "RELIANCE.NS", "name": "Reliance Industries Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "TCS.NS", "name": "Tata Consultancy Services Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "HDFCBANK.NS", "name": "HDFC Bank Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "INFY.NS", "name": "Infosys Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "ICICIBANK.NS", "name": "ICICI Bank Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "SBIN.NS", "name": "State Bank of India", "exchange": "NSE", "type": "stock"},
        {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "ITC.NS", "name": "ITC Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "LT.NS", "name": "Larsen & Toubro Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "AXISBANK.NS", "name": "Axis Bank Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "WIPRO.NS", "name": "Wipro Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "ASIANPAINT.NS", "name": "Asian Paints Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "MARUTI.NS", "name": "Maruti Suzuki India Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "TMPV.NS", "name": "Tata Motors Passenger Vehicles Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "TMCV.NS", "name": "Tata Motors Limited (Commercial Vehicles)", "exchange": "NSE", "type": "stock"},
        {"symbol": "SUNPHARMA.NS", "name": "Sun Pharmaceutical Industries", "exchange": "NSE", "type": "stock"},
        {"symbol": "TITAN.NS", "name": "Titan Company Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Limited", "exchange": "NSE", "type": "stock"},
        {"symbol": "NESTLEIND.NS", "name": "Nestle India Limited", "exchange": "NSE", "type": "stock"},
        # BSE stocks
        {"symbol": "RELIANCE.BO", "name": "Reliance Industries Limited", "exchange": "BSE", "type": "stock"},
        {"symbol": "TCS.BO", "name": "Tata Consultancy Services Limited", "exchange": "BSE", "type": "stock"},
        {"symbol": "HDFCBANK.BO", "name": "HDFC Bank Limited", "exchange": "BSE", "type": "stock"},
    ]
    
    query = q.upper()
    results = []
    
    for stock in indian_stocks:
        if query in stock["symbol"].upper() or query in stock["name"].upper():
            if exchange is None or stock["exchange"] == exchange.upper():
                results.append(StockSearch(**stock))
    
    return results[:10]  # Limit to 10 results


@router.get("/indices", response_model=List[MarketIndex])
async def get_market_indices():
    """
    Get major Indian market indices (NIFTY 50, SENSEX, NIFTY Bank)
    """
    indices = [
        ("^NSEI", "NIFTY 50"),
        ("^BSESN", "SENSEX"),
        ("^NSEBANK", "NIFTY Bank"),
        ("^CNXIT", "NIFTY IT"),
    ]
    
    infos = await asyncio.gather(
        *[asyncio.to_thread(market_service.get_stock_info, symbol) for symbol, _ in indices],
        return_exceptions=True
    )
    results = []
    for (symbol, name), data in zip(indices, infos):
        try:
            if isinstance(data, Exception):
                raise data
            if data:
                current = data.get('regularMarketPrice', 0)
                previous = data.get('regularMarketPreviousClose', 0)
                change = current - previous if previous else 0
                change_pct = (change / previous * 100) if previous else 0
                
                results.append(MarketIndex(
                    symbol=symbol,
                    name=name,
                    value=round(current, 2),
                    change=round(change, 2),
                    change_percent=round(change_pct, 2),
                    high=data.get('dayHigh') or data.get('regularMarketDayHigh'),
                    low=data.get('dayLow') or data.get('regularMarketDayLow'),
                    last_updated=datetime.now(timezone.utc)
                ))
        except Exception as e:
            logger.warning(f"Failed to fetch index {symbol}: {e}")
    
    return results


@router.get("/overview", response_model=MarketOverview)
async def get_market_overview():
    """
    Get market overview including indices, top gainers, losers, and most active stocks
    """
    overview = MarketOverview()
    
    # Get indices
    try:
        indices = await get_market_indices()
        for idx in indices:
            if idx.name == "NIFTY 50":
                overview.nifty_50 = idx
            elif idx.name == "SENSEX":
                overview.sensex = idx
            elif idx.name == "NIFTY Bank":
                overview.nifty_bank = idx
    except Exception as e:
        logger.warning(f"Failed to fetch indices: {e}")
    
    # Sample stocks to check for gainers/losers
    sample_stocks = [
        "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
        "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "HINDUNILVR.NS", "KOTAKBANK.NS"
    ]
    
    # Warm the quote cache in parallel threads, then build quotes from it
    await asyncio.gather(
        *[asyncio.to_thread(market_service.get_stock_info, s) for s in sample_stocks],
        return_exceptions=True
    )
    quotes = []
    for symbol in sample_stocks:
        try:
            quote = await get_stock_quote(symbol)
            quotes.append(quote)
        except Exception:
            continue
    
    # Sort for gainers and losers
    sorted_by_change = sorted(quotes, key=lambda x: x.change_percent, reverse=True)
    overview.top_gainers = sorted_by_change[:3]
    overview.top_losers = sorted_by_change[-3:][::-1]
    
    overview.tracked = len(quotes)
    overview.advances = sum(1 for q in quotes if q.change_percent > 0)
    overview.declines = sum(1 for q in quotes if q.change_percent < 0)
    overview.total_volume = sum(q.volume or 0 for q in quotes)
    
    # Sort by volume for most active
    sorted_by_volume = sorted(quotes, key=lambda x: x.volume or 0, reverse=True)
    overview.most_active = sorted_by_volume[:3]
    
    return overview
