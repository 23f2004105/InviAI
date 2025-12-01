# InviAI Frontend - Indian Portfolio Management Dashboard

A high-fidelity, interactive frontend MVP/prototype for InviAI - a modern portfolio management and investment tracking platform built with Next.js, TypeScript, and Tailwind CSS. Designed specifically for **Indian stock market (NSE/BSE)** with **Indian Rupee (₹)** as the base currency.

![InviAI Dashboard](https://img.shields.io/badge/Status-MVP-success)
![Next.js](https://img.shields.io/badge/Next.js-15.5.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.0-cyan)
![Market](https://img.shields.io/badge/Market-NSE%2FBSE-orange)
![Currency](https://img.shields.io/badge/Currency-INR%20₹-green)

## 🎯 Project Overview

InviAI is a visually polished and responsive user interface that demonstrates the core user flow of a portfolio management platform for Indian investors. This is a **frontend-only prototype** with all backend functionality completely mocked - no real API calls are made.

## ✨ Features

- 📊 **Interactive Dashboard** - Real-time portfolio overview with comprehensive statistics in INR (₹)
- 📈 **Data Visualizations** - Beautiful charts using Recharts (donut charts, line charts, area charts)
- 💼 **Portfolio Management** - View multiple portfolios with detailed asset allocations
- 🇮🇳 **Indian Stock Market** - Features stocks from NSE/BSE (Reliance, TCS, Infosys, HDFC Bank, etc.)
- � **Indian Rupee (₹)** - All monetary values displayed in INR with Indian number formatting
- �📱 **Fully Responsive** - Seamless experience on desktop, tablet, and mobile devices
- 🌓 **Dark Mode Support** - Toggle between light and dark themes
- 🎨 **Modern UI/UX** - Clean, professional design with smooth animations
- 🔄 **Mock Data Layer** - Realistic Indian financial data simulation with artificial API latency

## 🛠️ Technology Stack

- **Framework**: Next.js 15.5.5 with App Router
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 3.4.0
- **Charts**: Recharts 2.15.0
- **Icons**: Lucide React 0.462.0
- **State Management**: React Context API

## 📁 Project Structure

```
inviai-frontend/
├── app/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── AssetTable.tsx         # Asset list table component
│   │   │   ├── PortfolioDonutChart.tsx # Donut chart for asset allocation
│   │   │   └── PortfolioValueChart.tsx # Line/area chart for portfolio value
│   │   ├── layout/
│   │   │   ├── Navbar.tsx             # Top navigation bar
│   │   │   └── Sidebar.tsx            # Side navigation menu
│   │   └── ui/
│   │       ├── Button.tsx             # Reusable button component
│   │       ├── Card.tsx               # Reusable card component
│   │       └── Input.tsx              # Reusable input component
│   ├── contexts/
│   │   └── UserContext.tsx            # User state management
│   ├── dashboard/
│   │   └── page.tsx                   # Main dashboard page
│   ├── lib/
│   │   ├── api.ts                     # Simulated API calls
│   │   └── mockData.ts                # Mock financial data
│   ├── globals.css                    # Global styles
│   ├── layout.tsx                     # Root layout with providers
│   └── page.tsx                       # Home page (redirects to dashboard)
├── next.config.ts                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript configuration
└── package.json                       # Project dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. **Clone the repository** (or navigate to the project directory)
   ```bash
   cd inviai-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📊 Mock Data

The application uses comprehensive mock data located in `app/lib/mockData.ts`:

- **User Data**: Indian user profile (Arjun Sharma) with avatar and total net worth in INR
- **Portfolios**: 3 different portfolios (Growth, Crypto, Stable Income)
- **Indian Stocks**: Reliance, TCS, Infosys, HDFC Bank, Bharti Airtel, ITC
- **Indian ETFs**: NIFTYBEES, GOLDBEES, LIQUIDBEES
- **Cryptocurrency**: Bitcoin (BTC), Ethereum (ETH), Solana (SOL) - priced in INR
- **Historical Data**: 30 days of historical price data for all assets
- **Market Stats**: Simulated NSE/BSE market statistics in INR

All API calls in `app/lib/api.ts` include artificial delays (300-600ms) to simulate network latency.

## 🎨 Component Library

### UI Components

- **Button**: Multiple variants (primary, secondary, outline, ghost, danger)
- **Card**: Flexible container with header, title, and content sections
- **Input**: Form input with label, error states, and icon support

### Dashboard Components

- **PortfolioDonutChart**: Interactive donut chart showing asset allocation
- **PortfolioValueChart**: Line/area chart for portfolio value over time
- **AssetTable**: Sortable table displaying asset details

### Layout Components

- **Navbar**: Top navigation with search, notifications, and user menu
- **Sidebar**: Collapsible side menu with navigation links

## 🎯 Key Features Implementation

### Responsive Design
- Mobile-first approach using Tailwind CSS
- Hamburger menu for mobile devices
- Adaptive grid layouts for different screen sizes

### Data Visualization
- Recharts library for interactive charts
- Custom tooltips with detailed information
- Color-coded performance indicators

### State Management
- React Context API for global state
- UserContext provides user and portfolio data
- Async data loading with loading states

### Dark Mode
- Toggle between light and dark themes
- Tailwind CSS dark mode classes
- Persistent theme preference (can be extended)

## 🔮 Future Enhancements

- Add more portfolio pages (detailed view, analytics)
- Implement asset detail pages
- Add portfolio creation and editing
- Include transaction history
- Add real-time price updates (with WebSocket simulation)
- Implement user settings and preferences
- Add export functionality (PDF reports)
- Include advanced analytics and insights

## 📝 License

This project is for demonstration purposes as an MVP/prototype.

## 👨‍💻 Development Notes

- **No Real API**: All backend functionality is mocked
- **TypeScript**: Fully typed for better development experience
- **Component-Driven**: Small, reusable, and maintainable components
- **Performance**: Optimized with Next.js App Router and React Server Components where applicable
- **Accessibility**: Semantic HTML and ARIA labels (can be further enhanced)

## 🤝 Contributing

This is a prototype/MVP. For production use, consider:
- Adding proper form validation
- Implementing real API integration
- Adding comprehensive error handling
- Including unit and integration tests
- Enhancing accessibility features
- Optimizing performance with React.memo and useMemo

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
