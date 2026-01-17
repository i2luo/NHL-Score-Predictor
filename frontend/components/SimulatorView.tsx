'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Game, GoalieType, RestStatus } from '@/types/game';
import { calculateWinProb, getTeamName } from '@/lib/calculations';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface SimulatorViewProps {
  game: Game;
  onBack: () => void;
  onUpdate: (game: Game) => void;
}

export default function SimulatorView({ game: initialGame, onBack, onUpdate }: SimulatorViewProps) {
  const [game, setGame] = useState<Game>(initialGame);
  const [winProb, setWinProb] = useState(game.baseWinProb);
  
  // Use refs to track previous values and prevent infinite loops
  const prevWinProbRef = useRef<number>(game.baseWinProb);
  const onUpdateRef = useRef(onUpdate);
  const isUpdatingRef = useRef(false);
  
  // Keep onUpdate ref current without causing re-renders
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync state when initialGame prop changes (important for preserving injury data)
  useEffect(() => {
    // Only update if the game ID actually changed to prevent unnecessary updates
    if (initialGame.id !== game.id) {
      console.log('[SimulatorView] initialGame prop changed, syncing state:', {
        id: initialGame.id,
        teams: `${initialGame.awayTeam} @ ${initialGame.homeTeam}`,
        homeInjuries: initialGame.homeInjuries,
        homeInjuredPlayers: initialGame.homeInjuredPlayers?.length || 0,
        awayInjuries: initialGame.awayInjuries,
        awayInjuredPlayers: initialGame.awayInjuredPlayers?.length || 0,
      });
      setGame(initialGame);
      setWinProb(initialGame.baseWinProb);
      prevWinProbRef.current = initialGame.baseWinProb;
    }
  }, [initialGame.id]); // Only depend on ID, not the whole object

  // Calculate win probability when relevant game properties change
  // Only recalculate when properties that affect the calculation actually change
  useEffect(() => {
    if (isUpdatingRef.current) {
      // Skip if we're in the middle of an update to prevent loops
      return;
    }
    
    const newProb = calculateWinProb(game);
    
    // Only update if probability actually changed
    if (newProb !== prevWinProbRef.current) {
      setWinProb(newProb);
      prevWinProbRef.current = newProb;
      
      // Only call onUpdate if the probability changed significantly (more than 0.5%)
      const currentProb = game.currentWinProb || game.baseWinProb;
      if (Math.abs(newProb - currentProb) > 0.5) {
        isUpdatingRef.current = true;
        
        // Preserve all game data including injury arrays
        const updatedGame = {
          ...game,
          currentWinProb: newProb,
          // Explicitly preserve injury arrays to prevent loss
          homeInjuredPlayers: game.homeInjuredPlayers,
          awayInjuredPlayers: game.awayInjuredPlayers,
        };
        
        // Use ref to call onUpdate to avoid dependency issues
        onUpdateRef.current(updatedGame);
        
        // Reset flag after a brief delay to allow state to settle
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    }
  }, [
    // Only depend on the specific properties that affect the calculation
    game.homeGoalie,
    game.awayGoalie,
    game.homeInjuries,
    game.awayInjuries,
    game.homeRestDays,
    game.awayRestDays,
    game.baseWinProb,
    game.id, // Include ID to detect when game changes
  ]);

  const updateGame = (updates: Partial<Game>) => {
    setGame(prev => {
      const updated = { ...prev, ...updates };
      // Explicitly preserve injury arrays when updating
      if (updates.homeInjuredPlayers === undefined && prev.homeInjuredPlayers) {
        updated.homeInjuredPlayers = prev.homeInjuredPlayers;
      }
      if (updates.awayInjuredPlayers === undefined && prev.awayInjuredPlayers) {
        updated.awayInjuredPlayers = prev.awayInjuredPlayers;
      }
      console.log('[SimulatorView] updateGame called, preserving injuries:', {
        homeInjuredPlayers: updated.homeInjuredPlayers?.length || 0,
        awayInjuredPlayers: updated.awayInjuredPlayers?.length || 0,
      });
      return updated;
    });
  };

  const gameDate = new Date(`${game.date}T${game.time}`);
  const awayProb = 100 - winProb;
  const probChange = winProb - game.baseWinProb;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">War Room Simulator</h1>
            <div className="flex items-center gap-4 text-slate-400">
              <span>{format(gameDate, 'EEEE, MMMM d, yyyy')}</span>
              <span>•</span>
              <span>{game.time}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Prediction Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Teams */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8">
              <div className="flex items-start justify-between mb-8">
                <div className="flex-1">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{game.awayTeam}</div>
                    <div className="text-sm text-slate-400 mb-3">{getTeamName(game.awayTeam)}</div>
                  </div>
                  {/* Injured Players */}
                  {game.awayInjuredPlayers && game.awayInjuredPlayers.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="text-xs font-semibold text-orange-400 mb-2 text-center">
                        {game.awayInjuries} Injured Player{game.awayInjuries !== 1 ? 's' : ''}
                      </div>
                      <div className="space-y-1.5">
                        {game.awayInjuredPlayers.map((player, idx) => (
                          <div key={idx} className="text-xs text-orange-300 flex items-start gap-1.5">
                            <span className="text-orange-400 mt-0.5">•</span>
                            <div className="flex-1">
                              <span className="font-medium text-white">{player.player}</span>
                              {player.timeline && (
                                <span className="text-orange-400/70 ml-1">({player.timeline})</span>
                              )}
                              {player.reason && (
                                <span className="text-slate-400 text-[10px] block mt-0.5">{player.reason}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : game.awayInjuries > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="text-xs text-slate-500 text-center">
                        {game.awayInjuries} injured but player data not available
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="text-3xl text-slate-600 mx-8 mt-2">@</div>
                <div className="flex-1">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-2">{game.homeTeam}</div>
                    <div className="text-sm text-slate-400 mb-3">{getTeamName(game.homeTeam)}</div>
                  </div>
                  {/* Injured Players */}
                  {game.homeInjuredPlayers && game.homeInjuredPlayers.length > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="text-xs font-semibold text-orange-400 mb-2 text-center">
                        {game.homeInjuries} Injured Player{game.homeInjuries !== 1 ? 's' : ''}
                      </div>
                      <div className="space-y-1.5">
                        {game.homeInjuredPlayers.map((player, idx) => (
                          <div key={idx} className="text-xs text-orange-300 flex items-start gap-1.5">
                            <span className="text-orange-400 mt-0.5">•</span>
                            <div className="flex-1">
                              <span className="font-medium text-white">{player.player}</span>
                              {player.timeline && (
                                <span className="text-orange-400/70 ml-1">({player.timeline})</span>
                              )}
                              {player.reason && (
                                <span className="text-slate-400 text-[10px] block mt-0.5">{player.reason}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : game.homeInjuries > 0 ? (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="text-xs text-slate-500 text-center">
                        {game.homeInjuries} injured but player data not available
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Win Probability Bar */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Win Probability</span>
                  <div className="flex items-center gap-2">
                    {probChange !== 0 && (
                      <div className={`flex items-center gap-1 text-sm ${
                        probChange > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {probChange > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {probChange > 0 ? '+' : ''}{probChange}%
                      </div>
                    )}
                    <span className="text-2xl font-bold text-white">
                      {game.homeTeam} {winProb}%
                    </span>
                  </div>
                </div>
                <div className="h-6 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-slate-500 flex items-center justify-end pr-2"
                      style={{ width: `${awayProb}%` }}
                    >
                      {awayProb > 15 && (
                        <span className="text-xs text-white font-semibold">
                          {game.awayTeam} {awayProb}%
                        </span>
                      )}
                    </div>
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-500 flex items-center pl-2"
                      style={{ width: `${winProb}%` }}
                    >
                      {winProb > 15 && (
                        <span className="text-xs text-white font-semibold">
                          {game.homeTeam} {winProb}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 text-center">
                  Base probability: {game.baseWinProb}% (adjusted: {probChange > 0 ? '+' : ''}{probChange}%)
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`bg-slate-800/50 border rounded-xl p-4 ${
                game.awayInjuries > 0 ? 'border-orange-500/50 bg-orange-500/5' : 'border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-slate-400">Away Team</div>
                  {game.awayInjuries > 0 && (
                    <span className="text-xs font-semibold text-orange-400 bg-orange-400/20 px-2 py-1 rounded">
                      {game.awayInjuries} Injured
                    </span>
                  )}
                </div>
                {/* Injured Players List - Display directly under the badge */}
                {game.awayInjuredPlayers && game.awayInjuredPlayers.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-slate-700">
                    <div className="space-y-1.5">
                      {game.awayInjuredPlayers.map((player, idx) => (
                        <div key={idx} className="text-xs text-orange-300 flex items-start gap-1.5">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <div className="flex-1">
                            <span className="font-medium">{player.player}</span>
                            {player.timeline && (
                              <span className="text-orange-400/70 ml-1">({player.timeline})</span>
                            )}
                            {player.reason && (
                              <span className="text-slate-500 text-[10px] block mt-0.5">{player.reason}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-lg font-semibold text-white mb-2">{game.awayTeam}</div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div>
                    Goalie: {game.awayGoalie.replace('-', ' ')}
                    {game.awayGoalie === 'backup' && game.awayInjuredPlayers && (
                      <span className="text-orange-400 ml-1">⚠ Starter Injured</span>
                    )}
                  </div>
                  <div>Rest: {game.awayRestDays.replace('-', ' ')}</div>
                  {game.isAwayBackToBack && (
                    <div className="text-yellow-400">Back-to-Back</div>
                  )}
                </div>
              </div>
              <div className={`bg-slate-800/50 border rounded-xl p-4 ${
                game.homeInjuries > 0 ? 'border-orange-500/50 bg-orange-500/5' : 'border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-slate-400">Home Team</div>
                  {game.homeInjuries > 0 && (
                    <span className="text-xs font-semibold text-orange-400 bg-orange-400/20 px-2 py-1 rounded">
                      {game.homeInjuries} Injured
                    </span>
                  )}
                </div>
                {/* Injured Players List - Display directly under the badge */}
                {game.homeInjuredPlayers && game.homeInjuredPlayers.length > 0 && (
                  <div className="mb-3 pb-3 border-b border-slate-700">
                    <div className="space-y-1.5">
                      {game.homeInjuredPlayers.map((player, idx) => (
                        <div key={idx} className="text-xs text-orange-300 flex items-start gap-1.5">
                          <span className="text-orange-400 mt-0.5">•</span>
                          <div className="flex-1">
                            <span className="font-medium">{player.player}</span>
                            {player.timeline && (
                              <span className="text-orange-400/70 ml-1">({player.timeline})</span>
                            )}
                            {player.reason && (
                              <span className="text-slate-500 text-[10px] block mt-0.5">{player.reason}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-lg font-semibold text-white mb-2">{game.homeTeam}</div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div>
                    Goalie: {game.homeGoalie.replace('-', ' ')}
                    {game.homeGoalie === 'backup' && game.homeInjuredPlayers && (
                      <span className="text-orange-400 ml-1">⚠ Starter Injured</span>
                    )}
                  </div>
                  <div>Rest: {game.homeRestDays.replace('-', ' ')}</div>
                  {game.isHomeBackToBack && (
                    <div className="text-yellow-400">Back-to-Back</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Simulation Controls</h2>
              
              <div className="space-y-6">
                {/* Home Goalie */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {game.homeTeam} Goalie
                  </label>
                  <select
                    value={game.homeGoalie}
                    onChange={(e) => updateGame({ homeGoalie: e.target.value as GoalieType })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="backup">Backup</option>
                    <option value="third-string">3rd String</option>
                  </select>
                </div>

                {/* Away Goalie */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {game.awayTeam} Goalie
                  </label>
                  <select
                    value={game.awayGoalie}
                    onChange={(e) => updateGame({ awayGoalie: e.target.value as GoalieType })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="backup">Backup</option>
                    <option value="third-string">3rd String</option>
                  </select>
                </div>

                {/* Home Rest Days */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {game.homeTeam} Rest
                  </label>
                  <select
                    value={game.homeRestDays}
                    onChange={(e) => updateGame({ homeRestDays: e.target.value as RestStatus })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="fresh">Fresh</option>
                    <option value="back-to-back">Played Yesterday (B2B)</option>
                    <option value="three-in-four">3 in 4 Nights</option>
                    <option value="four-in-six">4 in 6 Nights</option>
                  </select>
                </div>

                {/* Away Rest Days */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {game.awayTeam} Rest
                  </label>
                  <select
                    value={game.awayRestDays}
                    onChange={(e) => updateGame({ awayRestDays: e.target.value as RestStatus })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="fresh">Fresh</option>
                    <option value="back-to-back">Played Yesterday (B2B)</option>
                    <option value="three-in-four">3 in 4 Nights</option>
                    <option value="four-in-six">4 in 6 Nights</option>
                  </select>
                </div>

                {/* Home Injuries */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {game.homeTeam} Key Players Injured
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={game.homeInjuries}
                    onChange={(e) => updateGame({ homeInjuries: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Away Injuries */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    {game.awayTeam} Key Players Injured
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={game.awayInjuries}
                    onChange={(e) => updateGame({ awayInjuries: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Impact Summary */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Impact Summary</h3>
              <div className="space-y-2 text-sm">
                {game.homeGoalie !== 'starter' && (
                  <div className="text-red-400">
                    - {game.homeGoalie === 'backup' ? '8%' : '15%'} (Home backup goalie)
                  </div>
                )}
                {game.awayGoalie !== 'starter' && (
                  <div className="text-green-400">
                    + {game.awayGoalie === 'backup' ? '8%' : '15%'} (Away backup goalie)
                  </div>
                )}
                {game.homeRestDays !== 'fresh' && (
                  <div className="text-red-400">
                    - {game.homeRestDays === 'back-to-back' ? '5%' : game.homeRestDays === 'three-in-four' ? '8%' : '12%'} (Home rest)
                  </div>
                )}
                {game.awayRestDays !== 'fresh' && (
                  <div className="text-green-400">
                    + {game.awayRestDays === 'back-to-back' ? '5%' : game.awayRestDays === 'three-in-four' ? '8%' : '12%'} (Away rest)
                  </div>
                )}
                {game.homeInjuries > 0 && (
                  <div className="text-red-400">
                    - {game.homeInjuries * 3}% ({game.homeInjuries} injured)
                  </div>
                )}
                {game.awayInjuries > 0 && (
                  <div className="text-green-400">
                    + {game.awayInjuries * 3}% ({game.awayInjuries} injured)
                  </div>
                )}
                {probChange === 0 && (
                  <div className="text-slate-400">No adjustments from base</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
