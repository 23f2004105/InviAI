# 🚀 InviAI Quick Start Guide

## ✅ What's Ready

### Phase 1 ✅ Complete
- Project structure
- Docker configuration
- Environment setup

### Phase 2 ✅ Complete
- FastAPI backend
- PostgreSQL database
- Supabase authentication
- Database models (User, Portfolio, Asset, Transaction)

### Market Data ✅ Ready
- Yahoo Finance integration
- Indian stock market support (NSE/BSE)
- Global market support
- No API key needed!

## 🎯 Quick Setup

### 1. Update Environment Variables

Edit `.env` file and set these **required** values:

```properties
# Generate a secure SECRET_KEY
SECRET_KEY=<run command below to generate>

# Set a secure database password
POSTGRES_PASSWORD=<your-secure-password>

# Already configured ✅
SUPABASE_URL=https://zqcrrtbrtbefqawfykhu.supabase.co
SUPABASE_KEY=<already-set>
SUPABASE_ANON_KEY=<already-set>
MARKET_DATA_SOURCE=yahoo_finance
```

**Generate SECRET_KEY:**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Start the Application

```powershell
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### 3. Initialize Database

```powershell
# Initialize database tables
docker-compose exec backend python init_db.py
```

### 4. Test Market Data

```powershell
# Test Indian stock market data
docker-compose exec backend python test_market_data.py
```

### 5. Access the API

- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## 🔐 Test Authentication

### Register a New User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "full_name": "Test User"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

## 📊 Test Indian Stock Data (Python)

```python
from app.services.market_data import get_indian_stock_price, get_nifty_50

# Get Reliance stock price
price = get_indian_stock_price("RELIANCE")
print(f"Reliance: ₹{price['current_price']}")

# Get Nifty 50
nifty = get_nifty_50()
print(f"Nifty 50: {nifty['current_price']}")
```

## 🇮🇳 Popular Indian Stocks

Try these symbols (add .NS suffix):

```
RELIANCE.NS    - Reliance Industries
TCS.NS         - Tata Consultancy Services
HDFCBANK.NS    - HDFC Bank
INFY.NS        - Infosys
ICICIBANK.NS   - ICICI Bank
BHARTIARTL.NS  - Bharti Airtel
SBIN.NS        - State Bank of India
ITC.NS         - ITC Limited
LT.NS          - Larsen & Toubro
KOTAKBANK.NS   - Kotak Mahindra Bank
```

## 🛑 Common Issues

### Issue: Docker containers won't start
**Solution**: Check Docker Desktop is running
```powershell
docker --version
docker-compose --version
```

### Issue: Database connection failed
**Solution**: Wait for database to be ready (can take 30 seconds on first start)
```powershell
docker-compose logs db
```

### Issue: Import errors in Python
**Solution**: Install dependencies
```powershell
docker-compose exec backend pip install -r requirements.txt
```

### Issue: Can't fetch stock data
**Solution**: Check internet connection and symbol format
```
Correct: RELIANCE.NS
Wrong: RELIANCE, RELIANCE.NSE
```

## 📁 Project Structure

```
InviAI Full/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI app
│   │   ├── models.py          # Database models
│   │   ├── database.py        # Database setup
│   │   ├── routers/
│   │   │   └── auth.py        # Auth endpoints ✅
│   │   └── services/
│   │       └── market_data.py # Market data ✅
│   ├── Dockerfile
│   ├── requirements.txt
│   └── test_market_data.py
├── frontend/                   # Next.js (Phase 4)
├── docker-compose.yml          # Docker orchestration
├── .env                        # Environment config
├── README.md
├── INDIAN_MARKET_GUIDE.md     # Indian stocks guide
└── YAHOO_FINANCE_INTEGRATION.md
```

## 🎯 Next Steps

Choose your path:

### Option A: Complete Phase 3 (AI Core)
- Market data API endpoints
- Portfolio optimization algorithm
- Risk analysis
- Efficient frontier calculation

### Option B: Start Phase 4 (Frontend)
- Next.js setup
- Authentication UI
- Dashboard design
- Portfolio charts

## 📚 Documentation

- **Main README**: Project overview
- **Backend README**: Backend documentation
- **Indian Market Guide**: Complete guide for Indian stocks
- **Yahoo Finance Integration**: Market data documentation
- **Phase 2 Complete**: Backend completion summary

## 🆘 Need Help?

### Check Logs
```powershell
# All services
docker-compose logs

# Backend only
docker-compose logs backend

# Follow logs
docker-compose logs -f
```

### Restart Services
```powershell
# Restart all
docker-compose restart

# Restart backend only
docker-compose restart backend
```

### Clean Reset
```powershell
# Stop and remove everything
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## ✅ Verification Checklist

Before proceeding:

- [ ] Docker containers running (`docker-compose ps`)
- [ ] Database initialized (`init_db.py` successful)
- [ ] API accessible (http://localhost:8000)
- [ ] API docs working (http://localhost:8000/docs)
- [ ] Health check passing (http://localhost:8000/health)
- [ ] Market data working (`test_market_data.py` successful)
- [ ] Can register/login users
- [ ] Environment variables configured (`.env`)

---

**Ready to build the AI-powered portfolio optimizer! 🚀🇮🇳**

Choose Phase 3 (AI) or Phase 4 (Frontend) and let's continue!
