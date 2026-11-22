// User Context - Manages user state and authentication
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Portfolio } from '@/app/lib/mockData';
import { getUser, getPortfolios, isDemoSession } from '@/app/lib/api';

interface UserContextType {
  user: User | null;
  portfolios: Portfolio[];
  isLoading: boolean;
  /** True when showing sample data (logged out or demo login) */
  isDemo: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  refreshPortfolios: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDemo, setIsDemo] = useState(true);

  const messageOf = (err: unknown, fallback: string) =>
    err instanceof Error && err.message ? err.message : fallback;

  // Fetch user data; returns the error message (or null) so callers can combine results
  const fetchUser = async (): Promise<string | null> => {
    try {
      setUser(await getUser());
      return null;
    } catch (err) {
      console.error('Error fetching user:', err);
      return messageOf(err, 'Failed to load your account');
    }
  };

  // Fetch portfolios. On failure keep whatever was already shown.
  const fetchPortfolios = async (): Promise<string | null> => {
    try {
      setPortfolios(await getPortfolios());
      return null;
    } catch (err) {
      console.error('Error fetching portfolios:', err);
      return messageOf(err, 'Failed to load your portfolios');
    }
  };

  // Initial data fetch and refetch when auth token changes
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      setIsDemo(isDemoSession());
      const errors = await Promise.all([fetchUser(), fetchPortfolios()]);
      setError(errors.find(Boolean) ?? null);
      setIsLoading(false);
    };

    // Check if we're in the browser and have access to localStorage
    if (typeof window !== 'undefined') {
      initializeData();
      
      // Listen for auth changes to refetch user data
      const handleAuthChange = () => {
        console.log('Auth changed, refetching user data...');
        initializeData();
      };
      
      window.addEventListener('auth-changed', handleAuthChange);
      return () => window.removeEventListener('auth-changed', handleAuthChange);
    }
  }, []);

  // Refresh functions
  const refreshUser = async () => {
    setIsLoading(true);
    setError(await fetchUser());
    setIsLoading(false);
  };

  // Refetch in the background so the page doesn't flash a full-screen spinner
  const refreshPortfolios = async () => {
    setError(await fetchPortfolios());
  };

  const value: UserContextType = {
    user,
    portfolios,
    isLoading,
    isDemo,
    error,
    refreshUser,
    refreshPortfolios
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// Custom hook to use the UserContext
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
