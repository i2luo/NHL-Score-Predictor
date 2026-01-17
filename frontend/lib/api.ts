import { Game } from '@/types/game';

const API_BASE = '/api/games';

export async function fetchUpcomingGames(): Promise<Game[]> {
  try {
    const url = `${API_BASE}?upcoming=true`;
    console.log('[API] Fetching upcoming games from:', url);
    const response = await fetch(url);
    
    console.log('[API] Response status:', response.status, response.statusText);
    console.log('[API] Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Response error:', errorText);
      throw new Error(`Failed to fetch upcoming games: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('[API] Response data:', data);
    const games = data.games || [];
    console.log(`[API] Received ${games.length} games from API`);
    
    // Log win probabilities for first few games
    if (games.length > 0) {
      games.slice(0, 3).forEach((game: Game) => {
        console.log(`[API] Game ${game.awayTeam} @ ${game.homeTeam}:`, {
          baseWinProb: game.baseWinProb,
          currentWinProb: game.currentWinProb,
          homeInjuries: game.homeInjuries,
          homePlayers: game.homeInjuredPlayers?.map(p => p.player),
          awayInjuries: game.awayInjuries,
          awayPlayers: game.awayInjuredPlayers?.map(p => p.player)
        });
      });
    } else {
      console.warn('[API] No games returned from API');
    }
    
    return games;
  } catch (error) {
    console.error('[API] Error fetching upcoming games:', error);
    // Fallback to empty array or mock data if API fails
    return [];
  }
}

export async function fetchAllFutureGames(): Promise<Game[]> {
  try {
    console.log('[API] Fetching all future games from:', API_BASE);
    const response = await fetch(`${API_BASE}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const games = data.games || [];
    console.log(`[API] Received ${games.length} games from API`);
    
    // Log injury data for games with NYR
    const nyrGames = games.filter((g: Game) => g.homeTeam === 'NYR' || g.awayTeam === 'NYR').slice(0, 2);
    nyrGames.forEach((game: Game) => {
      console.log(`[API] NYR Game ${game.awayTeam} @ ${game.homeTeam}:`, {
        homeInjuries: game.homeInjuries,
        homePlayers: game.homeInjuredPlayers?.map(p => p.player),
        awayInjuries: game.awayInjuries,
        awayPlayers: game.awayInjuredPlayers?.map(p => p.player)
      });
    });
    
    return games;
  } catch (error) {
    console.error('[API] Error fetching games:', error);
    return [];
  }
}

export async function fetchGamesByTeam(team: string): Promise<Game[]> {
  try {
    const response = await fetch(`${API_BASE}?team=${team}`);
    if (!response.ok) {
      throw new Error('Failed to fetch team games');
    }
    const data = await response.json();
    return data.games || [];
  } catch (error) {
    console.error('Error fetching team games:', error);
    return [];
  }
}
