// Indian Market API Service - Fetches real data from backend
// Falls back to mock data when API is unavailable

// Use relative URL - Next.js will proxy to backend via rewrites in next.config.ts
const API_BASE_URL = '';

// ========================================
// Types
// ========================================

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  lastUpdated: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  peRatio?: number;
  lastUpdated: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface MarketOverview {
  nifty50: MarketIndex | null;
  sensex: MarketIndex | null;
  niftyBank: MarketIndex | null;
  topGainers: StockQuote[];
  topLosers: StockQuote[];
  mostActive: StockQuote[];
  breadth: { tracked: number; advances: number; declines: number; totalVolume: number } | null;
}

// ========================================
// Backend Response Types
// ========================================

interface BackendMarketIndex {
  symbol: string;
  name: string;
  value: number;
  change: number;
  change_percent: number;
  high?: number | null;
  low?: number | null;
  last_updated: string;
}

interface BackendStockQuote {
  symbol: string;
  name: string;
  exchange: string;
  current_price: number;
  open_price?: number;
  high_price?: number;
  low_price?: number;
  previous_close?: number;
  change: number;
  change_percent: number;
  volume?: number;
  market_cap?: number;
  pe_ratio?: number;
  last_updated: string;
}

interface BackendMarketOverview {
  nifty_50: BackendMarketIndex | null;
  sensex: BackendMarketIndex | null;
  nifty_bank: BackendMarketIndex | null;
  top_gainers: BackendStockQuote[];
  top_losers: BackendStockQuote[];
  most_active: BackendStockQuote[];
  tracked?: number;
  advances?: number;
  declines?: number;
  total_volume?: number;
}

// ========================================
// Converters
// ========================================

const convertIndex = (data: BackendMarketIndex): MarketIndex => ({
  symbol: data.symbol,
  name: data.name,
  price: data.value,
  change: data.change,
  changePercent: data.change_percent,
  high: data.high ?? data.value,
  low: data.low ?? data.value,
  lastUpdated: data.last_updated,
});

const convertQuote = (data: BackendStockQuote): StockQuote => ({
  symbol: data.symbol,
  name: data.name,
  exchange: data.exchange,
  price: data.current_price,
  change: data.change,
  changePercent: data.change_percent,
  high: data.high_price || data.current_price,
  low: data.low_price || data.current_price,
  open: data.open_price || data.current_price,
  previousClose: data.previous_close || data.current_price,
  volume: data.volume || 0,
  marketCap: data.market_cap,
  peRatio: data.pe_ratio,
  lastUpdated: data.last_updated,
});

// ========================================
// Mock Data
// ========================================

const MOCK_INDICES: MarketIndex[] = [
  {
    symbol: '^NSEI',
    name: 'NIFTY 50',
    price: 24478.05,
    change: 156.30,
    changePercent: 0.64,
    high: 24512.45,
    low: 24298.20,
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: '^BSESN',
    name: 'SENSEX',
    price: 80502.85,
    change: 512.15,
    changePercent: 0.64,
    high: 80612.50,
    low: 79985.30,
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: '^NSEBANK',
    name: 'NIFTY Bank',
    price: 52156.70,
    change: -245.80,
    changePercent: -0.47,
    high: 52450.00,
    low: 51890.25,
    lastUpdated: new Date().toISOString(),
  },
  {
    symbol: 'NIFTY_IT.NS',
    name: 'NIFTY IT',
    price: 38925.40,
    change: 325.60,
    changePercent: 0.84,
    high: 39050.75,
    low: 38520.10,
    lastUpdated: new Date().toISOString(),
  },
];

