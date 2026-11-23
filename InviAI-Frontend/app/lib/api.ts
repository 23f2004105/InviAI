// Envi AI Frontend API Client
// Connects to the FastAPI backend (NEXT_PUBLIC_API_URL, default localhost:8000).
//
// Mock data is used only in demo mode (no token, or the "demo_token" from the
// login page's demo button) and for history/stats endpoints the backend does
// not have yet. A signed-in user whose request fails gets a real error, not
// fake portfolios.

import {
  type User,
  type Portfolio,
  type HistoricalDataPoint,
  type MarketStats,
  type Asset,
  mockUser,
  mockPortfolios,
  mockNetWorthHistory,
  mockAssetHistory,
  mockPortfolioHistory,
  mockMarketStats,
} from './mockData';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// True when there is no real signed-in user (logged out, or demo mode)
export const isDemoSession = (): boolean => {
  if (typeof window === 'undefined') return true;
  const token = localStorage.getItem('auth_token');
  return !token || token === 'demo_token';
};

// Helper: Make API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  redirectOnUnauth: boolean = false
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Cannot reach the Envi AI server. Check your connection and try again.');
  }

  if (response.status === 429) {
    throw new Error('Too many attempts. Please wait a minute and try again.');
  }

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      // Only redirect to login for auth-specific endpoints
      if (redirectOnUnauth) {
        window.location.href = '/login';
      }
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    // FastAPI sends a string, or a list of {msg} objects for validation errors (422)
    const detail =
      typeof error?.detail === 'string'
        ? error.detail
        : Array.isArray(error?.detail)
          ? error.detail.map((d: { msg?: string }) => d.msg?.replace(/^Value error, /, '')).filter(Boolean).join('. ') || null
          : null;
    if (detail) throw new Error(detail);
    if (response.status >= 500) {
      // Also what the Next.js proxy returns when the backend is down or asleep
      throw new Error('The Envi AI server is unavailable right now. Please try again in a moment.');
    }
    throw new Error(`Request failed (HTTP ${response.status})`);
  }

  return response.json();
}

// ========================================
// Authentication API
// ========================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    full_name?: string;
    risk_tolerance: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
    last_login?: string;
  };
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  
  if (typeof window !== 'undefined' && response.access_token) {
    localStorage.setItem('auth_token', response.access_token);
  }
  
  return response;
};

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (typeof window !== 'undefined' && response.access_token) {
    localStorage.setItem('auth_token', response.access_token);
  }
  
  return response;
};

export const logout = async (): Promise<void> => {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
};

export const getCurrentUser = async (): Promise<AuthResponse['user']> => {
  return apiRequest('/api/auth/me');
};

// ========================================
// Portfolio API
// ========================================

export interface BackendPortfolio {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  initial_value: number;
  current_value: number;
  total_returns: number;
  total_returns_percentage: number;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface BackendAsset {
  id: number;
  portfolio_id: number;
  symbol: string;
  name: string;
  asset_type: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  total_cost: number;
  current_value: number;
  unrealized_gain_loss: number;
  unrealized_gain_loss_percentage: number;
  portfolio_percentage: number;
  exchange?: string;
  created_at: string;
  updated_at?: string;
}

// Convert backend portfolio to frontend format
function convertPortfolio(backend: BackendPortfolio, assets: BackendAsset[] = []): Portfolio {
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];
  
  return {
    id: `portfolio-${backend.id}`,
    name: backend.name,
    totalValue: backend.current_value,
    change24h: backend.total_returns,
    changePercent24h: backend.total_returns_percentage,
    color: colors[backend.id % colors.length],
    createdAt: backend.created_at,
    assets: assets.map(a => ({
      ticker: a.symbol.replace('.NS', '').replace('.BO', ''),
      name: a.name,
      quantity: a.quantity,
      currentPrice: a.current_price,
      value: a.current_value,
      weight: a.portfolio_percentage,
      changePercent24h: a.unrealized_gain_loss_percentage,
      assetType: a.asset_type as 'stock' | 'crypto' | 'etf' | 'bond',
    })),
  };
}

// ========================================
// Demo mode: sample holdings, live Yahoo prices
// ========================================

const DEMO_CACHE_MS = 2 * 60 * 1000;
let demoCache: { at: number; data: Portfolio[] } | null = null;

const yahooSymbol = (a: Asset) => (a.assetType === 'crypto' ? `${a.ticker}-INR` : `${a.ticker}.NS`);

