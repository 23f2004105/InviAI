// Mock data for InviAI Frontend
// This file contains realistic financial data to simulate a live backend

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  totalNetWorth: number;
  currency: string;
}

export interface Asset {
  ticker: string;
  name: string;
  quantity: number;
  currentPrice: number;
  value: number;
  weight: number;
  changePercent24h: number;
  assetType: 'stock' | 'crypto' | 'etf' | 'bond';
}

export interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  change24h: number;
  changePercent24h: number;
  assets: Asset[];
  createdAt: string;
  color: string;
}

export interface HistoricalDataPoint {
  date: string;
  value: number;
  timestamp: number;
}

// Mock User Data
export const mockUser: User = {
  id: 'user-001',
  name: 'Arjun Sharma',
  email: 'arjun.sharma@inviai.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun',
  totalNetWorth: 4025000.00,
  currency: 'INR'
};

// Mock Portfolio Data
export const mockPortfolios: Portfolio[] = [
  {
    id: 'portfolio-001',
    name: 'Growth Portfolio',
    totalValue: 2360000.00,
    change24h: 28500.00,
    changePercent24h: 1.22,
    color: '#3b82f6',
    createdAt: '2024-01-15',
    assets: [
      {
        ticker: 'RELIANCE',
        name: 'Reliance Industries Ltd.',
        quantity: 150,
        currentPrice: 2850.50,
        value: 427575.00,
        weight: 18.12,
        changePercent24h: 1.8,
        assetType: 'stock'
      },
      {
        ticker: 'TCS',
        name: 'Tata Consultancy Services Ltd.',
        quantity: 200,
        currentPrice: 3680.25,
        value: 736050.00,
        weight: 31.19,
        changePercent24h: 2.1,
        assetType: 'stock'
      },
      {
        ticker: 'INFY',
        name: 'Infosys Ltd.',
        quantity: 300,
        currentPrice: 1545.75,
        value: 463725.00,
        weight: 19.65,
        changePercent24h: 1.5,
        assetType: 'stock'
      },
      {
        ticker: 'HDFCBANK',
        name: 'HDFC Bank Ltd.',
        quantity: 250,
        currentPrice: 1685.50,
        value: 421375.00,
        weight: 17.85,
        changePercent24h: 0.8,
        assetType: 'stock'
      },
      {
        ticker: 'BHARTIARTL',
        name: 'Bharti Airtel Ltd.',
        quantity: 180,
        currentPrice: 1520.75,
        value: 273735.00,
        weight: 11.60,
        changePercent24h: -0.5,
        assetType: 'stock'
      },
      {
        ticker: 'ITC',
        name: 'ITC Ltd.',
        quantity: 100,
        currentPrice: 375.40,
        value: 37540.00,
        weight: 1.59,
        changePercent24h: 0.3,
        assetType: 'stock'
      }
    ]
  },
  {
    id: 'portfolio-002',
    name: 'Crypto Holdings',
    totalValue: 1040000.00,
    change24h: -15350.00,
    changePercent24h: -1.45,
    color: '#f59e0b',
    createdAt: '2024-03-10',
    assets: [
      {
        ticker: 'BTC',
        name: 'Bitcoin',
        quantity: 0.15,
        currentPrice: 5390000.00,
        value: 808500.00,
        weight: 77.74,
        changePercent24h: -2.1,
        assetType: 'crypto'
      },
      {
        ticker: 'ETH',
        name: 'Ethereum',
        quantity: 0.8,
        currentPrice: 269500.00,
        value: 215600.00,
        weight: 20.73,
        changePercent24h: -0.8,
        assetType: 'crypto'
      },
      {
        ticker: 'SOL',
        name: 'Solana',
        quantity: 1.5,
        currentPrice: 11050.00,
        value: 16575.00,
        weight: 1.59,
        changePercent24h: 3.5,
        assetType: 'crypto'
      }
    ]
  },
  {
    id: 'portfolio-003',
    name: 'Stable Income',
    totalValue: 625000.00,
    change24h: 1050.00,
    changePercent24h: 0.17,
    color: '#10b981',
    createdAt: '2023-11-20',
    assets: [
      {
        ticker: 'NIFTYBEES',
        name: 'Nippon India ETF Nifty BeES',
        quantity: 1200,
        currentPrice: 255.50,
        value: 306600.00,
        weight: 49.06,
        changePercent24h: 0.3,
        assetType: 'etf'
      },
      {
        ticker: 'GOLDBEES',
        name: 'Nippon India ETF Gold BeES',
        quantity: 3000,
        currentPrice: 54.80,
        value: 164400.00,
        weight: 26.30,
        changePercent24h: 0.1,
        assetType: 'etf'
      },
      {
        ticker: 'LIQUIDBEES',
        name: 'Nippon India ETF Liquid BeES',
        quantity: 1540,
        currentPrice: 100.00,
        value: 154000.00,
        weight: 24.64,
        changePercent24h: 0.0,
        assetType: 'etf'
      }
    ]
  }
];

