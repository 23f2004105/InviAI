// Portfolios Page - View and manage all portfolios
'use client';

import React, { useState } from 'react';
import { useUser } from '@/app/contexts/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { PortfolioDonutChart } from '@/app/components/dashboard/PortfolioDonutChart';
import { AssetTable } from '@/app/components/dashboard/AssetTable';
import { AddAssetModal } from '@/app/components/dashboard/AddAssetModal';
import { CreatePortfolioModal } from '@/app/components/dashboard/CreatePortfolioModal';
import { addAsset, refreshPrices, deletePortfolio } from '@/app/lib/api';
import { Portfolio } from '@/app/lib/mockData';
import { TrendingUp, TrendingDown, Plus, RefreshCw, Trash2, Briefcase } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

export default function PortfoliosPage() {
  const { portfolios, isLoading, refreshPortfolios } = useUser();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [addAssetTarget, setAddAssetTarget] = useState<Portfolio | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleAddAsset = async (data: {
    symbol: string;
    name: string;
    quantity: number;
    averageCost: number;
    exchange: string;
  }) => {
    if (!addAssetTarget) return;
    await addAsset(addAssetTarget.id, {
      symbol: data.symbol,
      name: data.name,
      asset_type: 'stock',
      quantity: data.quantity,
      average_cost: data.averageCost,
      exchange: data.exchange,
    });
    await refreshPortfolios();
  };

  const handleRefresh = async (portfolio: Portfolio) => {
    setBusyId(portfolio.id);
    setError('');
    try {
      await refreshPrices(portfolio.id);
      await refreshPortfolios();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh prices');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (portfolio: Portfolio) => {
    if (!window.confirm(`Delete "${portfolio.name}" and all its holdings?`)) return;
    setBusyId(portfolio.id);
    setError('');
    const ok = await deletePortfolio(portfolio.id);
    if (!ok) setError('Failed to delete portfolio');
    await refreshPortfolios();
    setBusyId(null);
  };

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
        <Button className="flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Portfolio
        </Button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {portfolios.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No portfolios yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
              Create your first portfolio and add NSE/BSE stocks to start tracking.
            </p>
            <Button className="inline-flex items-center gap-2" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Create Portfolio
            </Button>
          </div>
        </Card>
      )}

      {/* Portfolio Cards */}
      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
        {portfolios.map((portfolio) => {
          const isPositive = portfolio.change24h >= 0;
          const isBusy = busyId === portfolio.id;
          return (
            <Card key={portfolio.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{portfolio.name}</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {portfolio.assets.length} {portfolio.assets.length === 1 ? 'holding' : 'holdings'}
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
                    <span className="text-gray-500 dark:text-gray-400 ml-1">total return</span>
                  </div>
                </div>

                {portfolio.assets.length > 0 ? (
                  <>
                    <PortfolioDonutChart portfolio={portfolio} height={250} />
                    <div className="mt-4">
                      <AssetTable assets={portfolio.assets} />
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    No holdings yet. Add your first stock.
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                  <Button size="sm" className="flex items-center gap-1" onClick={() => setAddAssetTarget(portfolio)}>
                    <Plus className="w-4 h-4" />
                    Add Stock
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    disabled={isBusy || portfolio.assets.length === 0}
                    onClick={() => handleRefresh(portfolio)}
                  >
                    <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
                    Refresh Prices
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex items-center gap-1 ml-auto text-red-600 dark:text-red-400"
                    disabled={isBusy}
                    onClick={() => handleDelete(portfolio)}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreatePortfolioModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={refreshPortfolios}
      />
      <AddAssetModal
        isOpen={addAssetTarget !== null}
        onClose={() => setAddAssetTarget(null)}
        onAdd={handleAddAsset}
        portfolioName={addAssetTarget?.name ?? ''}
      />
    </div>
  );
}
