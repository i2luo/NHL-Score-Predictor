'use client';

import { useState, useMemo, useEffect } from 'react';
import { Game } from '@/types/game';
import { fetchAllFutureGames } from '@/lib/api';
import { generateSeasonGames } from '@/lib/mockData';
import { getTeamName } from '@/lib/calculations';
import { Search, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface GameFinderProps {
  onGameSelect: (game: Game) => void;
}

export default function GameFinder({ onGameSelect }: GameFinderProps) {
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data from API, fallback to mock if API fails
  useEffect(() => {
    setIsClient(true);
    const loadGames = async () => {
      setIsLoading(true);
      try {
        const games = await fetchAllFutureGames();
        if (games.length > 0) {
          setAllGames(games);
        } else {
          // Fallback to mock data if API returns empty
          console.log('No games from API, using mock data');
          setAllGames(generateSeasonGames());
        }
      } catch (error) {
        console.error('Error loading games, using mock data:', error);
        // Fallback to mock data on error
        setAllGames(generateSeasonGames());
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredGames = useMemo(() => {
    if (!isClient) return [];
    const now = new Date();
    
    return allGames.filter(game => {
      // Only show future games (games that haven't happened yet)
      const gameDateTime = new Date(`${game.date}T${game.time}`);
      if (gameDateTime <= now) {
        return false;
      }
      
      // Team filter
      if (selectedTeam) {
        if (game.homeTeam !== selectedTeam && game.awayTeam !== selectedTeam) {
          return false;
        }
      }

      // Date range filter
      if (startDate && game.date < startDate) return false;
      if (endDate && game.date > endDate) return false;

      // Search term (team names)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const homeName = getTeamName(game.homeTeam).toLowerCase();
        const awayName = getTeamName(game.awayTeam).toLowerCase();
        const homeAbbr = game.homeTeam.toLowerCase();
        const awayAbbr = game.awayTeam.toLowerCase();
        
        if (!homeName.includes(searchLower) && 
            !awayName.includes(searchLower) &&
            !homeAbbr.includes(searchLower) &&
            !awayAbbr.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [allGames, searchTerm, selectedTeam, startDate, endDate, isClient]);

  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    allGames.forEach(game => {
      teams.add(game.homeTeam);
      teams.add(game.awayTeam);
    });
    return Array.from(teams).sort();
  }, [allGames]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Search className="w-6 h-6 text-blue-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Game Finder</h2>
          <p className="text-sm text-slate-400">
            Search and filter games from the current season
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Team name..."
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Teams</option>
              {uniqueTeams.map(team => (
                <option key={team} value={team}>
                  {team} - {getTeamName(team)}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-400 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading games...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-400">
                Found {filteredGames.length} games
              </p>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredGames.map((game) => {
                const gameDate = new Date(`${game.date}T${game.time}`);
                const winProb = game.currentWinProb || game.baseWinProb;
                
                return (
                  <button
                    key={game.id}
                    onClick={() => onGameSelect(game)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-blue-500 hover:bg-slate-800 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-400 min-w-[100px]">
                          {format(gameDate, 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold text-white">{game.awayTeam}</div>
                            <div className="text-xs text-slate-400">{getTeamName(game.awayTeam)}</div>
                          </div>
                          <div className="text-slate-600">@</div>
                          <div>
                            <div className="font-semibold text-white">{game.homeTeam}</div>
                            <div className="text-xs text-slate-400">{getTeamName(game.homeTeam)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-400">
                          {game.homeTeam} {winProb}%
                        </div>
                        <div className="text-xs text-slate-400">{game.time}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
