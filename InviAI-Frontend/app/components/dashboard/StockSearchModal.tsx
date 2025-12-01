// Stock Search Modal - Search and add stocks to portfolio
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Loader2 } from 'lucide-react';
import { searchStocks, StockSearchResult } from '@/app/lib/marketApi';

interface StockSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (stock: StockSearchResult) => void;
  title?: string;
}

// Popular Indian stocks for quick selection
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
];

export const StockSearchModal: React.FC<StockSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectStock,
  title = 'Search Stocks',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const data = await searchStocks(query);
        setResults(data.length > 0 ? data : POPULAR_STOCKS.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        ));
      } catch (error) {
        console.error('Search error:', error);
        const filtered = POPULAR_STOCKS.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (stock: StockSearchResult) => {
    setSelectedStock(stock);
    onSelectStock(stock);
    onClose();
    setQuery('');
    setSelectedStock(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by stock name or symbol (e.g., RELIANCE, TCS)..."
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query && results.length > 0 && (
            <div className="py-2">
              {results.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleSelect(stock)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {stock.symbol.charAt(0)}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {stock.symbol.replace('.NS', '').replace('.BO', '')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {stock.exchange}
                    </span>
                    <Plus className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && !isSearching && (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No stocks found for "{query}"
            </div>
          )}

          {!query && (
            <div className="py-2">
              <p className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Popular Stocks
              </p>
              {POPULAR_STOCKS.slice(0, 8).map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleSelect(stock)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {stock.symbol.charAt(0)}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {stock.symbol.replace('.NS', '')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {stock.name}
                      </p>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Search NSE & BSE listed stocks • Press ESC to close
          </p>
        </div>
      </div>
    </div>
  );
};
