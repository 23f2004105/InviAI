// User Context - Manages user state and authentication
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Portfolio } from '@/app/lib/mockData';
import { getUser, getPortfolios } from '@/app/lib/api';

interface UserContextType {
  user: User | null;
  portfolios: Portfolio[];
  isLoading: boolean;
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

  // Fetch user data
  const fetchUser = async () => {
    try {
      const userData = await getUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch user data');
      console.error('Error fetching user:', err);
    }
  };

  // Fetch portfolios
  const fetchPortfolios = async () => {
    try {
      const portfolioData = await getPortfolios();
      setPortfolios(portfolioData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch portfolios');
      console.error('Error fetching portfolios:', err);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await Promise.all([fetchUser(), fetchPortfolios()]);
      setIsLoading(false);
    };

    initializeData();
  }, []);

  // Refresh functions
  const refreshUser = async () => {
    setIsLoading(true);
    await fetchUser();
    setIsLoading(false);
  };

  const refreshPortfolios = async () => {
    setIsLoading(true);
    await fetchPortfolios();
    setIsLoading(false);
  };

  const value: UserContextType = {
    user,
    portfolios,
    isLoading,
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
