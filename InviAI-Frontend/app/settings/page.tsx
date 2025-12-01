// Settings Page - User settings and preferences
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Settings feature coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
