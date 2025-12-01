# 🇮🇳 InviAI - Indian Stock Market Integration Guide

## Overview

InviAI now uses **Yahoo Finance** for market data, providing **free access** to Indian stock market data with no API key required!

## Supported Markets

### Indian Stock Exchanges
- **NSE (National Stock Exchange)** - Primary exchange (recommended)
- **BSE (Bombay Stock Exchange)** - Alternative exchange

### Symbol Format

Indian stocks require exchange suffixes:

```
Symbol Format: <STOCK_SYMBOL>.<EXCHANGE>

Examples:
  RELIANCE.NS  → Reliance Industries on NSE
  TCS.NS       → Tata Consultancy Services on NSE
  INFY.BO      → Infosys on BSE
```

### Indices Supported

```python
^NSEI      # Nifty 50
^BSESN     # BSE Sensex
^NSEBANK   # Nifty Bank
^CNXIT     # Nifty IT
```

## Popular Indian Stocks

### Top 20 Stocks by Market Cap

| Symbol | Company Name | Sector |
|--------|-------------|---------|
| RELIANCE.NS | Reliance Industries | Conglomerate |
| TCS.NS | Tata Consultancy Services | IT Services |
| HDFCBANK.NS | HDFC Bank | Banking |
| INFY.NS | Infosys | IT Services |
| HINDUNILVR.NS | Hindustan Unilever | FMCG |
| ICICIBANK.NS | ICICI Bank | Banking |
| BHARTIARTL.NS | Bharti Airtel | Telecom |
| ITC.NS | ITC Limited | Conglomerate |
| SBIN.NS | State Bank of India | Banking |
| LT.NS | Larsen & Toubro | Engineering |
| KOTAKBANK.NS | Kotak Mahindra Bank | Banking |
| AXISBANK.NS | Axis Bank | Banking |
| BAJFINANCE.NS | Bajaj Finance | Finance |
| ASIANPAINT.NS | Asian Paints | Paints |
| MARUTI.NS | Maruti Suzuki | Automobile |
| TITAN.NS | Titan Company | Consumer |
| WIPRO.NS | Wipro | IT Services |
| HCLTECH.NS | HCL Technologies | IT Services |
| ULTRACEMCO.NS | UltraTech Cement | Cement |
| NESTLEIND.NS | Nestle India | FMCG |

## Usage Examples

### 1. Get Current Price

```python
from app.services.market_data import get_indian_stock_price

# Fetch Reliance stock price from NSE
price = get_indian_stock_price("RELIANCE", "NSE")

print(f"Current Price: ₹{price['current_price']}")
print(f"Day High: ₹{price['high']}")
print(f"Day Low: ₹{price['low']}")
print(f"Volume: {price['volume']:,}")
```

### 2. Get Index Data

```python
from app.services.market_data import get_nifty_50, get_sensex

# Nifty 50
nifty = get_nifty_50()
print(f"Nifty 50: {nifty['current_price']:,.2f}")

# Sensex
sensex = get_sensex()
print(f"Sensex: {sensex['current_price']:,.2f}")
```

### 3. Get Historical Data

```python
from app.services.market_data import market_data_service

# Get 1 year of daily data
df = market_data_service.get_historical_data(
    symbol="TCS.NS",
    period="1y",
    interval="1d"
)

print(df.head())
```

### 4. Get Stock Information

```python
from app.services.market_data import market_data_service

info = market_data_service.get_stock_info("INFY.NS")

print(f"Company: {info['name']}")
print(f"Sector: {info['sector']}")
print(f"Market Cap: ₹{info['market_cap']:,}")
print(f"P/E Ratio: {info['pe_ratio']}")
```

### 5. Calculate Returns

```python
from app.services.market_data import market_data_service

returns = market_data_service.calculate_returns("HDFCBANK.NS")

print(f"Total Return: {returns['total_return_percent']:.2f}%")
print(f"Volatility: {returns['annualized_volatility_percent']:.2f}%")
```

## Testing Market Data

Run the test script to verify everything works:

```powershell
# Without Docker (local Python)
cd backend
python test_market_data.py

# With Docker
docker-compose exec backend python test_market_data.py
```

Expected output:
```
🇮🇳 Indian Stock Market Data Test
========================================

📊 Fetching Current Prices:

🔍 RELIANCE...
   ✅ Symbol: RELIANCE.NS
   💰 Current Price: ₹2,450.50
   📈 Day High: ₹2,475.00
   📉 Day Low: ₹2,430.00
   📊 Volume: 5,234,567

...
```

## Data Characteristics

