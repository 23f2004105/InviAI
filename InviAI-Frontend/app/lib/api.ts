// InviAI Frontend API Client
// Connects to FastAPI backend at localhost:8000

import {
  type User,
  type Portfolio,
  type HistoricalDataPoint,
  type MarketStats,
  type Asset,
  // Keep mock data as fallback
  mockUser,
  mockPortfolios,
  mockNetWorthHistory,
  mockAssetHistory,
  mockPortfolioHistory,
  mockMarketStats,
  getTopPerformingAssets,
  getTotalPortfolioValue,
} from './mockData';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

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
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
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

export const getPortfolios = async (): Promise<Portfolio[]> => {
  try {
    const backendPortfolios = await apiRequest<BackendPortfolio[]>('/api/portfolios');
    
    const portfoliosWithAssets = await Promise.all(
      backendPortfolios.map(async (p) => {
        try {
          const assets = await apiRequest<BackendAsset[]>(`/api/portfolios/${p.id}/assets`);
          return convertPortfolio(p, assets);
        } catch {
          return convertPortfolio(p, []);
        }
      })
    );
    
    return portfoliosWithAssets;
  } catch (error) {
    console.warn('Using mock portfolios:', error);
    return mockPortfolios;
  }
};

export const getPortfolioById = async (portfolioId: string): Promise<Portfolio | null> => {
  try {
    const id = portfolioId.replace('portfolio-', '');
    const backend = await apiRequest<BackendPortfolio>(`/api/portfolios/${id}`);
    const assets = await apiRequest<BackendAsset[]>(`/api/portfolios/${id}/assets`);
    return convertPortfolio(backend, assets);
  } catch (error) {
    console.warn('Using mock portfolio:', error);
    return mockPortfolios.find(p => p.id === portfolioId) || null;
  }
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
// User API (with fallback to mock)
// ========================================

export const getUser = async (): Promise<User> => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    if (!token || token === 'demo_token') {
      // Return demo user
      console.log('No token or demo token, returning mock user');
      return mockUser;
    }
    
    console.log('Fetching current user from backend...');
    const backendUser = await getCurrentUser();
    console.log('Backend user fetched:', backendUser);
    
    return {
      id: String(backendUser.id),
      name: backendUser.full_name || backendUser.email.split('@')[0],
      email: backendUser.email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.email}`,
      totalNetWorth: 0,
      currency: 'INR',
    };
  } catch (error) {
    console.error('Error fetching user, falling back to mock:', error);
    return mockUser;
  }
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

export const getTopPerformers = async (): Promise<Asset[]> => {
  try {
    const portfolios = await getPortfolios();
    const allAssets: Asset[] = portfolios.flatMap(p => p.assets);
    return allAssets.sort((a, b) => b.changePercent24h - a.changePercent24h).slice(0, 5);
  } catch {
    return getTopPerformingAssets();
  }
};

export const getTotalValue = async (): Promise<number> => {
  try {
    const portfolios = await getPortfolios();
    return portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  } catch {
    return getTotalPortfolioValue();
  }
};

export const searchAssets = async (query: string): Promise<Asset[]> => {
  try {
    const portfolios = await getPortfolios();
    const allAssets: Asset[] = portfolios.flatMap(p => p.assets);
    return allAssets.filter(
      asset =>
        asset.name.toLowerCase().includes(query.toLowerCase()) ||
        asset.ticker.toLowerCase().includes(query.toLowerCase())
    );
  } catch {
    const allAssets: Asset[] = mockPortfolios.flatMap(p => p.assets);
    return allAssets.filter(
      asset =>
        asset.name.toLowerCase().includes(query.toLowerCase()) ||
        asset.ticker.toLowerCase().includes(query.toLowerCase())
    );
  }
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
