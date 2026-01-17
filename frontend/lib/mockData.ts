import { Game, GoalieType, RestStatus } from '@/types/game';

/**
 * Generate mock upcoming games for testing/fallback
 */
export function generateUpcomingGames(): Game[] {
  const now = new Date();
  const games: Game[] = [];
  
  // Generate games for next 48 hours
  for (let i = 0; i < 5; i++) {
    const gameDate = new Date(now);
    gameDate.setDate(gameDate.getDate() + Math.floor(i / 2));
    gameDate.setHours(19 + (i % 2) * 2, 0, 0, 0);
    
    const teams = [
      { home: 'TOR', away: 'MTL' },
      { home: 'VAN', away: 'EDM' },
      { home: 'NYR', away: 'BOS' },
      { home: 'COL', away: 'DAL' },
      { home: 'TBL', away: 'FLA' },
    ];
    
    const matchup = teams[i % teams.length];
    
    games.push({
      id: `mock-game-${i}`,
      homeTeam: matchup.home,
      awayTeam: matchup.away,
      date: gameDate.toISOString().split('T')[0],
      time: gameDate.toTimeString().slice(0, 5),
      homeGoalie: 'starter' as GoalieType,
      awayGoalie: 'starter' as GoalieType,
      isHomeBackToBack: false,
      isAwayBackToBack: false,
      homeRestDays: 'fresh' as RestStatus,
      awayRestDays: 'fresh' as RestStatus,
      homeInjuries: 0,
      awayInjuries: 0,
      baseWinProb: 50,
      currentWinProb: 50,
    });
  }
  
  return games;
}

/**
 * Generate mock season games for testing/fallback
 */
export function generateSeasonGames(): Game[] {
  const now = new Date();
  const games: Game[] = [];
  
  const teams = [
    'ANA', 'ARI', 'BOS', 'BUF', 'CGY', 'CAR', 'CHI', 'COL', 'CBJ', 'DAL',
    'DET', 'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NSH', 'NJD', 'NYI', 'NYR',
    'OTT', 'PHI', 'PIT', 'SJS', 'SEA', 'STL', 'TBL', 'TOR', 'UTA', 'VAN',
    'VEG', 'WSH', 'WPG'
  ];
  
  // Generate games for next 30 days
  for (let i = 0; i < 50; i++) {
    const gameDate = new Date(now);
    gameDate.setDate(gameDate.getDate() + Math.floor(i / 3));
    gameDate.setHours(19 + (i % 3), 0, 0, 0);
    
    const homeIdx = i % teams.length;
    const awayIdx = (i + 1) % teams.length;
    
    games.push({
      id: `mock-season-game-${i}`,
      homeTeam: teams[homeIdx],
      awayTeam: teams[awayIdx],
      date: gameDate.toISOString().split('T')[0],
      time: gameDate.toTimeString().slice(0, 5),
      homeGoalie: 'starter' as GoalieType,
      awayGoalie: 'starter' as GoalieType,
      isHomeBackToBack: i % 7 === 0,
      isAwayBackToBack: i % 7 === 1,
      homeRestDays: (i % 4 === 0 ? 'back-to-back' : 'fresh') as RestStatus,
      awayRestDays: (i % 4 === 1 ? 'back-to-back' : 'fresh') as RestStatus,
      homeInjuries: 0,
      awayInjuries: 0,
      baseWinProb: 50,
      currentWinProb: 50,
    });
  }
  
  return games;
}
