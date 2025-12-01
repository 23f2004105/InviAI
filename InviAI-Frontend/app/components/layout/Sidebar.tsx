// Sidebar Component - Side navigation menu
'use client';

import React from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  Settings,
  HelpCircle,
  BarChart3,
  PieChart,
  FileText,
  X
} from 'lucide-react';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      href: '/dashboard'
    },
    {
      name: 'Portfolios',
      icon: <Wallet className="w-5 h-5" />,
      href: '/portfolios'
    },
    {
      name: 'Assets',
      icon: <PieChart className="w-5 h-5" />,
      href: '/assets'
    },
    {
      name: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      href: '/analytics'
    },
    {
      name: 'NSE/BSE Trends',
      icon: <TrendingUp className="w-5 h-5" />,
      href: '/trends',
      badge: 'New'
    },
    {
      name: 'Reports',
      icon: <FileText className="w-5 h-5" />,
      href: '/reports'
    }
  ];

  const bottomNavItems: NavItem[] = [
    {
      name: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      href: '/settings'
    },
    {
      name: 'Help & Support',
      icon: <HelpCircle className="w-5 h-5" />,
      href: '/help'
    }
  ];

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IA</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              InviAI
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col justify-between h-[calc(100%-64px)] lg:h-full p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive(item.href)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="text-sm">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Bottom navigation */}
          <div className="space-y-1 pt-4 border-t border-gray-200 dark:border-gray-700">
            {bottomNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive(item.href)
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {item.icon}
                <span className="text-sm">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
};
