// PortfolioValueChart Component - Displays portfolio value over time as a line chart
'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { HistoricalDataPoint } from '@/app/lib/mockData';

interface PortfolioValueChartProps {
  data: HistoricalDataPoint[];
  height?: number;
  title?: string;
  color?: string;
  showArea?: boolean;
}

export const PortfolioValueChart: React.FC<PortfolioValueChartProps> = ({
  data,
  height = 300,
  title,
  color = '#3b82f6',
  showArea = true
}) => {
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    // Show month and year for better readability with monthly data
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  // Format value for display
  const formatValue = (value: number) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Calculate percentage change
  const calculateChange = () => {
    if (data.length < 2) return { value: 0, percent: 0, isPositive: true };
    
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const change = lastValue - firstValue;
    const percentChange = (change / firstValue) * 100;
    
    return {
      value: Math.abs(change),
      percent: Math.abs(percentChange),
      isPositive: change >= 0
    };
  };

  const change = calculateChange();

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(data.date)}
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatValue(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && (
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {title}
          </h4>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatValue(data[data.length - 1]?.value || 0)}
            </span>
            <span
              className={`text-sm font-medium ${
                change.isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {change.isPositive ? '+' : '-'}₹{change.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {' '}({change.isPositive ? '+' : '-'}{change.percent.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        {showArea ? (
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <YAxis
              tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
