import { Game, Team, InjuredPlayer } from '@/types/game';

// Sample player names for generating mock injured players
const SAMPLE_PLAYERS = [
  'Connor McDavid', 'Sidney Crosby', 'Nathan MacKinnon', 'Auston Matthews',
  'Leon Draisaitl', 'Artemi Panarin', 'David Pastrnak', 'Nikita Kucherov',
  'Cale Makar', 'Victor Hedman', 'Roman Josi', 'Adam Fox',
  'Andrei Vasilevskiy', 'Igor Shesterkin', 'Connor Hellebuyck', 'Jake Oettinger',
  'Mitch Marner', 'William Nylander', 'Brayden Point', 'Steven Stamkos',
  'Erik Karlsson', 'Quinn Hughes', 'Miro Heiskanen', 'Charlie McAvoy'
];

// Generate mock injured players
function generateInjuredPlayers(count: number, team: string): InjuredPlayer[] {
  if (count === 0) return [];
  
  const players: InjuredPlayer[] = [];
  const reasons = [
    'Upper body', 'Lower body', 'Knee', 'Shoulder', 'Concussion',
    'Groin', 'Ankle', 'Wrist', 'Back', 'Hip'
  ];
  const timelines = [
    'Day-to-day', 'Week-to-week', '2-3 weeks', '4-6 weeks', 'Indefinite',
    'Expected return soon', 'Out indefinitely'
  ];
  
  for (let i = 0; i < count; i++) {
    const playerIndex = (team.charCodeAt(0) + i * 7) % SAMPLE_PLAYERS.length;
    const reasonIndex = (team.charCodeAt(1) + i * 3) % reasons.length;
    const timelineIndex = (team.charCodeAt(2) + i * 5) % timelines.length;
    
    players.push({
      player: SAMPLE_PLAYERS[playerIndex],
      status: 'Injured',
      timeline: timelines[timelineIndex],
      reason: reasons[reasonIndex]
    });
  }
  
  return players;
}

// NHL Team data
export const NHL_TEAMS: Team[] = [
  { abbreviation: 'ANA', name: 'Ducks', city: 'Anaheim' },
  { abbreviation: 'ARI', name: 'Coyotes', city: 'Arizona' },
  { abbreviation: 'BOS', name: 'Bruins', city: 'Boston' },
  { abbreviation: 'BUF', name: 'Sabres', city: 'Buffalo' },
  { abbreviation: 'CGY', name: 'Flames', city: 'Calgary' },
  { abbreviation: 'CAR', name: 'Hurricanes', city: 'Carolina' },
  { abbreviation: 'CHI', name: 'Blackhawks', city: 'Chicago' },
  { abbreviation: 'COL', name: 'Avalanche', city: 'Colorado' },
  { abbreviation: 'CBJ', name: 'Blue Jackets', city: 'Columbus' },
  { abbreviation: 'DAL', name: 'Stars', city: 'Dallas' },
  { abbreviation: 'DET', name: 'Red Wings', city: 'Detroit' },
  { abbreviation: 'EDM', name: 'Oilers', city: 'Edmonton' },
  { abbreviation: 'FLA', name: 'Panthers', city: 'Florida' },
  { abbreviation: 'LAK', name: 'Kings', city: 'Los Angeles' },
  { abbreviation: 'MIN', name: 'Wild', city: 'Minnesota' },
  { abbreviation: 'MTL', name: 'Canadiens', city: 'Montreal' },
  { abbreviation: 'NSH', name: 'Predators', city: 'Nashville' },
  { abbreviation: 'NJD', name: 'Devils', city: 'New Jersey' },
  { abbreviation: 'NYI', name: 'Islanders', city: 'NY Islanders' },
  { abbreviation: 'NYR', name: 'Rangers', city: 'NY Rangers' },
  { abbreviation: 'OTT', name: 'Senators', city: 'Ottawa' },
  { abbreviation: 'PHI', name: 'Flyers', city: 'Philadelphia' },
  { abbreviation: 'PIT', name: 'Penguins', city: 'Pittsburgh' },
  { abbreviation: 'SJS', name: 'Sharks', city: 'San Jose' },
  { abbreviation: 'SEA', name: 'Kraken', city: 'Seattle' },
  { abbreviation: 'STL', name: 'Blues', city: 'St. Louis' },
  { abbreviation: 'TBL', name: 'Lightning', city: 'Tampa Bay' },
  { abbreviation: 'TOR', name: 'Maple Leafs', city: 'Toronto' },
  { abbreviation: 'UTA', name: 'Utah', city: 'Utah' },
  { abbreviation: 'VAN', name: 'Canucks', city: 'Vancouver' },
  { abbreviation: 'VEG', name: 'Golden Knights', city: 'Vegas' },
  { abbreviation: 'WSH', name: 'Capitals', city: 'Washington' },
  { abbreviation: 'WPG', name: 'Jets', city: 'Winnipeg' },
];

