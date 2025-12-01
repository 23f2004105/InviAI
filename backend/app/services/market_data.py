"""
Market Data Service - Multi-Provider Integration
Supports: Groww API (primary) and Mock Data (fallback)
"""

from typing import Optional, Dict, List, Union
from datetime import datetime, timedelta
import logging
import random
import os
import time
import threading
import asyncio

# Optional imports - graceful fallback if not installed
try:
    import yfinance as yf
    import pandas as pd
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    yf = None
    pd = None

try:
    from growwapi import GrowwAPI, GrowwFeed
    GROWW_AVAILABLE = True
except ImportError:
    GROWW_AVAILABLE = False
    GrowwAPI = None
    GrowwFeed = None

logger = logging.getLogger(__name__)

# ========================================
# Mock Data for Indian Stocks (Fallback)
# ========================================

MOCK_INDIAN_STOCKS = {
    "RELIANCE.NS": {"name": "Reliance Industries Limited", "price": 2456.75, "change": 1.25},
    "TCS.NS": {"name": "Tata Consultancy Services", "price": 3890.50, "change": -0.45},
    "HDFCBANK.NS": {"name": "HDFC Bank Limited", "price": 1678.25, "change": 0.85},
    "INFY.NS": {"name": "Infosys Limited", "price": 1534.60, "change": 2.15},
    "ICICIBANK.NS": {"name": "ICICI Bank Limited", "price": 1245.30, "change": -0.32},
    "HINDUNILVR.NS": {"name": "Hindustan Unilever", "price": 2567.80, "change": 0.55},
    "SBIN.NS": {"name": "State Bank of India", "price": 789.45, "change": 1.75},
    "BHARTIARTL.NS": {"name": "Bharti Airtel Limited", "price": 1456.90, "change": -0.95},
    "ITC.NS": {"name": "ITC Limited", "price": 467.35, "change": 0.25},
    "KOTAKBANK.NS": {"name": "Kotak Mahindra Bank", "price": 1834.20, "change": 1.45},
    "LT.NS": {"name": "Larsen & Toubro", "price": 3456.75, "change": 0.65},
    "AXISBANK.NS": {"name": "Axis Bank Limited", "price": 1123.40, "change": -0.75},
    "WIPRO.NS": {"name": "Wipro Limited", "price": 456.80, "change": 1.95},
    "ASIANPAINT.NS": {"name": "Asian Paints Limited", "price": 2890.15, "change": -0.15},
    "MARUTI.NS": {"name": "Maruti Suzuki India", "price": 12456.50, "change": 0.45},
    "TATAMOTORS.NS": {"name": "Tata Motors Limited", "price": 987.65, "change": 2.35},
    "SUNPHARMA.NS": {"name": "Sun Pharmaceutical", "price": 1678.90, "change": -0.55},
    "TITAN.NS": {"name": "Titan Company Limited", "price": 3567.25, "change": 1.15},
    "BAJFINANCE.NS": {"name": "Bajaj Finance Limited", "price": 7234.80, "change": -1.25},
    "NESTLEIND.NS": {"name": "Nestle India Limited", "price": 24567.45, "change": 0.35},
    "TATASTEEL.NS": {"name": "Tata Steel Limited", "price": 145.60, "change": 1.85},
    "POWERGRID.NS": {"name": "Power Grid Corporation", "price": 287.35, "change": 0.95},
    "NTPC.NS": {"name": "NTPC Limited", "price": 378.90, "change": -0.45},
    "ONGC.NS": {"name": "Oil & Natural Gas Corp", "price": 267.45, "change": 1.55},
    "COALINDIA.NS": {"name": "Coal India Limited", "price": 456.70, "change": 0.75},
}

MOCK_INDICES = {
    "^NSEI": {"name": "NIFTY 50", "price": 24567.85, "change": 0.45},
    "^BSESN": {"name": "SENSEX", "price": 81234.50, "change": 0.38},
    "^NSEBANK": {"name": "NIFTY Bank", "price": 52345.75, "change": -0.25},
}


