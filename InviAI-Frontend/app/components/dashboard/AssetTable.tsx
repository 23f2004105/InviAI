// AssetTable Component - Displays assets in a styled table
'use client';

import React from 'react';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Asset } from '@/app/lib/mockData';

interface AssetTableProps {
  assets: Asset[];
  showWeight?: boolean;
}

export const AssetTable: React.FC<AssetTableProps> = ({
  assets,
  showWeight = true
}) => {
  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Get asset type badge color
  const getAssetTypeBadge = (type: string) => {
    const colors = {
      stock: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      crypto: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      etf: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      bond: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    };
    return colors[type as keyof typeof colors] || colors.stock;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Asset
            </th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Type
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Price
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Quantity
            </th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Value
            </th>
            {showWeight && (
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Weight
              </th>
            )}
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Return
            </th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset, index) => {
            const isPositive = asset.changePercent24h >= 0;
            return (
              <tr
                key={`${asset.ticker}-${index}`}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {asset.ticker.substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {asset.ticker}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {asset.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAssetTypeBadge(
                      asset.assetType
                    )}`}
                  >
                    {asset.assetType.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4 text-right font-medium text-gray-900 dark:text-white">
                  {formatCurrency(asset.currentPrice)}
                </td>
                <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                  {asset.quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(asset.value)}
                </td>
                {showWeight && (
                  <td className="py-4 px-4 text-right text-gray-600 dark:text-gray-400">
                    {asset.weight.toFixed(2)}%
                  </td>
                )}
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-1">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span
                      className={`font-medium ${
                        isPositive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatPercent(asset.changePercent24h)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {assets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No assets found</p>
        </div>
      )}
    </div>
  );
};