### Update Frequency
- **Real-time data** with 15-20 minute delay (free tier)
- Perfect for portfolio tracking and analysis
- Not suitable for day trading (use paid services for real-time)

### Market Hours
- **Trading Hours**: 9:15 AM - 3:30 PM IST (Mon-Fri)
- **Pre-market**: 9:00 AM - 9:15 AM IST
- **Post-market**: 3:40 PM - 4:00 PM IST

### Data Available
✅ Current prices and quotes  
✅ Historical data (daily, weekly, monthly)  
✅ Company fundamentals (P/E, Market Cap, etc.)  
✅ Corporate actions (dividends, splits)  
✅ Indices data  
✅ Volume and turnover  

## Currency

All Indian stock prices are in **INR (₹ - Indian Rupees)**

## API Endpoints (Phase 3)

Once Phase 3 is complete, these endpoints will be available:

```
GET  /api/market/price/{symbol}          # Get current price
GET  /api/market/quote/{symbol}          # Get detailed quote
GET  /api/market/history/{symbol}        # Get historical data
GET  /api/market/info/{symbol}           # Get company info
GET  /api/market/search?q={query}        # Search stocks
GET  /api/market/indices                 # Get all indices
POST /api/market/prices                  # Bulk price fetch
```

## Configuration

In your `.env` file:

```properties
# Market Data Configuration
MARKET_DATA_SOURCE=yahoo_finance

# No API key required for Yahoo Finance!
```

## Advantages of Yahoo Finance

✅ **Free** - No API key or paid subscription needed  
✅ **Comprehensive** - Covers NSE, BSE, and global markets  
✅ **Reliable** - Backed by Yahoo/Verizon infrastructure  
✅ **Rich Data** - Fundamentals, technicals, and corporate actions  
✅ **Python Library** - Easy integration with `yfinance`  
✅ **Indian Focus** - Full coverage of Indian stocks and indices  

## Limitations

⚠️ 15-20 minute delay (free tier)  
⚠️ Rate limiting on heavy usage  
⚠️ No Level 2 order book data  
⚠️ Limited to publicly traded securities  

## Alternative Data Sources (Future)

If you need real-time data, consider:

1. **NSE API** - Official NSE data feeds (paid)
2. **BSE API** - Official BSE data feeds (paid)
3. **Zerodha Kite** - Real-time data for Zerodha users
4. **Upstox API** - Real-time data for Upstox users
5. **Alpha Vantage** - Has some Indian stocks (limited)

## Best Practices

1. **Cache Aggressively**: Store prices in database to reduce API calls
2. **Use NSE**: Generally more liquid than BSE
3. **Batch Requests**: Fetch multiple symbols together
4. **Respect Limits**: Don't hammer the API
5. **Handle Errors**: Some stocks may have missing data
6. **Timezone Aware**: All times are in IST

## Sample Portfolio - Indian Tech Stocks

```python
tech_portfolio = [
    "TCS.NS",       # Tata Consultancy Services
    "INFY.NS",      # Infosys
    "WIPRO.NS",     # Wipro
    "HCLTECH.NS",   # HCL Technologies
    "TECHM.NS",     # Tech Mahindra
    "LTI.NS",       # LTI Mindtree
    "COFORGE.NS",   # Coforge
]
```

## Sample Portfolio - Indian Banking Stocks

```python
banking_portfolio = [
    "HDFCBANK.NS",  # HDFC Bank
    "ICICIBANK.NS", # ICICI Bank
    "KOTAKBANK.NS", # Kotak Mahindra Bank
    "AXISBANK.NS",  # Axis Bank
    "SBIN.NS",      # State Bank of India
    "INDUSINDBK.NS",# IndusInd Bank
]
```

## Troubleshooting

### Issue: Symbol not found
**Solution**: Verify the symbol format includes exchange suffix (.NS or .BO)

### Issue: No data returned
**Solution**: Check if market is open or if stock is actively traded

### Issue: Import error for yfinance
**Solution**: Install dependencies: `pip install yfinance pandas`

### Issue: Slow performance
**Solution**: Implement caching using the MarketDataCache model

## Resources

- **Yahoo Finance**: https://finance.yahoo.com
- **NSE India**: https://www.nseindia.com
- **BSE India**: https://www.bseindia.com
- **yfinance Docs**: https://pypi.org/project/yfinance/

## Next Steps

1. ✅ Market data service created
2. 🔄 Create market data API endpoints (Phase 3)
3. 🔄 Implement caching layer
4. 🔄 Add portfolio optimization with Indian stocks
5. 🔄 Build frontend charts for Indian market data

---

**Ready to optimize your Indian stock portfolio with AI! 🚀🇮🇳**
