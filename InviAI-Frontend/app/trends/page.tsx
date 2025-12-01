// Market Trends Page - NSE/BSE market trends with gainers, losers, and most active
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { MarketOverview as MarketOverviewWidget } from '@/app/components/dashboard/MarketOverview';
import { TrendingUp, TrendingDown, Activity, RefreshCw, BarChart2 } from 'lucide-react';
import { fetchMarketOverview, StockQuote } from '@/app/lib/marketApi';

export default function TrendsPage() {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers' | 'active'>('gainers');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [topGainers, setTopGainers] = useState<StockQuote[]>([]);
  const [topLosers, setTopLosers] = useState<StockQuote[]>([]);
  const [mostActive, setMostActive] = useState<StockQuote[]>([]);

  const loadMarketData = async () => {
    try {
      const overview = await fetchMarketOverview();
      setTopGainers(overview.topGainers);
      setTopLosers(overview.topLosers);
      setMostActive(overview.mostActive);
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadMarketData();
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadMarketData, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadMarketData();
  };

  const getActiveData = (): StockQuote[] => {
    switch (activeTab) {
      case 'gainers': return topGainers;
      case 'losers': return topLosers;
      case 'active': return mostActive;
    }
  };

  const formatVolume = (vol: number) => {
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    return vol.toLocaleString('en-IN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Market Trends
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Live market trends and analysis from NSE & BSE
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Market Overview */}
      <MarketOverviewWidget />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('gainers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gainers'
              ? 'border-green-500 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Top Gainers
        </button>
        <button
          onClick={() => setActiveTab('losers')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'losers'
              ? 'border-red-500 text-red-600 dark:text-red-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Top Losers
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'active'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Most Active
        </button>
      </div>

      {/* Stock Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Company</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Change</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">% Change</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">Volume</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto animate-pulse"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-14 ml-auto animate-pulse"></div></td>
                      <td className="py-4 px-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto animate-pulse"></div></td>
                    </tr>
                  ))
                ) : getActiveData().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No stocks found. Try refreshing the data.
                    </td>
                  </tr>
                ) : (
                  getActiveData().map((stock) => {
                    if (!stock) return null;
                    const displaySymbol = (stock.symbol || '').replace('.NS', '').replace('.BO', '');
                    const isPositive = (stock.change || 0) >= 0;
                    return (
                      <tr
                        key={stock.symbol}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                {displaySymbol.charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {displaySymbol}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm max-w-[200px] truncate">
                          {stock.name || displaySymbol}
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-white">
                          ₹{(stock.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-4 px-4 text-right font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}₹{(stock.change || 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                            isPositive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {isPositive ? '+' : ''}{(stock.changePercent || 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                          {formatVolume(stock.volume || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Market Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Advances</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">1,245</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '62%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Declines</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">756</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: '38%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <BarChart2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Volume</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">₹48,562 Cr</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              +12.5% vs yesterday
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
