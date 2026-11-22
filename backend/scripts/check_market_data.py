"""
Test Yahoo Finance API with Indian Stock Market Data
Run this to verify market data service is working
"""

import sys
from pathlib import Path

# Make the backend package importable (run: python scripts/check_market_data.py)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.market_data import (
    market_data_service,
    get_indian_stock_price,
    get_nifty_50,
    get_sensex,
    POPULAR_INDIAN_STOCKS
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_indian_stocks():
    """Test fetching Indian stock prices"""
    print("\n" + "=" * 60)
    print("Testing Indian Stock Market Data (Yahoo Finance)")
    print("=" * 60 + "\n")
    
    # Test individual stocks
    test_symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK"]
    
    print("📊 Fetching Current Prices:\n")
    
    for symbol in test_symbols:
        print(f"🔍 {symbol}...")
        price_data = get_indian_stock_price(symbol, "NSE")
        
        if price_data:
            print(f"   ✅ Symbol: {price_data['symbol']}")
            print(f"   💰 Current Price: ₹{price_data['current_price']:,.2f}")
            print(f"   📈 Day High: ₹{price_data['high']:,.2f}")
            print(f"   📉 Day Low: ₹{price_data['low']:,.2f}")
            print(f"   📊 Volume: {price_data['volume']:,}")
            if price_data.get('market_cap'):
                print(f"   🏢 Market Cap: ₹{price_data['market_cap']:,.0f}")
            print()
        else:
            print(f"   ❌ Failed to fetch data for {symbol}\n")


def test_indices():
    """Test fetching Indian market indices"""
    print("\n" + "=" * 60)
    print("📊 Indian Market Indices")
    print("=" * 60 + "\n")
    
    # Test Nifty 50
    print("🔍 Fetching NIFTY 50...")
    nifty = get_nifty_50()
    if nifty:
        print(f"   ✅ Current Level: {nifty['current_price']:,.2f}")
        print(f"   📈 Day High: {nifty['high']:,.2f}")
        print(f"   📉 Day Low: {nifty['low']:,.2f}")
    print()
    
    # Test Sensex
    print("🔍 Fetching SENSEX...")
    sensex = get_sensex()
    if sensex:
        print(f"   ✅ Current Level: {sensex['current_price']:,.2f}")
        print(f"   📈 Day High: {sensex['high']:,.2f}")
        print(f"   📉 Day Low: {sensex['low']:,.2f}")
    print()


def test_historical_data():
    """Test fetching historical data"""
    print("\n" + "=" * 60)
    print("📈 Historical Data Test")
    print("=" * 60 + "\n")
    
    symbol = "RELIANCE.NS"
    print(f"🔍 Fetching 1-month history for {symbol}...")
    
    rows = market_data_service.get_stock_history(symbol, period="1mo", interval="1d")

    if rows:
        # Yahoo rows use 'Close'/'Date', mock rows use 'close'/'date'
        closes = [r.get('Close', r.get('close')) for r in rows]
        date_of = lambda r: str(r.get('Date', r.get('date')))[:10]
        print(f"   ✅ Retrieved {len(rows)} days of data")
        print(f"   📅 Date Range: {date_of(rows[0])} to {date_of(rows[-1])}")
        print(f"   💰 Closing Prices:")
        print(f"      Latest: ₹{closes[-1]:,.2f}")
        print(f"      Highest: ₹{max(closes):,.2f}")
        print(f"      Lowest: ₹{min(closes):,.2f}")
    else:
        print("   ❌ Failed to fetch historical data")
    print()


def test_stock_info():
    """Test fetching detailed stock information"""
    print("\n" + "=" * 60)
    print("ℹ️  Detailed Stock Information")
    print("=" * 60 + "\n")
    
    symbol = "TCS.NS"
    print(f"🔍 Fetching info for {symbol}...")
    
    info = market_data_service.get_stock_info(symbol)
    
    if info:
        print(f"   ✅ Name: {info.get('name')}")
        print(f"   🏢 Sector: {info.get('sector')}")
        print(f"   🏭 Industry: {info.get('industry')}")
        print(f"   💰 Market Cap: ₹{info.get('market_cap', 0):,.0f}")
        print(f"   📊 P/E Ratio: {info.get('pe_ratio', 'N/A')}")
        print(f"   📈 52W High: ₹{info.get('52_week_high', 0):,.2f}")
        print(f"   📉 52W Low: ₹{info.get('52_week_low', 0):,.2f}")
        print(f"   💵 Dividend Yield: {info.get('dividend_yield', 0) * 100:.2f}%" if info.get('dividend_yield') else "   💵 Dividend Yield: N/A")
    else:
        print("   ❌ Failed to fetch stock info")
    print()


def show_popular_stocks():
    """Show list of popular Indian stocks"""
    print("\n" + "=" * 60)
    print("🇮🇳 Popular Indian Stocks Supported")
    print("=" * 60 + "\n")
    
    for i, (symbol, name) in enumerate(list(POPULAR_INDIAN_STOCKS.items())[:10], 1):
        print(f"{i:2d}. {symbol:15s} - {name}")
    
    print(f"\n   Total: {len(POPULAR_INDIAN_STOCKS)} stocks available")
    print()


def main():
    """Run all tests"""
    try:
        print("\n" + "🇮🇳" * 30)
        print("InviAI - Yahoo Finance Indian Market Data Test")
        print("🇮🇳" * 30)
        
        # Show supported stocks
        show_popular_stocks()
        
        # Run tests
        test_indian_stocks()
        test_indices()
        test_historical_data()
        test_stock_info()
        
        print("\n" + "=" * 60)
        print("✅ All Tests Complete!")
        print("=" * 60 + "\n")
        
        print("💡 Tips:")
        print("   - Use .NS suffix for NSE stocks (e.g., RELIANCE.NS)")
        print("   - Use .BO suffix for BSE stocks (e.g., RELIANCE.BO)")
        print("   - NSE is generally more liquid and recommended")
        print("   - Data is free and real-time (15-20 min delay)")
        print()
        
    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        return False
    
    return True


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(1)
