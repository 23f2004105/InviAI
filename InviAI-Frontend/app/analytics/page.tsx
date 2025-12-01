// Analytics Page - Portfolio analytics, risk metrics, and performance insights
'use client';

import React from 'react';
import { useUser } from '@/app/contexts/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { PortfolioValueChart } from '@/app/components/dashboard/PortfolioValueChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  Target, 
  PieChart, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

// Sector allocation data
const SECTOR_ALLOCATION = [
  { name: 'Information Technology', percentage: 28.5, value: 285000, change: 2.4 },
  { name: 'Financial Services', percentage: 24.2, value: 242000, change: -0.8 },
  { name: 'Consumer Goods', percentage: 15.8, value: 158000, change: 1.2 },
  { name: 'Energy', percentage: 12.4, value: 124000, change: 3.5 },
  { name: 'Healthcare', percentage: 10.6, value: 106000, change: -1.5 },
  { name: 'Infrastructure', percentage: 8.5, value: 85000, change: 0.9 },
];

// Risk metrics
const RISK_METRICS = {
  portfolioBeta: 1.12,
  sharpeRatio: 1.45,
  volatility: 18.5,
  maxDrawdown: -12.4,
  valueAtRisk: 5.2,
};

// Performance metrics
const PERFORMANCE_METRICS = {
  totalReturn: 24.5,
  annualizedReturn: 18.2,
  dailyReturn: 0.65,
  weeklyReturn: 2.8,
  monthlyReturn: 4.2,
  ytdReturn: 15.8,
};

export default function AnalyticsPage() {
  const { portfolios, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Portfolio Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Detailed performance metrics, risk analysis, and insights
        </p>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Daily</p>
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${PERFORMANCE_METRICS.dailyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PERFORMANCE_METRICS.dailyReturn >= 0 ? '+' : ''}{PERFORMANCE_METRICS.dailyReturn}%
              </span>
              {PERFORMANCE_METRICS.dailyReturn >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Weekly</p>
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${PERFORMANCE_METRICS.weeklyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PERFORMANCE_METRICS.weeklyReturn >= 0 ? '+' : ''}{PERFORMANCE_METRICS.weeklyReturn}%
              </span>
              {PERFORMANCE_METRICS.weeklyReturn >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Monthly</p>
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${PERFORMANCE_METRICS.monthlyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PERFORMANCE_METRICS.monthlyReturn >= 0 ? '+' : ''}{PERFORMANCE_METRICS.monthlyReturn}%
              </span>
              {PERFORMANCE_METRICS.monthlyReturn >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">YTD</p>
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${PERFORMANCE_METRICS.ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PERFORMANCE_METRICS.ytdReturn >= 0 ? '+' : ''}{PERFORMANCE_METRICS.ytdReturn}%
              </span>
              {PERFORMANCE_METRICS.ytdReturn >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Return</p>
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${PERFORMANCE_METRICS.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PERFORMANCE_METRICS.totalReturn >= 0 ? '+' : ''}{PERFORMANCE_METRICS.totalReturn}%
              </span>
              {PERFORMANCE_METRICS.totalReturn >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Annualized</p>
            <div className="flex items-center gap-1">
              <span className={`text-lg font-bold ${PERFORMANCE_METRICS.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {PERFORMANCE_METRICS.annualizedReturn >= 0 ? '+' : ''}{PERFORMANCE_METRICS.annualizedReturn}%
              </span>
              {PERFORMANCE_METRICS.annualizedReturn >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Metrics & Sector Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Risk Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Portfolio Beta */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Portfolio Beta</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Market sensitivity</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {RISK_METRICS.portfolioBeta}
                  </span>
                  <p className={`text-xs ${RISK_METRICS.portfolioBeta > 1 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {RISK_METRICS.portfolioBeta > 1 ? 'Higher than market' : 'Lower than market'}
                  </p>
                </div>
              </div>

              {/* Sharpe Ratio */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Sharpe Ratio</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Risk-adjusted return</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {RISK_METRICS.sharpeRatio}
                  </span>
                  <p className={`text-xs ${RISK_METRICS.sharpeRatio > 1 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {RISK_METRICS.sharpeRatio > 1 ? 'Good' : 'Below average'}
                  </p>
                </div>
              </div>

              {/* Volatility */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Volatility</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Annualized std dev</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {RISK_METRICS.volatility}%
                  </span>
                  <p className={`text-xs ${RISK_METRICS.volatility > 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {RISK_METRICS.volatility > 20 ? 'High' : 'Moderate'}
                  </p>
                </div>
              </div>

              {/* Max Drawdown */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Max Drawdown</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Largest peak-to-trough decline</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-red-600">
                    {RISK_METRICS.maxDrawdown}%
                  </span>
                </div>
              </div>

              {/* VaR */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Value at Risk (95%)</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Daily potential loss</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-gray-900 dark:text-white">
                    {RISK_METRICS.valueAtRisk}%
                  </span>
                  <p className="text-xs text-gray-500">
                    ₹{((totalValue * RISK_METRICS.valueAtRisk) / 100).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sector Allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Sector Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {SECTOR_ALLOCATION.map((sector, index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
                const color = colors[index % colors.length];
                const isPositive = sector.change >= 0;
                
                return (
                  <div key={sector.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`}></div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {sector.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{sector.change}%
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {sector.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${color} rounded-full transition-all duration-500`} 
                        style={{ width: `${sector.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            Portfolio Health Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Diversification */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-400">Good Diversification</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Portfolio is well-diversified across 6 sectors
              </p>
            </div>

            {/* Concentration Risk */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-400">Concentration Alert</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                IT sector is 28.5% of portfolio (above 25% threshold)
              </p>
            </div>

            {/* Rebalancing */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-400">Rebalancing Needed</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Consider rebalancing within next 30 days
              </p>
            </div>

            {/* Overall Score */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-800 dark:text-purple-400">Health Score</span>
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                78/100
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
