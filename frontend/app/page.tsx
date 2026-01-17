'use client';

import { useState, useEffect } from 'react';
import { Game } from '@/types/game';
import { fetchUpcomingGames } from '@/lib/api';
import { generateUpcomingGames } from '@/lib/mockData';
import UpcomingGames from '@/components/UpcomingGames';
import GameFinder from '@/components/GameFinder';
import SimulatorView from '@/components/SimulatorView';
import { Search, Calendar } from 'lucide-react';

export default function Home() {
  const [view, setView] = useState<'upcoming' | 'finder'>('upcoming');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data from API, fallback to mock if API fails
  useEffect(() => {
    setIsClient(true);
    const loadGames = async () => {
      setIsLoading(true);
      try {
        console.log('[Frontend] Fetching upcoming games...');
        const games = await fetchUpcomingGames();
        console.log(`[Frontend] Received ${games.length} games`);
        
        // Check for injury data in received games
        const gamesWithInjuries = games.filter(g => 
          (g.homeInjuredPlayers && g.homeInjuredPlayers.length > 0) || 
          (g.awayInjuredPlayers && g.awayInjuredPlayers.length > 0)
        );
        console.log(`[Frontend] Games with injury data: ${gamesWithInjuries.length}`);
        
        // Log first game with injuries
        if (gamesWithInjuries.length > 0) {
          const firstGame = gamesWithInjuries[0];
          console.log(`[Frontend] Sample game with injuries:`, {
            id: firstGame.id,
            teams: `${firstGame.awayTeam} @ ${firstGame.homeTeam}`,
            homeInjuries: firstGame.homeInjuries,
            homePlayers: firstGame.homeInjuredPlayers?.map(p => p.player),
            awayInjuries: firstGame.awayInjuries,
            awayPlayers: firstGame.awayInjuredPlayers?.map(p => p.player)
          });
        }
        
        if (games.length > 0) {
          setUpcomingGames(games);
          console.log('[Frontend] Using API data');
        } else {
          // Fallback to mock data if API returns empty
          console.warn('[Frontend] No games from API, using mock data');
          const mockGames = generateUpcomingGames();
          
          // Try to attach real injury data to mock games
          try {
            const injuryResponse = await fetch('/api/games?upcoming=true');
            if (injuryResponse.ok) {
              const data = await injuryResponse.json();
              if (data.injuryData) {
                console.log('[Frontend] Attaching real injury data to mock games');
                // Attach injury data to mock games by team
                mockGames.forEach(game => {
                  if (data.injuryData[game.homeTeam]) {
                    game.homeInjuredPlayers = data.injuryData[game.homeTeam];
                    game.homeInjuries = data.injuryData[game.homeTeam].length;
                  }
                  if (data.injuryData[game.awayTeam]) {
                    game.awayInjuredPlayers = data.injuryData[game.awayTeam];
                    game.awayInjuries = data.injuryData[game.awayTeam].length;
                  }
                });
                console.log(`[Frontend] Attached injury data to ${mockGames.filter(g => g.homeInjuredPlayers || g.awayInjuredPlayers).length} mock games`);
              }
            }
          } catch (e) {
            console.warn('[Frontend] Could not fetch injury data:', e);
          }
          
          setUpcomingGames(mockGames);
        }
      } catch (error) {
        console.error('[Frontend] Error loading games, using mock data:', error);
        // Fallback to mock data on error
        setUpcomingGames(generateUpcomingGames());
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  if (selectedGame) {
    // Debug: Log game being passed to SimulatorView
    console.log('[Page] Passing game to SimulatorView:', {
      id: selectedGame.id,
      teams: `${selectedGame.awayTeam} @ ${selectedGame.homeTeam}`,
      homeInjuries: selectedGame.homeInjuries,
      homeInjuredPlayers: selectedGame.homeInjuredPlayers?.length || 0,
      homePlayers: selectedGame.homeInjuredPlayers?.map(p => p.player),
      awayInjuries: selectedGame.awayInjuries,
      awayInjuredPlayers: selectedGame.awayInjuredPlayers?.length || 0,
      awayPlayers: selectedGame.awayInjuredPlayers?.map(p => p.player),
    });
    
    return (
      <SimulatorView 
        game={selectedGame} 
        onBack={() => setSelectedGame(null)}
        onUpdate={(updatedGame) => {
          console.log('[Page] onUpdate called with:', {
            id: updatedGame.id,
            homeInjuredPlayers: updatedGame.homeInjuredPlayers?.length || 0,
            awayInjuredPlayers: updatedGame.awayInjuredPlayers?.length || 0,
          });
          setSelectedGame(updatedGame);
          // Update in upcoming games if it exists there
          const index = upcomingGames.findIndex(g => g.id === updatedGame.id);
          if (index !== -1) {
            upcomingGames[index] = updatedGame;
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">NHL War Room</h1>
              <p className="text-sm text-slate-400">Score Predictor & Simulator</p>
            </div>
            <nav className="flex gap-2">
              <button
                onClick={() => setView('upcoming')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'upcoming'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Upcoming Games
              </button>
              <button
                onClick={() => setView('finder')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  view === 'finder'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <Search className="w-4 h-4" />
                Game Finder
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!isClient || isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading games...</p>
          </div>
        ) : view === 'upcoming' ? (
          <UpcomingGames 
            games={upcomingGames} 
            onGameSelect={setSelectedGame}
          />
        ) : (
          <GameFinder onGameSelect={setSelectedGame} />
        )}
      </main>
    </div>
  );
}