async function fetchLiveQuote(symbol: string): Promise<{ price: number; changePercent: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE_URL}/api/market/quote/${encodeURIComponent(symbol)}`, { signal: controller.signal });
    if (!res.ok) return null;
    const q = await res.json();
    if (q.is_mock || !(q.current_price > 0)) return null;
    return { price: q.current_price, changePercent: q.change_percent ?? 0 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// The demo portfolios keep their sample quantities but are valued at live
// market prices (public /api/market/quote, no login). Any quote that fails
// keeps its sample price, so demo mode still works offline.
let demoInFlight: Promise<Portfolio[]> | null = null;

function getLiveDemoPortfolios(): Promise<Portfolio[]> {
  if (demoCache && Date.now() - demoCache.at < DEMO_CACHE_MS) return Promise.resolve(demoCache.data);
  // Several components ask at once on page load: share one round of quotes
  demoInFlight ??= loadLiveDemoPortfolios().finally(() => { demoInFlight = null; });
  return demoInFlight;
}

async function loadLiveDemoPortfolios(): Promise<Portfolio[]> {

  const symbols = [...new Set(mockPortfolios.flatMap((p) => p.assets.map(yahooSymbol)))];
  const quotes = new Map(
    await Promise.all(symbols.map(async (s) => [s, await fetchLiveQuote(s)] as const))
  );

  const data = mockPortfolios.map((p) => {
    const assets = p.assets.map((a) => {
      const q = quotes.get(yahooSymbol(a));
      return q ? { ...a, currentPrice: q.price, value: a.quantity * q.price, changePercent24h: q.changePercent } : a;
    });
    const totalValue = assets.reduce((s, a) => s + a.value, 0);
    // value before today's move = value / (1 + change%)
    const change24h = assets.reduce((s, a) => s + a.value - a.value / (1 + a.changePercent24h / 100), 0);
    return {
      ...p,
      totalValue,
      change24h,
      changePercent24h: totalValue - change24h > 0 ? (change24h / (totalValue - change24h)) * 100 : 0,
      assets: assets.map((a) => ({ ...a, weight: totalValue > 0 ? (a.value / totalValue) * 100 : 0 })),
    };
  });

  if (quotes.size > 0 && [...quotes.values()].some(Boolean)) {
    demoCache = { at: Date.now(), data };
  }
  return data;
}

export const getPortfolios = async (): Promise<Portfolio[]> => {
  if (isDemoSession()) {
    return getLiveDemoPortfolios();
  }

  // Trailing slash matters: without it FastAPI redirects to its own host,
  // which breaks behind the Next.js proxy (cross-origin redirect).
  const backendPortfolios = await apiRequest<BackendPortfolio[]>('/api/portfolios/');
  return Promise.all(
    backendPortfolios.map(async (p) => {
      const assets = await apiRequest<BackendAsset[]>(`/api/portfolios/${p.id}/assets`);
      return convertPortfolio(p, assets);
    })
  );
};

export const getPortfolioById = async (portfolioId: string): Promise<Portfolio | null> => {
  if (isDemoSession()) {
    return (await getLiveDemoPortfolios()).find(p => p.id === portfolioId) || null;
  }

  const id = portfolioId.replace('portfolio-', '');
  const backend = await apiRequest<BackendPortfolio>(`/api/portfolios/${id}`);
  const assets = await apiRequest<BackendAsset[]>(`/api/portfolios/${id}/assets`);
  return convertPortfolio(backend, assets);
};

export const createPortfolio = async (name: string, description?: string): Promise<Portfolio> => {
  const backend = await apiRequest<BackendPortfolio>('/api/portfolios/', {
    method: 'POST',
    body: JSON.stringify({ name, description, initial_value: 0 }),
  });
  return convertPortfolio(backend, []);
};

export const deletePortfolio = async (portfolioId: string): Promise<boolean> => {
  try {
    const id = portfolioId.replace('portfolio-', '');
    await apiRequest(`/api/portfolios/${id}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
};

// ========================================
// Asset API
// ========================================

export interface AddAssetData {
  symbol: string;
  name: string;
  asset_type?: string;
  quantity: number;
  average_cost: number;
  exchange?: string;
}

