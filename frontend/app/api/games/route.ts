import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Game, InjuredPlayer } from '@/types/game';

// Vercel-compatible path resolution helper
// Tries Vercel deployment paths first, falls back to local development paths
const getDataPath = (filename: string): string => {
  // Try Vercel path first (files copied during build to frontend/data/)
  const vercelPath = path.join(process.cwd(), 'data', filename);
  if (fs.existsSync(vercelPath)) {
    return vercelPath;
  }
  
  // Fallback to parent directory (local development)
  const localPath = path.join(process.cwd(), '..', filename);
  return localPath;
};

const getPythonPath = (filename: string): string => {
  // Try Vercel path first (files copied during build to frontend/python/)
  const vercelPath = path.join(process.cwd(), 'python', filename);
  if (fs.existsSync(vercelPath)) {
    return vercelPath;
  }
  
  // Fallback to parent directory (local development)
  const localPath = path.join(process.cwd(), '..', filename);
  return localPath;
};

// Mapping of team abbreviations to their starting goalies (2025-26 season)
// Format: last name only (case-insensitive matching)
const STARTING_GOALIES: Record<string, string[]> = {
  'ANA': ['gibson', 'dostal'],
  'ARI': ['vejmelka', 'ingersoll'],
  'BOS': ['swayman', 'ullmark'],
  'BUF': ['luukkonen', 'levi'],
  'CGY': ['markstrom', 'wolf'],
  'CAR': ['kotchetkov', 'andersen'],
  'CHI': ['mrazek', 'soderblom'],
  'COL': ['georgiev', 'annunen'],
  'CBJ': ['tarasov', 'merzlikins'],
  'DAL': ['ottinger', 'wedgewood'],
  'DET': ['lyon', 'husso'],
  'EDM': ['skinner', 'pickard'],
  'FLA': ['bobrovsky', 'stolarz'],
  'LAK': ['talbot', 'rittich'],
  'MIN': ['gustavsson', 'fleury'],
  'MTL': ['montembeault', 'primeau'],
  'NSH': ['saros', 'lankinen'],
  'NJD': ['allen', 'daws'],
  'NYI': ['sorokin', 'varlamov'],
  'NYR': ['shesterkin', 'quick'],
  'OTT': ['korpisalo', 'forsberg'],
  'PHI': ['eriksson', 'fedotov'],
  'PIT': ['jarry', 'nedeljkovic'],
  'SJS': ['blackwood', 'kahkonen'],
  'SEA': ['daccord', 'grubauer'],
  'STL': ['binnington', 'hofer'],
  'TBL': ['vasilevskiy', 'johansson'],
  'TOR': ['woll', 'samsonov'],
  'UTA': ['vejmelka', 'ingersoll'], // Same as ARI (relocated)
  'VAN': ['demko', 'silovs'], // Demko is the starter
  'VEG': ['hill', 'thompson'],
  'WSH': ['lindgren', 'kuemper'],
  'WPG': ['hellebuyck', 'comrie'],
};

// Helper function to check if a player name matches a goalie
function isGoalie(playerName: string, team: string): boolean {
  const goalies = STARTING_GOALIES[team] || [];
  const nameLower = playerName.toLowerCase();
  
  // Check if any goalie name appears in the player name
  return goalies.some(goalie => {
    const goalieLower = goalie.toLowerCase();
    // Match last name (e.g., "Demko" matches "Demko, Thatcher" or "Thatcher Demko")
    return nameLower.includes(goalieLower) || goalieLower.includes(nameLower.split(',')[0].trim().toLowerCase());
  });
}

// Helper function to check if starting goalie is injured
function isStartingGoalieInjured(injuredPlayers: InjuredPlayer[], team: string): boolean {
  if (!injuredPlayers || injuredPlayers.length === 0) return false;
  
  const goalies = STARTING_GOALIES[team] || [];
  if (goalies.length === 0) return false;
  
  // Check if the first goalie (starter) is injured
  const starterName = goalies[0].toLowerCase();
  return injuredPlayers.some(injured => {
    const playerName = injured.player.toLowerCase();
    // Match last name
    return playerName.includes(starterName) || starterName.includes(playerName.split(',')[0].trim().toLowerCase());
  });
}

