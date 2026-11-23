// Reports Page - Portfolio summary report with CSV export and print
'use client';

import React from 'react';
import { useUser } from '@/app/contexts/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Download, Printer, FileText } from 'lucide-react';

const formatINR = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReportsPage() {
  const { user, portfolios, isLoading } = useUser();

  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const totalReturn = portfolios.reduce((sum, p) => sum + p.change24h, 0);
  const totalCost = totalValue - totalReturn;
  const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  const holdingsCount = portfolios.reduce((sum, p) => sum + p.assets.length, 0);
  const generatedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const downloadCsv = () => {
    const rows = [
      ['Portfolio', 'Symbol', 'Name', 'Type', 'Quantity', 'Price (INR)', 'Value (INR)', 'Weight %', 'Return %'],
      ...portfolios.flatMap((p) =>
        p.assets.map((a) => [
          p.name, a.ticker, a.name, a.assetType, a.quantity,
          a.currentPrice.toFixed(2), a.value.toFixed(2), a.weight.toFixed(2), a.changePercent24h.toFixed(2),
        ])
      ),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `enviai-portfolio-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Portfolio summary for {user?.name ?? 'you'} · generated {generatedAt}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>
          <Button className="flex items-center gap-2" onClick={downloadCsv} disabled={holdingsCount === 0}>
            <Download className="w-4 h-4" />
            Download CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current Value', value: formatINR(totalValue) },
          { label: 'Amount Invested', value: formatINR(totalCost) },
          {
            label: 'Total Return',
            value: `${totalReturn >= 0 ? '+' : ''}${formatINR(totalReturn)}`,
            sub: `${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%`,
            positive: totalReturn >= 0,
          },
          { label: 'Holdings', value: String(holdingsCount), sub: `${portfolios.length} portfolios` },
        ].map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                stat.positive === undefined
                  ? 'text-gray-900 dark:text-white'
                  : stat.positive
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            >
              {stat.value}
            </p>
            {stat.sub && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.sub}</p>}
          </Card>
        ))}
      </div>

      {portfolios.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <FileText className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Create a portfolio and add holdings to generate a report.
            </p>
          </div>
        </Card>
      )}

      {/* Per-portfolio breakdown */}
      {portfolios.map((p) => {
        const cost = p.totalValue - p.change24h;
        return (
          <Card key={p.id} className="break-inside-avoid">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{p.name}</CardTitle>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{formatINR(p.totalValue)}</p>
                  <p className={`text-sm ${p.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {p.change24h >= 0 ? '+' : ''}{formatINR(p.change24h)} ({p.changePercent24h.toFixed(2)}%) on {formatINR(cost)} invested
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {p.assets.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No holdings in this portfolio.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2 pr-4 font-medium">Symbol</th>
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium text-right">Qty</th>
                        <th className="py-2 pr-4 font-medium text-right">Price</th>
                        <th className="py-2 pr-4 font-medium text-right">Value</th>
                        <th className="py-2 pr-4 font-medium text-right">Weight</th>
                        <th className="py-2 font-medium text-right">Return</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.assets.map((a) => (
                        <tr key={a.ticker} className="border-b border-gray-100 dark:border-gray-700/50 text-gray-900 dark:text-gray-100">
                          <td className="py-2 pr-4 font-semibold">{a.ticker}</td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{a.name}</td>
                          <td className="py-2 pr-4 text-right">{a.quantity}</td>
                          <td className="py-2 pr-4 text-right">{formatINR(a.currentPrice)}</td>
                          <td className="py-2 pr-4 text-right">{formatINR(a.value)}</td>
                          <td className="py-2 pr-4 text-right">{a.weight.toFixed(1)}%</td>
                          <td className={`py-2 text-right ${a.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {a.changePercent24h >= 0 ? '+' : ''}{a.changePercent24h.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Prices from NSE/BSE via market data providers; may be delayed. For information only, not investment advice.
      </p>
    </div>
  );
}