// Generate mock upcoming games (next 48 hours) for 2026 season
export function generateUpcomingGames(): Game[] {
  const now = new Date();
  const games: Game[] = [];
  
  // Ensure we're generating games in 2026 (current season)
  // NHL 2025-26 season runs from Oct 2025 to April 2026
  const seasonStart = new Date('2025-10-01');
  const seasonEnd = new Date('2026-04-30');
  
  // Start from today or season start, whichever is later
  const startDate = now > seasonStart ? now : seasonStart;
  
  // Generate unique matchups to avoid duplicates
  const matchups = [
    ['TOR', 'BOS'], ['EDM', 'VAN'], ['COL', 'DAL'],
    ['NYR', 'NYI'], ['TBL', 'FLA'], ['VEG', 'LAK'],
    ['CHI', 'DET'], ['PIT', 'PHI'], ['CAR', 'WSH'],
    ['NSH', 'STL'], ['MIN', 'WPG'], ['SEA', 'VAN'],
    ['BOS', 'MTL'], ['EDM', 'CGY'], ['COL', 'MIN'],
    ['NYR', 'NJD'], ['TBL', 'TOR'], ['VEG', 'SJS'],
  ];
  
  // Track used dates to avoid duplicates on same day
  const usedDates = new Set<string>();
  let gameIndex = 0;
  
  // Generate games over next 48 hours
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    const gameDate = new Date(startDate);
    gameDate.setDate(gameDate.getDate() + dayOffset);
    gameDate.setHours(0, 0, 0, 0);
    
    // Skip if past season end
    if (gameDate > seasonEnd) break;
    
    // Generate 3-6 games per day
    const gamesPerDay = dayOffset === 0 ? 6 : 4; // More games today/tomorrow
    
    for (let i = 0; i < gamesPerDay && gameIndex < matchups.length; i++) {
      const [awayTeam, homeTeam] = matchups[gameIndex % matchups.length];
      gameIndex++;
      
      // Create unique game time (7pm, 8pm, 9pm, 10pm)
      const gameTime = new Date(gameDate);
      gameTime.setHours(19 + (i % 4), 0, 0, 0);
      
      // Create unique ID based on date and teams
      const dateKey = gameTime.toISOString().split('T')[0];
      const gameId = `${dateKey}-${awayTeam}-${homeTeam}`;
      
      // Skip if we already have a game with these teams on this date
      if (usedDates.has(`${dateKey}-${awayTeam}-${homeTeam}`) || 
          usedDates.has(`${dateKey}-${homeTeam}-${awayTeam}`)) {
        continue;
      }
      
      usedDates.add(`${dateKey}-${awayTeam}-${homeTeam}`);
      
      // Only add if game is in the future
      if (gameTime <= now) continue;
      
      // Use deterministic probability based on team matchup to avoid hydration issues
      // Create a simple hash from team names for consistent "random" values
      const teamHash = (homeTeam.charCodeAt(0) + awayTeam.charCodeAt(0) + gameIndex) % 100;
      const baseProb = 45 + (teamHash / 10); // Deterministic probability between 45-55%
      
      // Deterministic values based on hash
      // B2B: true if hash % 10 is 8 or 9 (20% chance)
      const isHomeB2B = (teamHash % 10) > 7;
      const isAwayB2B = ((teamHash * 2) % 10) > 7;
      
      // Injuries: 0, 1, or 2 players (33% chance each)
      const homeInj = (teamHash % 3);
      const awayInj = ((teamHash * 7) % 3); // Use different multiplier to get varied results
      
      games.push({
        id: gameId,
        homeTeam,
        awayTeam,
        date: dateKey,
        time: gameTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }),
        homeGoalie: 'starter',
        awayGoalie: 'starter',
        isHomeBackToBack: isHomeB2B,
        isAwayBackToBack: isAwayB2B,
        homeRestDays: 'fresh',
        awayRestDays: 'fresh',
        homeInjuries: homeInj,
        awayInjuries: awayInj,
        // Don't include injured players in mock data - only show injury counts
        // This prevents showing wrong players when API fails
        homeInjuredPlayers: undefined,
        awayInjuredPlayers: undefined,
        baseWinProb: Math.round(baseProb),
        currentWinProb: Math.round(baseProb),
      });
    }
  }
  
  // Filter to only games in next 48 hours and sort
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  return games
    .filter(game => {
      const gameDateTime = new Date(`${game.date}T${game.time}`);
      return gameDateTime > now && gameDateTime <= in48Hours;
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
}

// Generate mock games for the entire 2025-26 season (for search)
export function generateSeasonGames(): Game[] {
  const games: Game[] = [];
  const startDate = new Date('2025-10-01');
  const endDate = new Date('2026-04-30');
  const now = new Date();
  
  // Track used matchups per date to avoid duplicates
  const usedMatchups = new Map<string, Set<string>>();
  
  // Generate games for each day, but only future games
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    
    // Skip past dates - only generate future games
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    if (dayStart < now) continue;
    
    // Calculate date hash for this day (before any continue statements)
    const dateHash = dateKey.split('-').reduce((sum, num) => sum + parseInt(num), 0);
    
    // Skip some days deterministically (not every day has games)
    if (dateHash % 10 < 3) continue; // ~30% of days have no games
    
    usedMatchups.set(dateKey, new Set());
    
    const numGames = (dateHash % 8) + 4; // 4-12 games per day
    
    for (let i = 0; i < numGames; i++) {
      // Use deterministic selection based on date and game index
      const awayIdx = (dateHash + i * 7) % NHL_TEAMS.length;
      let homeIdx = (dateHash + i * 11) % NHL_TEAMS.length;
      let attempts = 0;
      while (homeIdx === awayIdx && attempts < 10) {
        homeIdx = (homeIdx + 1) % NHL_TEAMS.length;
        attempts++;
      }
      
      const awayTeam = NHL_TEAMS[awayIdx].abbreviation;
      const homeTeam = NHL_TEAMS[homeIdx].abbreviation;
      
      // Check for duplicate matchup on same date
      const matchupKey1 = `${awayTeam}-${homeTeam}`;
      const matchupKey2 = `${homeTeam}-${awayTeam}`;
      const used = usedMatchups.get(dateKey)!;
      
      if (used.has(matchupKey1) || used.has(matchupKey2)) {
        continue; // Skip duplicate
      }
      
      used.add(matchupKey1);
      
      // Use deterministic values based on team names and date to avoid hydration issues
      // Note: dateHash is already defined in the outer loop scope
      const teamHash = (homeTeam.charCodeAt(0) + awayTeam.charCodeAt(0) + i) % 100;
      const combinedHash = (teamHash + dateHash) % 100;
      
      const baseProb = 40 + (combinedHash / 5); // Deterministic probability 40-60%
      const gameTime = `${19 + (i % 4)}:00`; // 7pm, 8pm, 9pm, 10pm
      
      // Deterministic selections
      const homeGoalie = combinedHash % 10 > 8 ? 'backup' : 'starter';
      const awayGoalie = (combinedHash * 2) % 10 > 8 ? 'backup' : 'starter';
      const isHomeB2B = (combinedHash % 10) > 7;
      const isAwayB2B = ((combinedHash * 2) % 10) > 7;
      const restOptions: any[] = ['fresh', 'back-to-back', 'three-in-four'];
      const homeRest = restOptions[combinedHash % 3];
      const awayRest = restOptions[(combinedHash * 2) % 3];
      const homeInj = combinedHash % 3;
      const awayInj = (combinedHash * 7) % 3; // Use different multiplier to get varied results
      
      games.push({
        id: `game-${dateKey}-${awayTeam}-${homeTeam}-${i}`,
        homeTeam,
        awayTeam,
        date: dateKey,
        time: gameTime,
        homeGoalie,
        awayGoalie,
        isHomeBackToBack: isHomeB2B,
        isAwayBackToBack: isAwayB2B,
        homeRestDays: homeRest,
        awayRestDays: awayRest,
        homeInjuries: homeInj,
        awayInjuries: awayInj,
        // Don't include injured players in mock data - only show injury counts
        // This prevents showing wrong players when API fails
        homeInjuredPlayers: undefined,
        awayInjuredPlayers: undefined,
        baseWinProb: Math.round(baseProb),
        currentWinProb: Math.round(baseProb),
      });
    }
  }
  
  // Sort by date
  return games.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  });
}
