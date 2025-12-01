// Assets Page - View all assets across portfolios
'use client';

import React from 'react';
import { useUser } from '@/app/contexts/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { AssetTable } from '@/app/components/dashboard/AssetTable';

export default function AssetsPage() {
  const { portfolios, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading assets...</p>
        </div>
      </div>
    );
  }

  // Combine all assets from all portfolios
  const allAssets = portfolios.flatMap(portfolio => portfolio.assets);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          All Assets
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and manage all your investments across portfolios
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Assets</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {allAssets.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Stocks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {allAssets.filter(a => a.assetType === 'stock').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Crypto</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {allAssets.filter(a => a.assetType === 'crypto').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">ETFs</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {allAssets.filter(a => a.assetType === 'etf').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetTable assets={allAssets} showWeight={false} />
        </CardContent>
      </Card>
    </div>
  );
}
