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

# Fallback prices used only when live providers are unreachable (snapshot of real closes, Nov 2026)
MOCK_INDIAN_STOCKS = {
    "RELIANCE.NS": {"name": "Reliance Industries Limited", "price": 1377.50, "change": 0.14},
    "TCS.NS": {"name": "Tata Consultancy Services", "price": 2376.20, "change": 1.43},
    "HDFCBANK.NS": {"name": "HDFC Bank Limited", "price": 846.00, "change": 2.94},
    "INFY.NS": {"name": "Infosys Limited", "price": 1098.00, "change": 0.56},
    "ICICIBANK.NS": {"name": "ICICI Bank Limited", "price": 1640.00, "change": 1.93},
    "HINDUNILVR.NS": {"name": "Hindustan Unilever", "price": 2052.50, "change": -1.05},
    "SBIN.NS": {"name": "State Bank of India", "price": 1165.10, "change": 0.79},
    "BHARTIARTL.NS": {"name": "Bharti Airtel Limited", "price": 2161.70, "change": 0.83},
    "ITC.NS": {"name": "ITC Limited", "price": 299.10, "change": -0.63},
    "KOTAKBANK.NS": {"name": "Kotak Mahindra Bank", "price": 515.80, "change": 2.54},
    "LT.NS": {"name": "Larsen & Toubro", "price": 4209.10, "change": -0.05},
    "AXISBANK.NS": {"name": "Axis Bank Limited", "price": 1446.00, "change": 4.72},
    "WIPRO.NS": {"name": "Wipro Limited", "price": 185.70, "change": 0.96},
    "ASIANPAINT.NS": {"name": "Asian Paints Limited", "price": 2608.30, "change": 0.51},
    "MARUTI.NS": {"name": "Maruti Suzuki India", "price": 14011.00, "change": 3.11},
    "TMPV.NS": {"name": "Tata Motors Passenger Vehicles Limited", "price": 266.35, "change": 1.08},
    "TMCV.NS": {"name": "Tata Motors Limited", "price": 456.75, "change": 2.5},
    "SUNPHARMA.NS": {"name": "Sun Pharmaceutical", "price": 1884.90, "change": -0.79},
    "TITAN.NS": {"name": "Titan Company Limited", "price": 4620.00, "change": -1.7},
    "BAJFINANCE.NS": {"name": "Bajaj Finance Limited", "price": 1122.00, "change": 2.67},
    "NESTLEIND.NS": {"name": "Nestle India Limited", "price": 1325.00, "change": 1.66},
    "TATASTEEL.NS": {"name": "Tata Steel Limited", "price": 178.00, "change": -1.6},
    "POWERGRID.NS": {"name": "Power Grid Corporation", "price": 269.00, "change": 1.7},
    "NTPC.NS": {"name": "NTPC Limited", "price": 321.50, "change": -1.08},
    "ONGC.NS": {"name": "Oil & Natural Gas Corp", "price": 223.46, "change": -0.47},
    "COALINDIA.NS": {"name": "Coal India Limited", "price": 390.00, "change": -0.38},
}

MOCK_INDICES = {
    "^NSEI": {"name": "NIFTY 50", "price": 25800.60, "change": 1.12},
    "^BSESN": {"name": "SENSEX", "price": 83919.71, "change": 1.08},
    "^CNXIT": {"name": "NIFTY IT", "price": 31322.65, "change": 1.3},
    "^NSEBANK": {"name": "NIFTY Bank", "price": 64635.20, "change": 2.49},
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
    
    # Seconds a fetched quote is reused before hitting the provider again
    CACHE_TTL = 120
    
    def __init__(self):
        """Initialize market data service"""
        self._cache: Dict[str, tuple] = {}
        self._cache_lock = threading.Lock()
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
    
    def _cached(self, key: str, fetch):
        """Return a cached result for key, calling fetch() when missing or stale."""
        now = time.time()
        with self._cache_lock:
            hit = self._cache.get(key)
            if hit and now - hit[0] < self.CACHE_TTL:
                return hit[1]
        value = fetch()
        if value:
            with self._cache_lock:
                self._cache[key] = (now, value)
        return value
    
    def get_current_price(self, symbol: str) -> Optional[Dict]:
        """Get current price (cached for CACHE_TTL seconds)"""
        return self._cached(f"price:{symbol}", lambda: self._fetch_current_price(symbol))
    
    @staticmethod
    def _yahoo_info(symbol: str) -> Optional[Dict]:
        """
        Fetch Yahoo info with price fields taken from fast_info.
        info['previousClose'] can lag a session for indices (wrong day change),
        while fast_info matches the daily price history.
        """
        ticker = yf.Ticker(symbol)
        info = dict(ticker.info or {})
        try:
            fi = ticker.fast_info
            last, prev = fi["lastPrice"], fi["previousClose"]
            if last:
                info["currentPrice"] = info["regularMarketPrice"] = round(float(last), 2)
            if prev:
                info["previousClose"] = info["regularMarketPreviousClose"] = round(float(prev), 2)
            for src, dst in (("open", "open"), ("dayHigh", "dayHigh"), ("dayLow", "dayLow")):
                if fi[src]:
                    info[dst] = round(float(fi[src]), 2)
        except Exception as e:
            logger.debug(f"fast_info unavailable for {symbol}: {e}")
        return info

    def _fetch_current_price(self, symbol: str) -> Optional[Dict]:
        """Get current price - tries Groww, then Yahoo (if available), then Mock"""
        
        # Try Groww API first (when implemented)
        if self.groww_api_key:
            price = self._get_groww_price(symbol)
            if price:
                return price
        
        # Try Yahoo Finance only if available
        if YFINANCE_AVAILABLE and yf:
            try:
                info = self._yahoo_info(symbol)
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
        """Get stock info (cached for CACHE_TTL seconds)"""
        return self._cached(f"info:{symbol}", lambda: self._fetch_stock_info(symbol))
    
    def _fetch_stock_info(self, symbol: str) -> Optional[Dict]:
        """Get stock info with fallback to mock"""
        
        # Try Yahoo Finance only if available
        if YFINANCE_AVAILABLE and yf:
            try:
                info = self._yahoo_info(symbol)
                
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
