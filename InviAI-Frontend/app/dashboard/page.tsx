// Dashboard Page - Main dashboard with portfolio overview and charts
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { PortfolioDonutChart } from '@/app/components/dashboard/PortfolioDonutChart';
import { PortfolioValueChart } from '@/app/components/dashboard/PortfolioValueChart';
import { AssetTable } from '@/app/components/dashboard/AssetTable';
import { MarketOverview } from '@/app/components/dashboard/MarketOverview';
import { Watchlist } from '@/app/components/dashboard/Watchlist';
import { AddAssetModal } from '@/app/components/dashboard/AddAssetModal';
import { useUser } from '@/app/contexts/UserContext';
import { getNetWorthHistory, getTopPerformers, addAsset } from '@/app/lib/api';
import { HistoricalDataPoint, Asset } from '@/app/lib/mockData';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  ArrowUpRight,
  Plus
} from 'lucide-react';

export default function DashboardPage() {
  const { user, portfolios, isLoading } = useUser();
  const [netWorthHistory, setNetWorthHistory] = useState<HistoricalDataPoint[]>([]);
  const [topPerformers, setTopPerformers] = useState<Asset[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [history, performers] = await Promise.all([
          getNetWorthHistory(),
          getTopPerformers()
        ]);
        setNetWorthHistory(history);
        setTopPerformers(performers);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setDataLoading(false);
      }
    };

    if (!isLoading) {
      fetchData();
    }
  }, [isLoading]);

  // Calculate total portfolio value
  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);

  // Calculate total change
  const totalChange = portfolios.reduce((sum, p) => sum + p.change24h, 0);
  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  if (isLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            नमस्ते, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Here's your portfolio overview
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Last 12 Months
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Portfolio
          </button>
        </div>
      </div>

      {/* Market Overview - Live Indian Markets */}
      <MarketOverview />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Net Worth */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Net Worth
              </span>
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 text-sm">
              {totalChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={totalChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {totalChange >= 0 ? '+' : ''}₹{totalChange.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {' '}({totalChange >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Number of Portfolios */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Portfolios
              </span>
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {portfolios.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active portfolios
            </div>
          </CardContent>
        </Card>

        {/* Total Assets */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Assets
              </span>
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {portfolios.reduce((sum, p) => sum + p.assets.length, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Across all portfolios
            </div>
          </CardContent>
        </Card>

        {/* Best Performer */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Performer
              </span>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {topPerformers[0]?.ticker || 'N/A'}
            </div>
            <div className="text-sm text-green-600">
              +{topPerformers[0]?.changePercent24h.toFixed(2)}% today
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Worth Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioValueChart
              data={netWorthHistory}
              height={300}
              color="#3b82f6"
              showArea={true}
            />
          </CardContent>
        </Card>

        {/* Watchlist */}
        <Watchlist />
      </div>

      {/* Asset Allocation Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Allocation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation - {portfolios[0]?.name || 'Portfolio'}</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolios[0] && (
              <PortfolioDonutChart portfolio={portfolios[0]} height={300} />
            )}
          </CardContent>
        </Card>

        {/* Top Performing Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetTable assets={topPerformers.slice(0, 5)} showWeight={false} />
          </CardContent>
        </Card>
      </div>

      {/* Portfolios Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {portfolios.map((portfolio) => {
          const isPositive = portfolio.change24h >= 0;
          return (
            <Card key={portfolio.id} hover>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {portfolio.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {portfolio.assets.length} assets
                    </p>
                  </div>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: portfolio.color }}
                  />
                </div>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{portfolio.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                      {isPositive ? '+' : ''}₹{portfolio.change24h.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {' '}({isPositive ? '+' : ''}{portfolio.changePercent24h.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                <button className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                  View Details →
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
