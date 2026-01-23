'use client';

import { useEffect } from 'react';
import { Game } from '@/types/game';
import { getTeamName, calculateWinProb } from '@/lib/calculations';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';

interface GameCardProps {
  game: Game;
  onClick: () => void;
}

export default function GameCard({ game, onClick }: GameCardProps) {
  const gameDate = new Date(`${game.date}T${game.time}`);
  // Calculate adjusted win probability that accounts for injuries, goalies, rest days
  const winProb = calculateWinProb(game);
  const awayProb = 100 - winProb;
  
  // Debug logging for win probabilities
  useEffect(() => {
    if (winProb === 50 && game.baseWinProb === 50) {
      console.warn(`[GameCard] ⚠️ Game ${game.awayTeam} @ ${game.homeTeam} has default 50% probability - prediction may not have been applied`);
    } else {
      console.log(`[GameCard] Game ${game.awayTeam} @ ${game.homeTeam}: baseWinProb=${game.baseWinProb}, currentWinProb=${game.currentWinProb}, displayed=${winProb}`);
    }
  }, [game.id, winProb, game.baseWinProb, game.currentWinProb, game.awayTeam, game.homeTeam]);

  const handleClick = () => {
    console.log('[GameCard] Clicked game:', {
      id: game.id,
      teams: `${game.awayTeam} @ ${game.homeTeam}`,
      homeInjuries: game.homeInjuries,
      homeInjuredPlayers: game.homeInjuredPlayers?.length || 0,
      homePlayers: game.homeInjuredPlayers?.map(p => p.player),
      awayInjuries: game.awayInjuries,
      awayInjuredPlayers: game.awayInjuredPlayers?.length || 0,
      awayPlayers: game.awayInjuredPlayers?.map(p => p.player),
    });
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="group relative bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500 hover:bg-slate-800 transition-all duration-200 text-left w-full"
    >
      {/* Date & Time */}
      <div className="text-xs text-slate-400 mb-4">
        {format(gameDate, 'EEE, MMM d')} • {game.time}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold text-white">
              {game.awayTeam}
            </div>
            {game.awayInjuries > 0 && (
              <span className="text-xs font-semibold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">
                {game.awayInjuries} ⚠
              </span>
            )}
          </div>
          <div className="text-sm text-slate-400">
            {getTeamName(game.awayTeam)}
          </div>
        </div>

        <div className="mx-4 text-slate-600">
          <ArrowRight className="w-5 h-5" />
        </div>

        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-2">
            {game.homeInjuries > 0 && (
              <span className="text-xs font-semibold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">
                {game.homeInjuries} ⚠
              </span>
            )}
            <div className="text-lg font-semibold text-white">
              {game.homeTeam}
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {getTeamName(game.homeTeam)}
          </div>
        </div>
      </div>

      {/* Win Probability Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Win Probability</span>
          <span className="font-semibold text-white">
            {game.homeTeam} {winProb}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-slate-500"
              style={{ width: `${awayProb}%` }}
            />
            <div
              className="bg-blue-600 group-hover:bg-blue-500 transition-colors"
              style={{ width: `${winProb}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              {game.awayGoalie === 'starter' ? '✓ Starter' : game.awayGoalie}
            </span>
            {game.awayGoalie === 'backup' && game.awayInjuredPlayers && (
              <span className="text-orange-400 text-[10px]">⚠ Starter Out</span>
            )}
            {game.isAwayBackToBack && (
              <span className="text-yellow-400">B2B</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {game.homeGoalie === 'backup' && game.homeInjuredPlayers && (
              <span className="text-orange-400 text-[10px]">⚠ Starter Out</span>
            )}
            {game.isHomeBackToBack && (
              <span className="text-yellow-400">B2B</span>
            )}
            <span>
              {game.homeGoalie === 'starter' ? '✓ Starter' : game.homeGoalie}
            </span>
          </div>
        </div>
        {/* Show key injured players if available */}
        {((game.awayInjuredPlayers?.length ?? 0) > 0 || (game.homeInjuredPlayers?.length ?? 0) > 0) && (
          <div className="text-[10px] text-slate-500 space-y-1">
            {game.awayInjuredPlayers && game.awayInjuredPlayers.length > 0 && (
              <div>
                <span className="text-orange-400">{game.awayTeam}:</span>{' '}
                {game.awayInjuredPlayers.slice(0, 2).map(p => p.player.split(',')[0]).join(', ')}
                {game.awayInjuredPlayers.length > 2 && ' +' + (game.awayInjuredPlayers.length - 2)}
              </div>
            )}
            {game.homeInjuredPlayers && game.homeInjuredPlayers.length > 0 && (
              <div>
                <span className="text-orange-400">{game.homeTeam}:</span>{' '}
                {game.homeInjuredPlayers.slice(0, 2).map(p => p.player.split(',')[0]).join(', ')}
                {game.homeInjuredPlayers.length > 2 && ' +' + (game.homeInjuredPlayers.length - 2)}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
