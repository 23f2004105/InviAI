// Help & Support Page - FAQ for using InviAI
'use client';

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqs = [
  {
    q: 'How do I create a portfolio?',
    a: 'Go to Portfolios and click "Create Portfolio" (or "Add Portfolio" on the dashboard). Give it a name such as Long Term or Retirement.',
  },
  {
    q: 'How do I add stocks to a portfolio?',
    a: 'On the Portfolios page click "Add Stock" on a portfolio, search for an NSE or BSE company (e.g. RELIANCE, TCS), then enter the number of shares and your average buy price. InviAI fetches the live price and calculates value, weight and returns.',
  },
  {
    q: 'Where do the prices come from?',
    a: 'Live quotes for NSE (.NS) and BSE (.BO) symbols come from Yahoo Finance. Prices may be delayed; use "Refresh Prices" to update a portfolio.',
  },
  {
    q: 'How does the AI advisor work?',
    a: 'Click the chat bubble at the bottom-right of the dashboard. The advisor answers questions about Indian stocks, mutual funds, SIPs and tax-saving options. Set your risk tolerance, horizon and budget in Settings → Investor Profile to personalise its suggestions.',
  },
  {
    q: 'Can InviAI buy or sell stocks for me?',
    a: 'No. InviAI is a read-only planning and tracking tool. It never places orders; you trade through your own broker.',
  },
  {
    q: 'How do I export my holdings?',
    a: 'Open Reports to see a summary of every portfolio. Use "Download CSV" for a spreadsheet or "Print / PDF" to save a copy.',
  },
  {
    q: 'Is the advice guaranteed?',
    a: 'No. Suggestions are educational and based on general principles. Investments are subject to market risk; please consult a SEBI-registered adviser for personal financial advice.',
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Answers to common questions about InviAI</p>
      </div>

      <Card className="divide-y divide-gray-200 dark:divide-gray-700 p-0">
        {faqs.map((item, i) => (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
            >
              <span className="flex items-center gap-3 font-medium text-gray-900 dark:text-white">
                <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
                {item.q}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`}
              />
            </button>
            {open === i && (
              <p className="px-6 pb-4 pl-14 text-gray-600 dark:text-gray-300">{item.a}</p>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