// Helper function to check if a team played the previous day (B2B)
function isBackToBack(data: any[], team: string, gameDate: Date): boolean {
  const previousDay = new Date(gameDate);
  previousDay.setDate(previousDay.getDate() - 1);
  const prevDateStr = previousDay.toISOString().split('T')[0];
  
  // Check if team played on previous day
  return data.some((g: any) => 
    g.team === team && 
    g.date === prevDateStr && 
    g.result // Has a result means game was played
  );
}

// Helper function to calculate rest days status
function calculateRestDays(data: any[], team: string, gameDate: Date): 'fresh' | 'back-to-back' | 'three-in-four' | 'four-in-six' {
  const gameDateStr = gameDate.toISOString().split('T')[0];
  
  // Count games in last 6 days
  const sixDaysAgo = new Date(gameDate);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
  
  const recentGames = data.filter((g: any) => {
    if (g.team !== team || !g.result) return false; // Only played games
    const gDate = new Date(g.date);
    return gDate >= sixDaysAgo && gDate < gameDate;
  });
  
  const gameCount = recentGames.length;
  
  // Check for B2B
  if (isBackToBack(data, team, gameDate)) {
    return 'back-to-back';
  }
  
  // Check for 3 in 4 or 4 in 6
  if (gameCount >= 4) {
    return 'four-in-six';
  } else if (gameCount >= 3) {
    return 'three-in-four';
  }
  
  return 'fresh';
}

