'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { Portfolio } from '@/app/lib/mockData';
import { optimizePortfolio, OptimizationResult, RiskProfile } from '@/app/lib/api';

const PROFILES: { value: RiskProfile; label: string; hint: string }[] = [
  { value: 'conservative', label: 'Conservative', hint: 'Lowest volatility' },
  { value: 'moderate', label: 'Moderate', hint: 'Best risk-adjusted return' },
  { value: 'aggressive', label: 'Aggressive', hint: 'Higher return, more risk' },
];

function savedRisk(): RiskProfile {
  try {
    const raw = localStorage.getItem('inviai_investor_profile');
    const r = raw ? JSON.parse(raw)?.risk_tolerance : null;
    if (r === 'conservative' || r === 'moderate' || r === 'aggressive') return r;
  } catch {
    /* ignore */
  }
  return 'moderate';
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

interface OptimizePanelProps {
  portfolio: Portfolio;
  onClose: () => void;
}

export const OptimizePanel: React.FC<OptimizePanelProps> = ({ portfolio, onClose }) => {
  const [risk, setRisk] = useState<RiskProfile>('moderate');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (r: RiskProfile) => {
    setLoading(true);
    setError('');
    try {
      setResult(await optimizePortfolio(portfolio.id, r));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Optimization failed.');
    } finally {
      setLoading(false);
    }
  }, [portfolio.id]);

  useEffect(() => {
    const r = savedRisk();
    setRisk(r);
    run(r);
  }, [run]);

  const choose = (r: RiskProfile) => {
    setRisk(r);
    run(r);
  };

  const m = result?.metrics;
  const metricRows: { label: string; key: 'expected_return' | 'volatility' | 'sharpe'; fmt: (x: number) => string }[] = [
    { label: 'Expected return', key: 'expected_return', fmt: pct },
    { label: 'Volatility', key: 'volatility', fmt: pct },
    { label: 'Sharpe ratio', key: 'sharpe', fmt: (x) => x.toFixed(2) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Optimize: {portfolio.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {PROFILES.map((p) => (
              <button
                key={p.value}
                onClick={() => choose(p.value)}
                disabled={loading}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  risk === p.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">{p.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{p.hint}</div>
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Crunching a year of prices…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>
          )}

          {result && m && !loading && (
            <>
              {result.uses_sample_data && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                  Live price history was unavailable for some stocks, so sample data was used. Treat these numbers as illustrative.
                </div>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-2 font-medium"></th>
                    <th className="py-2 font-medium text-right">Current</th>
                    <th className="py-2 font-medium text-right">Suggested</th>
                    <th className="py-2 font-medium text-right">Equal-weight</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-white">
                  {metricRows.map((row) => (
                    <tr key={row.key} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="py-2 text-gray-600 dark:text-gray-300">{row.label}</td>
                      <td className="py-2 text-right">{row.fmt(m.current[row.key])}</td>
                      <td className="py-2 text-right font-semibold text-blue-600 dark:text-blue-400">{row.fmt(m.suggested[row.key])}</td>
                      <td className="py-2 text-right">{row.fmt(m.equal_weight[row.key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-2 font-medium">Stock</th>
                    <th className="py-2 font-medium text-right">Current %</th>
                    <th className="py-2 font-medium text-right">Suggested %</th>
                    <th className="py-2 font-medium text-right">Drift</th>
                    <th className="py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-white">
                  {result.holdings.map((h) => {
                    const big = Math.abs(h.drift) > 5;
                    return (
                      <tr key={h.symbol} className={`border-t border-gray-100 dark:border-gray-700 ${big ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                        <td className="py-2">
                          <div className="font-medium">{h.symbol.replace(/\.(NS|BO)$/, '')}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{h.name}</div>
                        </td>
                        <td className="py-2 text-right">{h.current_weight.toFixed(1)}%</td>
                        <td className="py-2 text-right font-semibold">{h.suggested_weight.toFixed(1)}%</td>
                        <td className={`py-2 text-right ${big ? 'font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                          {h.drift > 0 ? '+' : ''}{h.drift.toFixed(1)}
                        </td>
                        <td className="py-2 text-right">
                          {h.action === 'buy' && <span className="rounded bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-green-700 dark:text-green-400">Buy {h.shares}</span>}
                          {h.action === 'sell' && <span className="rounded bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-red-700 dark:text-red-400">Sell {h.shares}</span>}
                          {h.action === 'hold' && <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-gray-600 dark:text-gray-300">Hold</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Markowitz mean-variance optimization on 1-year daily returns · risk-free 6.5% · max 40% per stock. Educational only — not financial advice.
          </p>
        </div>
      </div>
    </div>
  );
};
