// Settings Page - Profile, investor profile (used by the AI advisor), appearance, account
'use client';

import React, { useEffect, useState } from 'react';
import { useUser } from '@/app/contexts/UserContext';
import { useAuth } from '@/app/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { User, Target, Moon, LogOut, Check } from 'lucide-react';

// Read by ChatBot.tsx to give the AI advisor context
const INVESTOR_PROFILE_KEY = 'inviai_investor_profile';

interface InvestorProfile {
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  investment_period: string;
  budget: string;
}

const defaultProfile: InvestorProfile = {
  risk_tolerance: 'moderate',
  investment_period: '5+ years',
  budget: '',
};

export default function SettingsPage() {
  const { user } = useUser();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<InvestorProfile>(defaultProfile);
  const [saved, setSaved] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(INVESTOR_PROFILE_KEY);
      if (stored) setProfile({ ...defaultProfile, ...JSON.parse(stored) });
    } catch {
      // Ignore unreadable storage; defaults are fine
    }
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(INVESTOR_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Storage unavailable; the preference just won't persist
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark(document.documentElement.classList.contains('dark'));
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full name</label>
              <input className={inputClass} value={user?.name ?? ''} readOnly />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={inputClass} value={user?.email ?? ''} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investor profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Investor Profile
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            The AI advisor uses this to personalise its suggestions.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className={labelClass}>Risk tolerance</label>
              <div className="grid grid-cols-3 gap-2">
                {(['conservative', 'moderate', 'aggressive'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setProfile({ ...profile, risk_tolerance: level })}
                    className={`px-3 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-colors ${
                      profile.risk_tolerance === level
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Investment horizon</label>
                <select
                  className={inputClass}
                  value={profile.investment_period}
                  onChange={(e) => setProfile({ ...profile, investment_period: e.target.value })}
                >
                  <option>Less than 1 year</option>
                  <option>1-3 years</option>
                  <option>3-5 years</option>
                  <option>5+ years</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Investable amount (₹)</label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  placeholder="100000"
                  value={profile.budget}
                  onChange={(e) => setProfile({ ...profile, budget: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="flex items-center gap-2">
              {saved ? <Check className="w-4 h-4" /> : null}
              {saved ? 'Saved' : 'Save preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Dark mode</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Switch between light and dark themes</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDark}
            onClick={toggleDark}
            className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isDark ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Account */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Sign out</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">End your session on this device</p>
          </div>
          <Button variant="danger" className="flex items-center gap-2" onClick={logout}>
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </Card>
    </div>
  );
}
