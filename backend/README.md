# InviAI Backend API

FastAPI-based backend service for the InviAI portfolio optimization platform.

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── config.py            # Configuration management
│   ├── database.py          # Database connection & session
│   ├── models.py            # SQLAlchemy ORM models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── routers/             # API route handlers
│   │   ├── __init__.py
│   │   └── auth.py          # Authentication endpoints
│   └── services/            # Business logic services
│       ├── __init__.py
│       ├── market_data.py   # (Phase 3) Market data fetching
│       └── optimizer.py     # (Phase 3) Portfolio optimization
├── Dockerfile
├── requirements.txt
└── README.md
```

## 🚀 Features

### Phase 2 (Current) ✅
- **FastAPI Framework**: Modern, fast web framework
- **Database Models**: Users, Portfolios, Assets, Transactions
- **Authentication**: Supabase integration with JWT
- **CORS Middleware**: Configured for frontend communication
- **Error Handling**: Global exception handlers
- **Health Checks**: Database and service monitoring
- **Logging**: Request/response logging
- **API Documentation**: Auto-generated (Swagger/ReDoc)

### Phase 3 (Next)
- Market data integration (Alpha Vantage)
- Portfolio optimization algorithms
- Real-time price updates
- Historical data analysis

## 📊 Database Models

### User
- Supabase authentication integration
- Risk tolerance settings
- Investment goals
- Activity tracking

### Portfolio
- Multi-portfolio support per user
- Value tracking and returns calculation
- Target allocation management
- Optimization history

### Asset
- Symbol, name, and type
- Quantity and cost basis
- Current value and P&L
- Market data caching

### Transaction
- Buy, sell, dividend, deposit, withdrawal
- Full transaction history
- Fee tracking
- Reference IDs for external systems

## 🔐 Authentication Flow

1. **Registration** (`POST /api/auth/register`)
   - Creates Supabase auth user
   - Creates local database record
   - Returns JWT token

2. **Login** (`POST /api/auth/login`)
   - Validates credentials with Supabase
   - Returns JWT token
   - Updates last login timestamp

3. **Protected Routes**
   - Include `Authorization: Bearer <token>` header
   - Token validated with Supabase
   - User loaded from local database

4. **Logout** (`POST /api/auth/logout`)
   - Invalidates token with Supabase

## 📡 API Endpoints

### Root
- `GET /` - API information
- `GET /health` - Health check
- `GET /docs` - Swagger UI documentation
- `GET /redoc` - ReDoc documentation

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /logout` - Logout user
- `GET /me` - Get current user info
- `POST /password-reset` - Request password reset
- `GET /verify-email` - Verify email address

### Coming in Phase 3
- Portfolio management endpoints
- Asset management endpoints
- Market data endpoints
- Optimization endpoints

## 🛠️ Development

### Local Setup (Without Docker)

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Setup (Recommended)

```powershell
# From root directory
docker-compose up -d backend
```

### Database Management

```python
# Initialize database tables
from app.database import init_db
init_db()

# Check connection
from app.database import check_db_connection
check_db_connection()

# Reset database (CAUTION!)
from app.database import reset_db
reset_db()
```

## 🧪 Testing

```powershell
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

## 📝 Environment Variables

Required environment variables (set in root `.env`):

```env
# Database
POSTGRES_USER=inviai_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=inviai_db

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# API Keys
ALPHA_VANTAGE_API_KEY=your_api_key

# Security
SECRET_KEY=your_secret_key
ENVIRONMENT=development
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth via Supabase
- **Password Validation**: Strength requirements enforced
- **SQL Injection Prevention**: SQLAlchemy ORM
- **CORS Protection**: Configured origins only
- **Environment Variables**: No hardcoded secrets
- **Input Validation**: Pydantic schemas
- **Error Sanitization**: No sensitive data in prod errors

## 📚 API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🐛 Debugging

```python
# Enable SQL echo
# In database.py, engine configuration:
echo=True  # Logs all SQL queries

# Adjust log level
# In main.py:
logging.basicConfig(level=logging.DEBUG)
```

## 📦 Dependencies

Key packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - ORM
- `psycopg2-binary` - PostgreSQL driver
- `supabase` - Authentication
- `pydantic` - Data validation
- `python-jose` - JWT handling
- `pandas` - Data analysis (Phase 3)
- `scikit-learn` - ML algorithms (Phase 3)

## 🚀 Deployment

```powershell
# Build production image
docker build -t inviai-backend:latest .

# Run production container
docker run -p 8000:8000 --env-file .env inviai-backend:latest
```

## 📄 License

Proprietary - All rights reserved
