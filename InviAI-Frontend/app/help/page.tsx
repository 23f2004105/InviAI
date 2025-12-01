// Help Page - Help and support center
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Help & Support
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Get help with using InviAI
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Help center coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
