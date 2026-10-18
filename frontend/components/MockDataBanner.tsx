'use client';

import { AlertTriangle } from 'lucide-react';

interface MockDataBannerProps {
  reason?: string;
}

/**
 * Shown whenever the UI falls back to generated placeholder games, so stale or
 * missing data is obvious instead of looking like a real schedule.
 */
export default function MockDataBanner({ reason }: MockDataBannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
      <div className="text-sm">
        <p className="font-semibold text-amber-300">Showing placeholder games — not the real NHL schedule</p>
        <p className="mt-0.5 text-amber-200/80">
          {reason || 'The live game data is unavailable or out of date.'} Matchups, times and
          probabilities below are sample data only.
        </p>
      </div>
    </div>
  );
}
