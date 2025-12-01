// Market Overview Component - Shows live Indian market indices
'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, IndianRupee } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/Card';
import { fetchMarketIndices, MarketIndex } from '@/app/lib/marketApi';

export const MarketOverview: React.FC = () => {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMarketData = async () => {
    try {
      const data = await fetchMarketIndices();
      setIndices(data);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchMarketData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMarketData();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-28 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <IndianRupee className="w-5 h-5" />
          Indian Market Overview
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {indices.map((index) => {
          if (!index || typeof index.price !== 'number') return null;
          const isPositive = (index.change || 0) >= 0;
          return (
            <Card key={index.symbol} hover className="cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    {index.name || index.symbol}
                  </span>
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {(index.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{(index.change || 0).toFixed(2)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    isPositive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {isPositive ? '+' : ''}{(index.changePercent || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-500">
                  <span>H: {(index.high || 0).toLocaleString('en-IN')}</span>
                  <span>L: {(index.low || 0).toLocaleString('en-IN')}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