// Helper function to convert scraped game data to frontend Game format
function convertToGameFormat(
  data: any, 
  team: string, 
  injuryCounts: Record<string, number> = {},
  detailedInjuries: Record<string, InjuredPlayer[]> = {}
): Game[] {
  const games: Game[] = [];
  const now = new Date();
  
  data.forEach((game: any) => {
    // Only include games that match the team
    if (game.team !== team) return;
    
    // Skip games without date or opponent
    if (!game.date || !game.opponent) return;
    
    // Only include FUTURE games (games that haven't been played yet)
    // If game has a result (W/L/T), it's already been played
    if (game.result) {
      // Skip past games
      return;
    }
    
    // Also check if date is in the future
    const gameDate = new Date(game.date);
    // For future games, set time to start of day for comparison
    gameDate.setHours(0, 0, 0, 0);
    const nowDate = new Date(now);
    nowDate.setHours(0, 0, 0, 0);
    
    if (gameDate <= nowDate) {
      // Skip games in the past (but allow today's games)
      return;
    }
    
    // Determine if home or away
    const isHome = !game.game_location || game.game_location !== '@';
    const homeTeam = isHome ? team : game.opponent;
    const awayTeam = isHome ? game.opponent : team;
    
    // Calculate B2B status from schedule
    const homeB2B = isBackToBack(data, homeTeam, gameDate);
    const awayB2B = isBackToBack(data, awayTeam, gameDate);
    
    // Calculate rest days
    const homeRestDays = calculateRestDays(data, homeTeam, gameDate);
    const awayRestDays = calculateRestDays(data, awayTeam, gameDate);
    
    // Get injury counts and detailed injuries from scraped data
    const homeInjuries = injuryCounts[homeTeam] || 0;
    const awayInjuries = injuryCounts[awayTeam] || 0;
    const homeInjuredPlayers = detailedInjuries[homeTeam] || [];
    const awayInjuredPlayers = detailedInjuries[awayTeam] || [];
    
    // Debug logging for injury assignment
    if (homeInjuredPlayers.length > 0 || awayInjuredPlayers.length > 0) {
      console.log(`[API] Game ${awayTeam} @ ${homeTeam}: Home injuries: ${homeInjuredPlayers.length}, Away injuries: ${awayInjuredPlayers.length}`);
      if (homeInjuredPlayers.length > 0) {
        console.log(`[API]   Home players:`, homeInjuredPlayers.map(p => p.player));
      }
      if (awayInjuredPlayers.length > 0) {
        console.log(`[API]   Away players:`, awayInjuredPlayers.map(p => p.player));
      }
    }
    
    // Check if starting goalies are injured and adjust goalie selection
    let homeGoalie: 'starter' | 'backup' | 'third-string' = 'starter';
    let awayGoalie: 'starter' | 'backup' | 'third-string' = 'starter';
    
    if (isStartingGoalieInjured(homeInjuredPlayers, homeTeam)) {
      homeGoalie = 'backup';
    }
    if (isStartingGoalieInjured(awayInjuredPlayers, awayTeam)) {
      awayGoalie = 'backup';
    }
    
    // Predictions will be added after all games are collected (batch processing)
    // Default to 50% for now
    let baseProb = 50;
    
    // Default time to 7pm if not available
    const time = '19:00';
    
    games.push({
      id: `game-${game.date}-${awayTeam}-${homeTeam}`,
      homeTeam,
      awayTeam,
      date: game.date,
      time: time,
      homeGoalie,
      awayGoalie,
      isHomeBackToBack: homeB2B,
      isAwayBackToBack: awayB2B,
      homeRestDays: homeRestDays,
      awayRestDays: awayRestDays,
      homeInjuries: homeInjuries,
      awayInjuries: awayInjuries,
      homeInjuredPlayers: homeInjuredPlayers.length > 0 ? homeInjuredPlayers : (homeInjuries > 0 ? [] : undefined),
      awayInjuredPlayers: awayInjuredPlayers.length > 0 ? awayInjuredPlayers : (awayInjuries > 0 ? [] : undefined),
      baseWinProb: baseProb,
      currentWinProb: baseProb,
    });
  });
  
  return games;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    const upcoming = searchParams.get('upcoming') === 'true';
    const debug = searchParams.get('debug') === 'true';
    
    // Read the scraped data file (Vercel-compatible path)
    const dataPath = getDataPath('nhl_games_2021_2026.json');
    
    console.log('[API] Request received:', { team, upcoming, debug });
    console.log('[API] Looking for game data at:', dataPath);
    console.log('[API] File exists:', fs.existsSync(dataPath));
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json(
        { error: 'Game data file not found. Please run the scraper first.', path: dataPath },
        { status: 404 }
      );
    }
    
    const fileData = fs.readFileSync(dataPath, 'utf-8');
    const allGames = JSON.parse(fileData);
    console.log(`[API] Loaded ${allGames.length} games from file`);
    
    // Try to load injury data if available
    let injuryCounts: Record<string, number> = {};
    let detailedInjuries: Record<string, InjuredPlayer[]> = {};
    
    // Load injury counts (Vercel-compatible path)
    const injuryPath = getDataPath('nhl_injuries.json');
    if (fs.existsSync(injuryPath)) {
      try {
        const injuryData = fs.readFileSync(injuryPath, 'utf-8');
        injuryCounts = JSON.parse(injuryData);
        const totalInjuries = Object.values(injuryCounts).reduce((sum, count) => sum + count, 0);
        console.log(`Loaded injury data: ${totalInjuries} total injuries across ${Object.keys(injuryCounts).length} teams`);
      } catch (error) {
        console.warn('Could not load injury data:', error);
      }
    } else {
      console.warn('Injury data file not found. Run: python3 scrape_injuries.py --html-file injuries.html');
    }
    
    // Load detailed injury data (Vercel-compatible path)
    const detailedInjuryPath = getDataPath('nhl_injuries_detailed.json');
    console.log('[API] Looking for injury data at:', detailedInjuryPath);
    console.log('[API] File exists:', fs.existsSync(detailedInjuryPath));
    
    if (fs.existsSync(detailedInjuryPath)) {
      try {
        const detailedData = fs.readFileSync(detailedInjuryPath, 'utf-8');
        const injuries: any[] = JSON.parse(detailedData);
        
        console.log(`[API] Loaded ${injuries.length} total injuries from file`);
        
        // Group injuries by team and map to InjuredPlayer format
        injuries.forEach(injury => {
          const team = injury.team;
          if (team) {
            if (!detailedInjuries[team]) {
              detailedInjuries[team] = [];
            }
            // Map scraped data to InjuredPlayer format (strip extra fields)
            const injuredPlayer: InjuredPlayer = {
              player: injury.player || '',
              status: injury.status || '',
              timeline: injury.timeline || '',
              reason: injury.reason || ''
            };
            detailedInjuries[team].push(injuredPlayer);
          }
        });
        
        console.log(`[API] Loaded detailed injury data: ${injuries.length} injured players`);
        console.log(`[API] Injuries grouped by team:`, Object.keys(detailedInjuries).map(team => `${team}: ${detailedInjuries[team].length}`).join(', '));
        
        // Log specific teams for debugging
        if (detailedInjuries['NYR']) {
          console.log(`[API] NYR injuries:`, detailedInjuries['NYR'].map(i => i.player));
        }
        if (detailedInjuries['PIT']) {
          console.log(`[API] PIT injuries:`, detailedInjuries['PIT'].map(i => i.player));
        }
        if (detailedInjuries['PHI']) {
          console.log(`[API] PHI injuries:`, detailedInjuries['PHI'].map(i => i.player));
        }
      } catch (error) {
        console.error('[API] Could not load detailed injury data:', error);
      }
    } else {
      console.warn('[API] Detailed injury data file not found at:', detailedInjuryPath);
      console.warn('[API] Current working directory:', process.cwd());
    }
    
    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    
    // Filter and convert games
    let games: Game[] = [];
    
    console.log(`[API] Total scraped games: ${allGames.length}`);
    console.log(`[API] Sample game dates:`, allGames.slice(0, 5).map((g: any) => ({ date: g.date, result: g.result, team: g.team })));
    
    if (team) {
      // Get games for specific team
      games = convertToGameFormat(allGames, team, injuryCounts, detailedInjuries);
      console.log(`[API] Converted ${games.length} games for team ${team}`);
    } else {
      // Get all unique games (avoid duplicates from home/away perspective)
      const gameMap = new Map<string, Game>();
      
      // Get all teams
      const teams = new Set<string>();
      allGames.forEach((g: any) => teams.add(g.team));
      console.log(`[API] Processing ${teams.size} teams`);
      
      teams.forEach(t => {
        const teamGames = convertToGameFormat(allGames, t, injuryCounts, detailedInjuries);
        teamGames.forEach(game => {
          const key = `${game.date}-${game.awayTeam}-${game.homeTeam}`;
          if (!gameMap.has(key)) {
            gameMap.set(key, game);
          }
        });
      });
      
      games = Array.from(gameMap.values());
      console.log(`[API] Converted ${games.length} unique games from ${teams.size} teams`);
    }
    
    // Filter to upcoming games if requested
    if (upcoming) {
      const beforeFilter = games.length;
      games = games.filter(game => {
        const gameDateTime = new Date(`${game.date}T${game.time}`);
        const isFuture = gameDateTime > now;
        const isIn48Hours = gameDateTime <= in48Hours;
        return isFuture && isIn48Hours;
      });
      console.log(`[API] Filtered ${beforeFilter} games to ${games.length} upcoming games (next 48 hours)`);
    } else {
      // Only show future games
      const beforeFilter = games.length;
      games = games.filter(game => {
        const gameDateTime = new Date(`${game.date}T${game.time}`);
        return gameDateTime > now;
      });
      console.log(`[API] Filtered ${beforeFilter} games to ${games.length} future games`);
    }
    
    // Sort by date
    games.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Batch predict all games at once (much faster than individual calls)
    if (games.length > 0) {
      try {
        const batchPredictScript = getPythonPath('predict_batch.py');
        if (fs.existsSync(batchPredictScript)) {
          console.log(`[API] Running batch predictions for ${games.length} games...`);
          
          // Prepare games for batch prediction
          const gamesForPrediction = games.map(g => ({
            id: g.id,
            homeTeam: g.homeTeam,
            awayTeam: g.awayTeam
          }));
          
          const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
          const inputJson = JSON.stringify(gamesForPrediction);
          
          try {
            const result = execSync(
              `${pythonCmd} "${batchPredictScript}" 2>/dev/null`,
              {
                input: inputJson,
                encoding: 'utf-8',
                timeout: 30000, // 30 second timeout for batch (should be enough)
                cwd: process.cwd(), // Use current working directory (Vercel-compatible)
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
              }
            );
            
            // Parse batch predictions
            const predictions = JSON.parse(result.trim());
            
            // Apply predictions to games
            let predictionsApplied = 0;
            games.forEach(game => {
              const prediction = predictions[game.id];
              if (prediction && prediction.success && typeof prediction.win_probability === 'number') {
                const baseProb = Math.round(prediction.win_probability);
                game.baseWinProb = baseProb;
                game.currentWinProb = baseProb;
                predictionsApplied++;
              }
            });
            
            console.log(`[API] Applied predictions to ${predictionsApplied} of ${games.length} games`);
          } catch (error: any) {
            console.warn(`[API] Batch prediction failed:`, error.message?.substring(0, 100));
            console.warn(`[API] Games will use default 50% win probability`);
          }
        } else {
          console.warn(`[API] Batch prediction script not found, using default 50% probabilities`);
        }
      } catch (error: any) {
        console.warn(`[API] Prediction system error:`, error.message?.substring(0, 100));
      }
    }
    
    console.log(`[API] Returning ${games.length} games to frontend`);
    if (games.length > 0) {
      console.log(`[API] First game: ${games[0].awayTeam} @ ${games[0].homeTeam} on ${games[0].date}`);
      if (games[0].baseWinProb !== undefined && games[0].baseWinProb !== 50) {
        console.log(`[API] First game prediction: ${games[0].baseWinProb}%`);
      }
      const gamesWithInjuries = games.filter(g => 
        (g.homeInjuredPlayers && g.homeInjuredPlayers.length > 0) || 
        (g.awayInjuredPlayers && g.awayInjuredPlayers.length > 0)
      );
      console.log(`[API] Games with injury data: ${gamesWithInjuries.length}`);
    } else {
      console.warn(`[API] ⚠️  WARNING: Returning 0 games! This will cause frontend to use mock data.`);
      console.warn(`[API] Check server logs above to see why games were filtered out.`);
    }
    
    const response: any = { games };
    
    // Add debug info if requested
    if (debug) {
      response.debug = {
        totalScrapedGames: allGames.length,
        gamesAfterConversion: games.length,
        now: new Date().toISOString(),
        in48Hours: in48Hours.toISOString(),
        sampleScrapedGames: allGames.slice(0, 3).map((g: any) => ({
          date: g.date,
          result: g.result,
          team: g.team,
          opponent: g.opponent
        })),
        // Include injury data even if no games (so frontend can attach to mock games)
        injuryData: detailedInjuries
      };
    }
    
    // If no games but injury data exists, return injury data separately
    if (games.length === 0 && Object.keys(detailedInjuries).length > 0) {
      response.injuryData = detailedInjuries;
      console.log('[API] No games found, but returning injury data for frontend to use');
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error loading game data:', error);
    return NextResponse.json(
      { error: 'Failed to load game data', details: error.message },
      { status: 500 }
    );
  }
}
