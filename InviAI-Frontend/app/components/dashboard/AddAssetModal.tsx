// Add Asset Modal - Add stocks to portfolio with quantity and price
'use client';

import React, { useState } from 'react';
import { X, IndianRupee, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { StockSearchModal } from './StockSearchModal';

interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    symbol: string;
    name: string;
    quantity: number;
    averageCost: number;
    exchange: string;
  }) => Promise<void>;
  portfolioName: string;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  portfolioName,
}) => {
  const [step, setStep] = useState<'search' | 'details'>('search');
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const [quantity, setQuantity] = useState('');
  const [averageCost, setAverageCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStockSelect = (stock: StockInfo) => {
    setSelectedStock(stock);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedStock || !quantity || !averageCost) {
      setError('Please fill in all fields');
      return;
    }

    const qty = parseFloat(quantity);
    const cost = parseFloat(averageCost);

    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    if (isNaN(cost) || cost <= 0) {
      setError('Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        quantity: qty,
        averageCost: cost,
        exchange: selectedStock.exchange,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('search');
    setSelectedStock(null);
    setQuantity('');
    setAverageCost('');
    setError('');
    onClose();
  };

  const handleBack = () => {
    setStep('search');
    setSelectedStock(null);
    setError('');
  };

  if (!isOpen) return null;

  // Stock search step
  if (step === 'search') {
    return (
      <StockSearchModal
        isOpen={true}
        onClose={handleClose}
        onSelectStock={handleStockSelect}
        title={`Add Stock to ${portfolioName}`}
      />
    );
  }

  // Details step
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add to {portfolioName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter purchase details
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Selected Stock Info */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {selectedStock?.symbol.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {selectedStock?.symbol.replace('.NS', '').replace('.BO', '')}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedStock?.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Choose different stock
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity (Shares)
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 10"
                min="0"
                step="1"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Average Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Average Cost per Share (₹)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                value={averageCost}
                onChange={(e) => setAverageCost(e.target.value)}
                placeholder="e.g., 2500.00"
                min="0"
                step="0.01"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Total Value Preview */}
          {quantity && averageCost && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Investment</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{(parseFloat(quantity) * parseFloat(averageCost)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              fullWidth
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </span>
              ) : (
                'Add to Portfolio'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