export const addAsset = async (portfolioId: string, data: AddAssetData): Promise<BackendAsset> => {
  const id = portfolioId.replace('portfolio-', '');
  return apiRequest<BackendAsset>(`/api/portfolios/${id}/assets`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const refreshPrices = async (portfolioId: string): Promise<BackendAsset[]> => {
  const id = portfolioId.replace('portfolio-', '');
  return apiRequest<BackendAsset[]>(`/api/portfolios/${id}/assets/refresh-prices`, {
    method: 'POST',
  });
};

// ========================================
// Portfolio optimization (Markowitz mean-variance)
// ========================================

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface OptimizationMetrics {
  expected_return: number; // annual, fraction
  volatility: number;      // annual, fraction
  sharpe: number;
}

export interface OptimizationHolding {
  symbol: string;
  name: string;
  current_price: number;
  quantity: number;
  current_weight: number;   // percent
  suggested_weight: number; // percent
  drift: number;            // percentage points, suggested - current
  action: 'buy' | 'sell' | 'hold';
  shares: number;
}

export interface OptimizationResult {
  risk_profile: RiskProfile;
  method: string;
  risk_free_rate: number;
  days_used: number;
  uses_sample_data: boolean;
  metrics: { current: OptimizationMetrics; suggested: OptimizationMetrics; equal_weight: OptimizationMetrics };
  holdings: OptimizationHolding[];
}

export const optimizePortfolio = async (portfolioId: string, risk: RiskProfile): Promise<OptimizationResult> => {
  if (isDemoSession()) {
    throw new Error('Create an account to optimize a real portfolio.');
  }
  const id = portfolioId.replace('portfolio-', '');
  return apiRequest<OptimizationResult>(`/api/portfolios/${id}/optimize?risk=${risk}`, { method: 'POST' });
};

// ========================================
// User API (mock only in demo mode)
// ========================================

export const getUser = async (): Promise<User> => {
  if (isDemoSession()) {
    const portfolios = await getLiveDemoPortfolios();
    return { ...mockUser, totalNetWorth: portfolios.reduce((s, p) => s + p.totalValue, 0) };
  }

  const backendUser = await getCurrentUser();
  return {
    id: String(backendUser.id),
    name: backendUser.full_name || backendUser.email.split('@')[0],
    email: backendUser.email,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.email}`,
    totalNetWorth: 0,
    currency: 'INR',
  };
};

// ========================================
// Historical Data (mock for now)
// ========================================

export const getNetWorthHistory = async (months: number = 12): Promise<HistoricalDataPoint[]> => {
  return mockNetWorthHistory;
};

export const getAssetHistory = async (
  ticker: string,
  months: number = 12
): Promise<HistoricalDataPoint[]> => {
  const history = mockAssetHistory[ticker];
  if (!history) {
    throw new Error(`No historical data found for ticker: ${ticker}`);
  }
  return history;
};

export const getPortfolioHistory = async (
  portfolioId: string,
  months: number = 12
): Promise<HistoricalDataPoint[]> => {
  const history = mockPortfolioHistory[portfolioId];
  if (!history) {
    throw new Error(`No historical data found for portfolio: ${portfolioId}`);
  }
  return history;
};

export const getMarketStats = async (): Promise<MarketStats> => {
  return mockMarketStats;
};

// These build on getPortfolios(), which already returns mock data in demo mode
export const getTopPerformers = async (): Promise<Asset[]> => {
  const portfolios = await getPortfolios();
  const allAssets: Asset[] = portfolios.flatMap(p => p.assets);
  return allAssets.sort((a, b) => b.changePercent24h - a.changePercent24h).slice(0, 5);
};

export const getTotalValue = async (): Promise<number> => {
  const portfolios = await getPortfolios();
  return portfolios.reduce((sum, p) => sum + p.totalValue, 0);
};

export const searchAssets = async (query: string): Promise<Asset[]> => {
  const portfolios = await getPortfolios();
  const q = query.toLowerCase();
  return portfolios
    .flatMap(p => p.assets)
    .filter(asset => asset.name.toLowerCase().includes(q) || asset.ticker.toLowerCase().includes(q));
};

export const updatePortfolioName = async (
  portfolioId: string,
  newName: string
): Promise<Portfolio | null> => {
  try {
    const id = portfolioId.replace('portfolio-', '');
    const backend = await apiRequest<BackendPortfolio>(`/api/portfolios/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    });
    return convertPortfolio(backend, []);
  } catch {
    return null;
  }
};

// Error handling wrapper
export const apiCall = async <T>(
  apiFunction: () => Promise<T>,
  errorMessage: string = 'An error occurred'
): Promise<T> => {
  try {
    return await apiFunction();
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
};
