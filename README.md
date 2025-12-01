# InviAI - Intelligent Portfolio Planning & Financial Optimization Platform

InviAI is a secure, scalable, and modular web application that helps users build, manage, and optimize investment portfolios using AI-driven insights.

## 🏗️ Architecture Overview

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: Python with FastAPI
- **Database**: PostgreSQL
- **Authentication**: Supabase
- **AI/ML**: pandas, scikit-learn
- **Data Source**: Yahoo Finance (Free - Indian & Global Markets)
- **Containerization**: Docker & Docker Compose

## 📁 Project Structure

```
InviAI Full/
├── backend/              # FastAPI backend application
├── frontend/             # Next.js frontend application
├── docker-compose.yml    # Docker orchestration
├── .env                  # Environment variables (DO NOT COMMIT)
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)

### Environment Setup

1. **Copy and configure the `.env` file:**
   - Open `.env` in the root directory
   - Fill in your actual credentials:
     - PostgreSQL credentials
     - Supabase URL and keys (from https://app.supabase.com)
     - Alpha Vantage API key (from https://www.alphavantage.co)
     - Generate a strong SECRET_KEY

2. **Get API Keys:**
   - **Supabase**: Sign up at https://supabase.com and create a project
   - **Yahoo Finance**: No API key needed - completely free!

### Running the Application

```powershell
# Start all services (database, backend, frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start (after code changes)
docker-compose up -d --build
```

### Service URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432

## 🔒 Security Features

- Environment-based configuration (no hardcoded secrets)
- Supabase authentication with JWT tokens
- CORS middleware protection
- PostgreSQL with secure connections
- Input validation on all API endpoints
- SQL injection prevention via SQLAlchemy ORM

## 🧪 Development

### Backend Development

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```powershell
cd frontend
npm install
npm run dev
```

## 📊 Core Features (Planned)

- ✅ User authentication and authorization
- ✅ Portfolio creation and management
- ✅ Real-time market data integration
- ✅ AI-powered portfolio optimization
- ✅ Risk analysis and diversification insights
- ✅ Historical performance tracking
- ✅ Interactive charts and visualizations

## 🛠️ Technology Stack Details

### Backend
- **FastAPI**: Modern, fast web framework for Python
- **SQLAlchemy**: SQL toolkit and ORM
- **Supabase**: Authentication and real-time database
- **yfinance**: Market data (Indian & Global stocks)
- **pandas**: Data manipulation and analysis
- **scikit-learn**: Machine learning algorithms

### Frontend
- **Next.js**: React framework with SSR/SSG
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Composable charting library
- **Zustand/Context**: State management

### Infrastructure
- **Docker**: Containerization
- **PostgreSQL**: Relational database
- **Nginx**: (Future) Reverse proxy and load balancer

## 📝 License

Proprietary - All rights reserved

## 👥 Contributing

This is a private project. For questions or contributions, please contact the development team.

---

**Status**: 🚧 Under Development
**Version**: 0.1.0 (Alpha)