const MOCK_STOCK_PRICES: Record<string, StockQuote> = {
  'RELIANCE.NS': {
    symbol: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd.',
    exchange: 'NSE',
    price: 2456.75,
    change: 28.40,
    changePercent: 1.17,
    high: 2478.50,
    low: 2425.30,
    open: 2430.00,
    previousClose: 2428.35,
    volume: 48000000,
    marketCap: 16620000000000,
    peRatio: 28.5,
    lastUpdated: new Date().toISOString(),
  },
  'TCS.NS': {
    symbol: 'TCS.NS',
    name: 'Tata Consultancy Services Ltd.',
    exchange: 'NSE',
    price: 3892.40,
    change: 45.60,
    changePercent: 1.18,
    high: 3920.00,
    low: 3845.00,
    open: 3850.00,
    previousClose: 3846.80,
    volume: 2500000,
    marketCap: 14200000000000,
    peRatio: 32.4,
    lastUpdated: new Date().toISOString(),
  },
  'HDFCBANK.NS': {
    symbol: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd.',
    exchange: 'NSE',
    price: 1678.25,
    change: -12.50,
    changePercent: -0.74,
    high: 1695.00,
    low: 1665.00,
    open: 1690.00,
    previousClose: 1690.75,
    volume: 8500000,
    marketCap: 12800000000000,
    peRatio: 19.2,
    lastUpdated: new Date().toISOString(),
  },
  'INFY.NS': {
    symbol: 'INFY.NS',
    name: 'Infosys Ltd.',
    exchange: 'NSE',
    price: 1456.80,
    change: 22.35,
    changePercent: 1.56,
    high: 1468.00,
    low: 1430.00,
    open: 1435.00,
    previousClose: 1434.45,
    volume: 5200000,
    marketCap: 6050000000000,
    peRatio: 24.8,
    lastUpdated: new Date().toISOString(),
  },
  'ICICIBANK.NS': {
    symbol: 'ICICIBANK.NS',
    name: 'ICICI Bank Ltd.',
    exchange: 'NSE',
    price: 1234.50,
    change: 15.25,
    changePercent: 1.25,
    high: 1245.00,
    low: 1218.00,
    open: 1220.00,
    previousClose: 1219.25,
    volume: 12000000,
    marketCap: 8650000000000,
    peRatio: 18.6,
    lastUpdated: new Date().toISOString(),
  },
};

// ========================================
// API Functions
// ========================================

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  try {
    console.log('Fetching indices from:', `${API_BASE_URL}/api/market/indices`);
    const response = await fetch(`${API_BASE_URL}/api/market/indices`);
    console.log('Response status:', response.status);
    if (response.ok) {
      const data: BackendMarketIndex[] = await response.json();
      console.log('Received data:', data);
      if (Array.isArray(data) && data.length > 0) {
        const converted = data.map(convertIndex);
        console.log('Converted data:', converted);
        return converted;
      }
    }
    console.log('Falling back to mock data');
    return MOCK_INDICES;
  } catch (error) {
    console.error('Error fetching indices:', error);
    return MOCK_INDICES;
  }
}

// Helper function to fetch with retry
async function fetchWithRetry(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      console.warn(`Fetch attempt ${i + 1} failed for ${url}:`, error);
      if (i < retries) await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
    }
  }
  return null;
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/market/quote/${encodeURIComponent(symbol)}`);
    if (response) {
      const data: BackendStockQuote = await response.json();
      return convertQuote(data);
    }
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
  }
  
  // Return mock data
  return MOCK_STOCK_PRICES[symbol] || generateMockQuote(symbol);
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/search?q=${encodeURIComponent(query)}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error searching stocks:', error);
  }
  
  // Return local search from popular stocks
  return POPULAR_STOCKS.filter(
    s => s.symbol.toLowerCase().includes(query.toLowerCase()) ||
         s.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);
}

export async function fetchMarketOverview(): Promise<MarketOverview> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/overview`);
    if (response.ok) {
      const data: BackendMarketOverview = await response.json();
      return {
        nifty50: data.nifty_50 ? convertIndex(data.nifty_50) : null,
        sensex: data.sensex ? convertIndex(data.sensex) : null,
        niftyBank: data.nifty_bank ? convertIndex(data.nifty_bank) : null,
        topGainers: data.top_gainers?.map(convertQuote) || [],
        topLosers: data.top_losers?.map(convertQuote) || [],
        mostActive: data.most_active?.map(convertQuote) || [],
        breadth: data.tracked
          ? { tracked: data.tracked, advances: data.advances ?? 0, declines: data.declines ?? 0, totalVolume: data.total_volume ?? 0 }
          : null,
      };
    }
  } catch (error) {
    console.error('Error fetching market overview:', error);
  }
  
  // Return mock overview
  return MOCK_OVERVIEW;
}

