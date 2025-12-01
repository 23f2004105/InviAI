// Portfolios Page - View and manage all portfolios
'use client';

import React from 'react';
import { useUser } from '@/app/contexts/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { PortfolioDonutChart } from '@/app/components/dashboard/PortfolioDonutChart';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

export default function PortfoliosPage() {
  const { portfolios, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Portfolios
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track all your investment portfolios
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Portfolio
        </Button>
      </div>

      {/* Portfolio Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {portfolios.map((portfolio) => {
          const isPositive = portfolio.change24h >= 0;
          return (
            <Card key={portfolio.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{portfolio.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {portfolio.assets.length} assets
                    </p>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: portfolio.color }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    ₹{portfolio.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 text-sm mt-2">
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

                <PortfolioDonutChart portfolio={portfolio} height={250} />

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" fullWidth>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
