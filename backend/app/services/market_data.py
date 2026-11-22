"""
Market Data Service - Multi-Provider Integration
Supports: Yahoo Finance (primary) and Mock Data (fallback)
"""

from typing import Optional, Dict, List, Union
from datetime import datetime, timedelta
import logging
import random
import os
import time
import threading

# Optional imports - graceful fallback if not installed
try:
    import yfinance as yf
    import pandas as pd
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    yf = None
    pd = None

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
    Priority: Yahoo Finance > Mock Data
    
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
        self.use_mock = os.getenv("USE_MOCK_DATA", "true").lower() == "true"

        if YFINANCE_AVAILABLE:
            logger.info("📊 Market Data Service initialized with Yahoo Finance (mock fallback)")
        else:
            logger.info("📊 Market Data Service initialized with Mock Data ('yfinance' not installed)")

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
        """Get current price - tries Yahoo (if available), then Mock"""
        
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
