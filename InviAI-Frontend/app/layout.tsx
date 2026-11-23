// Root Layout - Main application layout with providers
'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { UserProvider, useUser } from './contexts/UserContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

// Routes that should not show navbar/sidebar
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, error, isDemo, refreshUser, refreshPortfolios } = useUser();
  const { isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth pages without navbar/sidebar
  if (isAuthRoute || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    );
  }

  // Show full layout for authenticated users
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navbar */}
      <Navbar 
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        userName={user?.name}
        userAvatar={user?.avatar}
        onLogout={logout}
      />

      {/* Main container */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 lg:ml-64 p-6">
          {error && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200"
            >
              <span>{error}</span>
              <button
                onClick={() => { refreshUser(); refreshPortfolios(); }}
                className="rounded-md bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          {isDemo && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              Demo mode: you are viewing sample data. Create an account to track your own portfolio.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Envi AI</title>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <UserProvider>
            <LayoutContent>{children}</LayoutContent>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