// Generate historical data for the last 12 months (monthly data points)
const generateHistoricalData = (
  startValue: number,
  months: number = 12,
  volatility: number = 0.02,
  overallGrowth: number = 0.15 // 15% growth over the period
): HistoricalDataPoint[] => {
  const data: HistoricalDataPoint[] = [];
  let currentValue = startValue;
  const now = new Date();
  const growthPerMonth = overallGrowth / months;

  for (let i = months; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    date.setDate(1); // Set to first day of month for cleaner display
    
    // Add realistic market fluctuations
    // Some months up, some down, but overall trending upward
    const randomFactor = (Math.random() - 0.45) * volatility; // Slightly bullish bias
    const trendFactor = growthPerMonth;
    const monthlyChange = (randomFactor + trendFactor) * currentValue;
    
    currentValue += monthlyChange;
    
    // Ensure value doesn't go below 70% of starting value (realistic floor)
    currentValue = Math.max(currentValue, startValue * 0.7);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(currentValue.toFixed(2)),
      timestamp: date.getTime()
    });
  }

  return data;
};

// Historical data for total net worth (12 months)
export const mockNetWorthHistory: HistoricalDataPoint[] = generateHistoricalData(
  3500000, // Starting value 12 months ago
  12,
  0.08, // 8% monthly volatility for realistic market movements
  0.15  // 15% overall growth in a year
);

// Historical data for individual assets (12 months)
export const mockAssetHistory: Record<string, HistoricalDataPoint[]> = {
  RELIANCE: generateHistoricalData(2500.00, 12, 0.06, 0.14),
  TCS: generateHistoricalData(3300.00, 12, 0.055, 0.12),
  INFY: generateHistoricalData(1400.00, 12, 0.07, 0.10),
  HDFCBANK: generateHistoricalData(1550.00, 12, 0.06, 0.09),
  BHARTIARTL: generateHistoricalData(1350.00, 12, 0.08, 0.13),
  ITC: generateHistoricalData(360.00, 12, 0.045, 0.04),
  BTC: generateHistoricalData(4200000, 12, 0.15, 0.28),
  ETH: generateHistoricalData(210000, 12, 0.14, 0.28),
  SOL: generateHistoricalData(7500, 12, 0.18, 0.47),
  NIFTYBEES: generateHistoricalData(230.00, 12, 0.05, 0.11),
  GOLDBEES: generateHistoricalData(52.00, 12, 0.04, 0.05),
  LIQUIDBEES: generateHistoricalData(100.00, 12, 0.01, 0.00)
};

// Historical data for portfolios (12 months)
export const mockPortfolioHistory: Record<string, HistoricalDataPoint[]> = {
  'portfolio-001': generateHistoricalData(2050000, 12, 0.065, 0.15),
  'portfolio-002': generateHistoricalData(810000, 12, 0.12, 0.28),
  'portfolio-003': generateHistoricalData(575000, 12, 0.04, 0.09)
};

// Mock market stats
export interface MarketStats {
  marketCap: string;
  volume24h: string;
  btcDominance: number;
  activeAssets: number;
}

export const mockMarketStats: MarketStats = {
  marketCap: '₹203T',
  volume24h: '₹10.4T',
  btcDominance: 52.3,
  activeAssets: 12
};

// Helper function to get top performing assets across all portfolios
export const getTopPerformingAssets = (): Asset[] => {
  const allAssets: Asset[] = [];
  
  mockPortfolios.forEach(portfolio => {
    allAssets.push(...portfolio.assets);
  });
  
  return allAssets
    .sort((a, b) => b.changePercent24h - a.changePercent24h)
    .slice(0, 5);
};

// Helper function to calculate total portfolio value
export const getTotalPortfolioValue = (): number => {
  return mockPortfolios.reduce((sum, portfolio) => sum + portfolio.totalValue, 0);
};