// Mock market overview
const MOCK_OVERVIEW: MarketOverview = {
  breadth: null,
  nifty50: MOCK_INDICES[0],
  sensex: MOCK_INDICES[1],
  niftyBank: MOCK_INDICES[2],
  topGainers: [
    { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd.', exchange: 'NSE', price: 2845.50, change: 142.30, changePercent: 5.27, high: 2900, low: 2700, open: 2720, previousClose: 2703.20, volume: 12500000, lastUpdated: new Date().toISOString() },
    { symbol: 'TATAPOWER.NS', name: 'Tata Power Company Ltd.', exchange: 'NSE', price: 425.80, change: 18.45, changePercent: 4.53, high: 430, low: 405, open: 410, previousClose: 407.35, volume: 28000000, lastUpdated: new Date().toISOString() },
    { symbol: 'HINDALCO.NS', name: 'Hindalco Industries Ltd.', exchange: 'NSE', price: 628.90, change: 25.60, changePercent: 4.24, high: 635, low: 600, open: 605, previousClose: 603.30, volume: 8500000, lastUpdated: new Date().toISOString() },
  ],
  topLosers: [
    { symbol: 'WIPRO.NS', name: 'Wipro Ltd.', exchange: 'NSE', price: 452.30, change: -18.75, changePercent: -3.98, high: 475, low: 450, open: 470, previousClose: 471.05, volume: 9500000, lastUpdated: new Date().toISOString() },
    { symbol: 'TECHM.NS', name: 'Tech Mahindra Ltd.', exchange: 'NSE', price: 1285.60, change: -48.20, changePercent: -3.62, high: 1340, low: 1280, open: 1330, previousClose: 1333.80, volume: 4200000, lastUpdated: new Date().toISOString() },
    { symbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd.', exchange: 'NSE', price: 1425.80, change: -45.30, changePercent: -3.08, high: 1475, low: 1420, open: 1470, previousClose: 1471.10, volume: 3800000, lastUpdated: new Date().toISOString() },
  ],
  mostActive: [
    { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', exchange: 'NSE', price: 145.25, change: 5.85, changePercent: 4.20, high: 148, low: 138, open: 140, previousClose: 139.40, volume: 145000000, lastUpdated: new Date().toISOString() },
    { symbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', price: 625.40, change: 8.25, changePercent: 1.34, high: 632, low: 615, open: 618, previousClose: 617.15, volume: 85000000, lastUpdated: new Date().toISOString() },
    { symbol: 'TMPV.NS', name: 'Tata Motors Passenger Vehicles Ltd.', exchange: 'NSE', price: 266.35, change: 2.85, changePercent: 1.08, high: 268, low: 262, open: 263, previousClose: 263.50, volume: 68000000, lastUpdated: new Date().toISOString() },
  ],
};

// Helper to generate mock quote for unknown symbols
function generateMockQuote(symbol: string): StockQuote {
  const basePrice = 500 + Math.random() * 2000;
  const change = (Math.random() - 0.5) * 50;
  
  return {
    symbol,
    name: symbol.replace('.NS', '').replace('.BO', ''),
    exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE',
    price: basePrice,
    change,
    changePercent: (change / basePrice) * 100,
    high: basePrice * 1.02,
    low: basePrice * 0.98,
    open: basePrice * 0.995,
    previousClose: basePrice - change,
    volume: Math.floor(Math.random() * 10000000),
    lastUpdated: new Date().toISOString(),
  };
}

// Popular Indian stocks for search
const POPULAR_STOCKS: StockSearchResult[] = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', type: 'stock' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'ITC.NS', name: 'ITC Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'WIPRO.NS', name: 'Wipro Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'TMPV.NS', name: 'Tata Motors Passenger Vehicles Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'TMCV.NS', name: 'Tata Motors Ltd. (Commercial Vehicles)', exchange: 'NSE', type: 'stock' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Ind.', exchange: 'NSE', type: 'stock' },
  { symbol: 'TITAN.NS', name: 'Titan Company Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corp. of India', exchange: 'NSE', type: 'stock' },
  { symbol: 'NTPC.NS', name: 'NTPC Ltd.', exchange: 'NSE', type: 'stock' },
  { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corp.', exchange: 'NSE', type: 'stock' },
];
