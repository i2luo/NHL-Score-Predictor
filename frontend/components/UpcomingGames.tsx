'use client';

import { useEffect } from 'react';
import { Game } from '@/types/game';
import GameCard from './GameCard';
import { Clock } from 'lucide-react';

interface UpcomingGamesProps {
  games: Game[];
  onGameSelect: (game: Game) => void;
}

export default function UpcomingGames({ games, onGameSelect }: UpcomingGamesProps) {
  // Debug: Log games received
  useEffect(() => {
    const gamesWithInjuries = games.filter(g => 
      (g.homeInjuredPlayers && g.homeInjuredPlayers.length > 0) || 
      (g.awayInjuredPlayers && g.awayInjuredPlayers.length > 0)
    );
    console.log(`[UpcomingGames] Received ${games.length} games, ${gamesWithInjuries.length} with injuries`);
    if (gamesWithInjuries.length > 0) {
      const first = gamesWithInjuries[0];
      console.log(`[UpcomingGames] First game with injuries:`, {
        id: first.id,
        teams: `${first.awayTeam} @ ${first.homeTeam}`,
        homePlayers: first.homeInjuredPlayers?.map(p => p.player),
        awayPlayers: first.awayInjuredPlayers?.map(p => p.player)
      });
    }
  }, [games]);
  
  // Filter games in next 48 hours (already filtered in generateUpcomingGames, but double-check)
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  const upcomingGames = games.filter(game => {
    const gameDate = new Date(`${game.date}T${game.time}`);
    // Only show future games from 2026 season
    const isFuture = gameDate > now;
    const isIn48Hours = gameDate <= in48Hours;
    const is2026Season = game.date.startsWith('2026') || game.date.startsWith('2025-10') || game.date.startsWith('2025-11') || game.date.startsWith('2025-12');
    return isFuture && isIn48Hours && is2026Season;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-6 h-6 text-blue-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Upcoming Games</h2>
          <p className="text-sm text-slate-400">
            Next 48 hours • {upcomingGames.length} games
          </p>
        </div>
      </div>

      {upcomingGames.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-slate-400">No games scheduled in the next 48 hours</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onClick={() => onGameSelect(game)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
