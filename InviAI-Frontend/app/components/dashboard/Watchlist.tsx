// Watchlist Component - Track favorite stocks
'use client';

import React, { useState, useEffect } from 'react';
import { Star, Plus, X, TrendingUp, TrendingDown, RefreshCw, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { StockSearchModal } from './StockSearchModal';
import { fetchStockQuote, StockQuote } from '@/app/lib/marketApi';

// Default watchlist stocks
const DEFAULT_WATCHLIST = [
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
  'INFY.NS',
  'ICICIBANK.NS',
];

export const Watchlist: React.FC = () => {
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [stocks, setStocks] = useState<StockQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      setWatchlistSymbols(JSON.parse(saved));
    } else {
      setWatchlistSymbols(DEFAULT_WATCHLIST);
      localStorage.setItem('watchlist', JSON.stringify(DEFAULT_WATCHLIST));
    }
  }, []);

  // Fetch stock data sequentially to avoid overwhelming the API
  const fetchWatchlistData = async () => {
    if (watchlistSymbols.length === 0) {
      setStocks([]);
      setIsLoading(false);
      return;
    }

    try {
      const stockData: StockQuote[] = [];
      // Fetch sequentially with small delay to avoid connection issues
      for (const symbol of watchlistSymbols) {
        try {
          const quote = await fetchStockQuote(symbol);
          stockData.push(quote);
        } catch (e) {
          console.error(`Failed to fetch ${symbol}:`, e);
        }
        // Small delay between requests
        await new Promise(r => setTimeout(r, 100));
      }
      setStocks(stockData.filter(Boolean));
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (watchlistSymbols.length > 0) {
      fetchWatchlistData();
    }
  }, [watchlistSymbols]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWatchlistData();
  };

  const handleAddStock = (stock: { symbol: string; name: string }) => {
    if (!watchlistSymbols.includes(stock.symbol)) {
      const updated = [...watchlistSymbols, stock.symbol];
      setWatchlistSymbols(updated);
      localStorage.setItem('watchlist', JSON.stringify(updated));
    }
    setShowSearch(false);
  };

  const handleRemoveStock = (symbol: string) => {
    const updated = watchlistSymbols.filter(s => s !== symbol);
    setWatchlistSymbols(updated);
    localStorage.setItem('watchlist', JSON.stringify(updated));
    setStocks(stocks.filter(s => s.symbol !== symbol));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-yellow-500" />
              Watchlist
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Refresh prices"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowSearch(true)}
                className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                title="Add stock"
              >
                <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div>
                      <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                      <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : stocks.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-3">No stocks in watchlist</p>
              <button
                onClick={() => setShowSearch(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add your first stock
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {stocks.map((stock) => {
                if (!stock || typeof stock.price !== 'number') return null;
                const isPositive = (stock.change || 0) >= 0;
                return (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                          {(stock.symbol || '?').charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {(stock.symbol || '').replace('.NS', '').replace('.BO', '')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                          {stock.name || stock.symbol}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          ₹{(stock.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className={`text-xs flex items-center gap-1 justify-end ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isPositive ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveStock(stock.symbol)}
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                        title="Remove from watchlist"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <StockSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onSelectStock={handleAddStock}
        title="Add to Watchlist"
      />
    </>
  );
};
