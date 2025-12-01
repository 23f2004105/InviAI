# InviAI - Intelligent Portfolio Management Platform

A full-stack portfolio management application with real-time market data integration, built for the Indian stock market (NSE/BSE).

## 🚀 Features

- **User Authentication**: Local JWT-based authentication with secure password hashing
- **Portfolio Management**: Create and manage multiple investment portfolios
- **Real-time Market Data**: Integration with Yahoo Finance API for live stock prices
- **Indian Market Focus**: NSE & BSE stocks with INR currency support
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **RESTful API**: FastAPI backend with comprehensive documentation

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Relational database
- **SQLAlchemy** - ORM
- **JWT** - Authentication tokens
- **Pydantic** - Data validation

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## 🔧 Installation

### 1. Clone the repository

\`\`\`bash
git clone https://github.com/yourusername/inviai.git
cd inviai
\`\`\`

### 2. Backend Setup

\`\`\`bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file with:
DATABASE_URL=postgresql://postgres:password@localhost:5432/inviai_db
SECRET_KEY=your-secret-key-here
\`\`\`

### 3. Database Setup

\`\`\`bash
# Create PostgreSQL database
createdb inviai_db

# Run database initialization
python init_db.py
\`\`\`

### 4. Frontend Setup

\`\`\`bash
cd ../InviAI-Frontend

# Install dependencies
npm install

# Set up environment variables
# Create .env.local file with:
NEXT_PUBLIC_API_URL=http://localhost:8000
\`\`\`

## 🚀 Running the Application

### Start Backend Server

\`\`\`bash
cd backend
uvicorn app.main:app --reload --port 8000
\`\`\`

Backend will be available at: http://localhost:8000
API Documentation: http://localhost:8000/docs

### Start Frontend Server

\`\`\`bash
cd InviAI-Frontend
npm run dev
\`\`\`

Frontend will be available at: http://localhost:3000

## 📝 Usage

1. **Register**: Create a new account at `/register`
   - Password must be 8+ characters with 1 uppercase letter and 1 digit
   
2. **Login**: Sign in at `/login` with your credentials

3. **Dashboard**: View your portfolio overview and market data

4. **Add Assets**: Add stocks to your portfolio with purchase details

5. **Track Performance**: Monitor your portfolio performance and returns

## 🔐 Authentication

The application uses JWT-based authentication with the following endpoints:

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get access token
- `POST /api/auth/logout` - Logout (clear token)
- `GET /api/auth/me` - Get current user info

Passwords are hashed using SHA-256 with salt for security.

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Portfolios
- `GET /api/portfolios` - List user portfolios
- `POST /api/portfolios` - Create portfolio
- `GET /api/portfolios/{id}` - Get portfolio details
- `PUT /api/portfolios/{id}` - Update portfolio
- `DELETE /api/portfolios/{id}` - Delete portfolio

### Assets
- `GET /api/assets` - List portfolio assets
- `POST /api/assets` - Add asset
- `GET /api/assets/{id}` - Get asset details
- `PUT /api/assets/{id}` - Update asset
- `DELETE /api/assets/{id}` - Delete asset

### Market Data
- `GET /api/market/search` - Search stocks
- `GET /api/market/quote/{symbol}` - Get stock quote
- `GET /api/market/history/{symbol}` - Get historical data

## 🐳 Docker Deployment

\`\`\`bash
# Build and run with Docker Compose
docker-compose up -d
\`\`\`

## 📁 Project Structure

\`\`\`
InviAI Full/
├── backend/
│   ├── app/
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── main.py          # Application entry
│   ├── requirements.txt
│   └── Dockerfile
├── InviAI-Frontend/
│   ├── app/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utilities
│   │   └── (routes)/        # Page components
│   ├── package.json
│   └── next.config.ts
└── docker-compose.yml
\`\`\`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Yahoo Finance API for market data
- FastAPI and Next.js communities
- Indian stock market (NSE/BSE)

## 📞 Support

For issues and questions, please open an issue on GitHub.