class MarketDataService:
    """
    Service for fetching market data
    Priority: Groww API > Yahoo Finance > Mock Data
    
    READ-ONLY: This service only fetches market data.
    No order placement or trading capabilities.
    """
    
    NSE_SUFFIX = ".NS"
    BSE_SUFFIX = ".BO"
    
    def __init__(self):
        """Initialize market data service"""
        self.groww_api_key = os.getenv("GROWW_API_KEY")
        self.groww_secret = os.getenv("GROWW_SECRET")
        self.use_mock = os.getenv("USE_MOCK_DATA", "true").lower() == "true"
        
        # Groww API clients (read-only)
        self._groww_api = None
        self._groww_feed = None
        self._groww_initialized = False
        
        # Try to initialize Groww if credentials are available
        if GROWW_AVAILABLE and self.groww_api_key and self.groww_secret:
            try:
                self._init_groww()
                logger.info("✅ Market Data Service initialized with Groww API (READ-ONLY)")
            except Exception as e:
                logger.warning(f"⚠️ Groww API init failed: {e}. Using fallback.")
                self._groww_initialized = False
        elif self.groww_api_key and not GROWW_AVAILABLE:
            logger.warning("⚠️ Groww API key set but 'growwapi' package not installed. Run: pip install growwapi")
        else:
            logger.info("📊 Market Data Service initialized with Mock Data (set GROWW_API_KEY and GROWW_SECRET for live data)")
    
    def _init_groww(self):
        """Initialize Groww API clients (READ-ONLY mode)"""
        if not GROWW_AVAILABLE:
            return
        
        try:
            # Groww provides a JWT token directly as the API key
            # No need to call get_access_token() - use the token directly
            access_token = self.groww_api_key
            logger.info("Using Groww API token directly")
            
            # Initialize API client (for holdings, orders - READ ONLY)
            self._groww_api = GrowwAPI(access_token)
            
            # Initialize Feed client in a separate thread to avoid event loop conflict
            self._feed_thread = None
            self._feed_loop = None
            try:
                self._init_groww_feed_threaded()
            except Exception as feed_err:
                logger.warning(f"GrowwFeed init failed: {feed_err}. Will use API only.")
                self._groww_feed = None
            
            self._groww_initialized = True
            logger.info("✅ Groww API connected (READ-ONLY mode - no trading)")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Groww API: {e}")
            self._groww_initialized = False
            raise
    
    def _init_groww_feed_threaded(self):
        """Initialize GrowwFeed in a separate thread with its own event loop"""
        def run_feed():
            try:
                # Create a new event loop for this thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                self._feed_loop = loop
                
                # Initialize GrowwFeed
                self._groww_feed = GrowwFeed(self._groww_api)
                logger.info("✅ GrowwFeed initialized in background thread")
                
            except Exception as e:
                logger.warning(f"GrowwFeed thread init failed: {e}")
                self._groww_feed = None
        
        # Start the feed in a daemon thread
        self._feed_thread = threading.Thread(target=run_feed, daemon=True)
        self._feed_thread.start()
        self._feed_thread.join(timeout=5)  # Wait up to 5 seconds for init
    
    @staticmethod
    def format_indian_symbol(symbol: str, exchange: str = "NSE") -> str:
        """Format Indian stock symbol"""
        symbol = symbol.upper().strip()
        if symbol.endswith((".NS", ".BO")):
            return symbol
        if exchange.upper() == "BSE":
            return f"{symbol}{MarketDataService.BSE_SUFFIX}"
        return f"{symbol}{MarketDataService.NSE_SUFFIX}"
    
    def _get_mock_price(self, symbol: str) -> Optional[Dict]:
        """Get mock price data for development/testing"""
        symbol_upper = symbol.upper()
        
        # Check indices first
        if symbol_upper in MOCK_INDICES:
            data = MOCK_INDICES[symbol_upper]
            # Add slight randomness to simulate live data
            variation = random.uniform(-0.5, 0.5)
            price = data["price"] * (1 + variation / 100)
            return {
                "symbol": symbol_upper,
                "current_price": round(price, 2),
                "previous_close": data["price"],
                "change_percent": round(data["change"] + variation, 2),
                "name": data["name"],
                "exchange": "INDEX",
                "is_mock": True
            }
        
        # Check stocks
        if symbol_upper in MOCK_INDIAN_STOCKS:
            data = MOCK_INDIAN_STOCKS[symbol_upper]
            variation = random.uniform(-0.5, 0.5)
            price = data["price"] * (1 + variation / 100)
            prev_close = data["price"]
            change = price - prev_close
            change_pct = (change / prev_close) * 100
            
            return {
                "symbol": symbol_upper,
                "current_price": round(price, 2),
                "open": round(prev_close * (1 + random.uniform(-0.5, 0.5) / 100), 2),
                "high": round(price * (1 + random.uniform(0, 1) / 100), 2),
                "low": round(price * (1 - random.uniform(0, 1) / 100), 2),
                "previous_close": prev_close,
                "change": round(change, 2),
                "change_percent": round(change_pct, 2),
                "volume": random.randint(1000000, 50000000),
                "name": data["name"],
                "exchange": "NSE" if ".NS" in symbol_upper else "BSE",
                "is_mock": True
            }
        
        return None
    
    def _get_mock_history(self, symbol: str, days: int = 30) -> List[Dict]:
        """Generate mock historical data as list of dicts (no pandas required)"""
        symbol_upper = symbol.upper()
        
        base_price = 1000
        if symbol_upper in MOCK_INDIAN_STOCKS:
            base_price = MOCK_INDIAN_STOCKS[symbol_upper]["price"]
        elif symbol_upper in MOCK_INDICES:
            base_price = MOCK_INDICES[symbol_upper]["price"]
        
        prices = []
        current = base_price * 0.95  # Start 5% lower
        
        for i in range(days):
            change = random.uniform(-2, 2.5) / 100  # Daily change -2% to +2.5%
            current = current * (1 + change)
            high = current * (1 + random.uniform(0, 1) / 100)
            low = current * (1 - random.uniform(0, 1) / 100)
            open_price = current * (1 + random.uniform(-0.5, 0.5) / 100)
            volume = random.randint(1000000, 50000000)
            date = datetime.now() - timedelta(days=days - i - 1)
            prices.append({
                'date': date.isoformat(),
                'open': round(open_price, 2),
                'high': round(high, 2),
                'low': round(low, 2),
                'close': round(current, 2),
                'volume': volume
            })
        
        return prices
    
    def get_current_price(self, symbol: str) -> Optional[Dict]:
        """Get current price - tries Groww, then Yahoo (if available), then Mock"""
        
        # Try Groww API first (when implemented)
        if self.groww_api_key:
            price = self._get_groww_price(symbol)
            if price:
                return price
        
        # Try Yahoo Finance only if available
        if YFINANCE_AVAILABLE and yf:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                
                if current_price:
                    return {
                        "symbol": symbol,
                        "current_price": current_price,
                        "open": info.get('open'),
                        "high": info.get('dayHigh'),
                        "low": info.get('dayLow'),
                        "previous_close": info.get('previousClose'),
                        "volume": info.get('volume'),
                        "market_cap": info.get('marketCap'),
                        "currency": info.get('currency', 'INR'),
                        "exchange": info.get('exchange'),
                        "is_mock": False
                    }
            except Exception as e:
                logger.warning(f"Yahoo Finance failed for {symbol}: {e}")
        
        # Fallback to mock data
        return self._get_mock_price(symbol)
    
    def _get_groww_price(self, symbol: str) -> Optional[Dict]:
        """
        Get price from Groww API (READ-ONLY)
        
        Args:
            symbol: Stock symbol (e.g., "RELIANCE.NS" or "RELIANCE")
        
        Returns:
            Dict with price data or None
        """
        if not self._groww_initialized or not self._groww_feed:
            return None
        
        # Strip exchange suffix for Groww (it uses plain symbols)
        clean_symbol = symbol.replace(".NS", "").replace(".BO", "")
        
        try:
            # Subscribe to live data
            segment = GrowwAPI.SEGMENT_CASH
            self._groww_feed.subscribe_live_data(segment, clean_symbol)
            
            # Get LTP with timeout
            ltp_data = self._groww_feed.get_stocks_ltp(clean_symbol, timeout=5)
            
            if ltp_data:
                ltp = ltp_data.get('ltp', 0)
                change = ltp_data.get('change', 0)
                change_pct = ltp_data.get('changePercent', 0)
                
                # Calculate previous close from change
                prev_close = ltp - change if change else ltp
                
                return {
                    "symbol": symbol,
                    "current_price": float(ltp),
                    "open": ltp_data.get('open'),
                    "high": ltp_data.get('high'),
                    "low": ltp_data.get('low'),
                    "previous_close": float(prev_close),
                    "change": float(change),
                    "change_percent": float(change_pct),
                    "volume": ltp_data.get('volume'),
                    "name": clean_symbol,
                    "exchange": "NSE" if ".NS" in symbol else "BSE",
                    "is_mock": False,
                    "source": "groww"
                }
        except Exception as e:
            logger.warning(f"Groww API failed for {symbol}: {e}")
        
        return None
    
    def get_groww_holdings(self, timeout: int = 5) -> Optional[List[Dict]]:
        """
        Get user's holdings from Groww (READ-ONLY)
        
        Returns:
            List of holdings or None
        """
        if not self._groww_initialized or not self._groww_api:
            return None
        
        try:
            holdings = self._groww_api.get_holdings(timeout=timeout)
            return holdings
        except Exception as e:
            logger.error(f"Error fetching Groww holdings: {e}")
            return None
    
    def get_groww_positions(self, timeout: int = 5) -> Optional[List[Dict]]:
        """
        Get user's positions from Groww (READ-ONLY)
        
        Returns:
            List of positions or None
        """
        if not self._groww_initialized or not self._groww_api:
            return None
        
        try:
            positions = self._groww_api.get_positions(timeout=timeout)
            return positions
        except Exception as e:
            logger.error(f"Error fetching Groww positions: {e}")
            return None
    
    def is_groww_connected(self) -> bool:
        """Check if Groww API is connected"""
        return self._groww_initialized
    
    def get_stock_info(self, symbol: str) -> Optional[Dict]:
        """Get stock info with fallback to mock"""
        
        # Try Yahoo Finance only if available
        if YFINANCE_AVAILABLE and yf:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                if info and (info.get('regularMarketPrice') or info.get('currentPrice')):
                    return info
            except Exception as e:
                logger.warning(f"Yahoo Finance info failed for {symbol}: {e}")
        
        # Fallback to mock
        mock = self._get_mock_price(symbol)
        if mock:
            return {
                "symbol": symbol,
                "longName": mock.get("name", symbol),
                "shortName": mock.get("name", symbol),
                "regularMarketPrice": mock["current_price"],
                "currentPrice": mock["current_price"],
                "previousClose": mock.get("previous_close"),
                "regularMarketPreviousClose": mock.get("previous_close"),
                "open": mock.get("open"),
                "dayHigh": mock.get("high"),
                "dayLow": mock.get("low"),
                "volume": mock.get("volume"),
                "exchange": mock.get("exchange", "NSE"),
                "is_mock": True
            }
        
        return None
    
    def get_stock_history(self, symbol: str, period: str = "1mo", interval: str = "1d") -> List[Dict]:
        """Get historical data with fallback to mock. Returns list of dicts."""
        
        # Try Yahoo Finance only if available
        if YFINANCE_AVAILABLE and yf and pd:
            try:
                ticker = yf.Ticker(symbol)
                df = ticker.history(period=period, interval=interval)
                if not df.empty:
                    # Convert DataFrame to list of dicts
                    return df.reset_index().to_dict('records')
            except Exception as e:
                logger.warning(f"Yahoo Finance history failed for {symbol}: {e}")
        
        # Fallback to mock
        days_map = {"1d": 1, "5d": 5, "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365}
        days = days_map.get(period, 30)
        return self._get_mock_history(symbol, days)
    
    def get_multiple_prices(self, symbols: List[str]) -> Dict[str, Dict]:
        """Get prices for multiple symbols"""
        results = {}
        for symbol in symbols:
            price_data = self.get_current_price(symbol)
            if price_data:
                results[symbol] = price_data
        return results


# Singleton instance
market_data_service = MarketDataService()


# Convenience functions
def get_indian_stock_price(symbol: str, exchange: str = "NSE") -> Optional[Dict]:
    formatted_symbol = MarketDataService.format_indian_symbol(symbol, exchange)
    return market_data_service.get_current_price(formatted_symbol)


def get_nifty_50() -> Optional[Dict]:
    return market_data_service.get_current_price("^NSEI")


def get_sensex() -> Optional[Dict]:
    return market_data_service.get_current_price("^BSESN")


POPULAR_INDIAN_STOCKS = {k: v["name"] for k, v in MOCK_INDIAN_STOCKS.items()}

INDIAN_INDICES = {
    "^NSEI": "Nifty 50",
    "^BSESN": "BSE Sensex",
    "^NSEBANK": "Nifty Bank",
}
