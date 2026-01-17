import { Game } from '@/types/game';

/**
 * Fetch upcoming games (next 48 hours) from the API
 */
export async function fetchUpcomingGames(): Promise<Game[]> {
  try {
    console.log('[API Client] Fetching upcoming games from /api/games?upcoming=true');
    const response = await fetch('/api/games?upcoming=true', {
      cache: 'no-store', // Always fetch fresh data
    });
    
    if (!response.ok) {
      console.error('[API Client] API response not OK:', response.status, response.statusText);
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[API Client] Received response:', {
      gamesCount: data.games?.length || 0,
      hasError: !!data.error,
    });
    
    if (data.error) {
      console.error('[API Client] API returned error:', data.error);
      throw new Error(data.error);
    }
    
    const games: Game[] = data.games || [];
    
    // Debug: Log win probabilities for first few games
    if (games.length > 0) {
      console.log('[API Client] Sample games with win probabilities:');
      games.slice(0, 3).forEach(game => {
        console.log(`  ${game.awayTeam} @ ${game.homeTeam}: baseWinProb=${game.baseWinProb}, currentWinProb=${game.currentWinProb}`);
      });
      
      // Check if any games have non-default probabilities
      const gamesWithPredictions = games.filter(g => g.baseWinProb !== 50 && g.baseWinProb !== undefined);
      console.log(`[API Client] Games with predictions (not 50%): ${gamesWithPredictions.length} of ${games.length}`);
      
      if (gamesWithPredictions.length === 0 && games.length > 0) {
        console.warn('[API Client] ⚠️ WARNING: All games have default 50% probability! Predictions may not be working.');
      }
    }
    
    return games;
  } catch (error) {
    console.error('[API Client] Error fetching upcoming games:', error);
    throw error;
  }
}

/**
 * Fetch all future games from the API
 */
export async function fetchAllFutureGames(): Promise<Game[]> {
  try {
    console.log('[API Client] Fetching all future games from /api/games');
    const response = await fetch('/api/games', {
      cache: 'no-store', // Always fetch fresh data
    });
    
    if (!response.ok) {
      console.error('[API Client] API response not OK:', response.status, response.statusText);
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[API Client] Received response:', {
      gamesCount: data.games?.length || 0,
      hasError: !!data.error,
    });
    
    if (data.error) {
      console.error('[API Client] API returned error:', data.error);
      throw new Error(data.error);
    }
    
    const games: Game[] = data.games || [];
    
    // Debug: Log win probabilities for first few games
    if (games.length > 0) {
      console.log('[API Client] Sample games with win probabilities:');
      games.slice(0, 3).forEach(game => {
        console.log(`  ${game.awayTeam} @ ${game.homeTeam}: baseWinProb=${game.baseWinProb}, currentWinProb=${game.currentWinProb}`);
      });
      
      // Check if any games have non-default probabilities
      const gamesWithPredictions = games.filter(g => g.baseWinProb !== 50 && g.baseWinProb !== undefined);
      console.log(`[API Client] Games with predictions (not 50%): ${gamesWithPredictions.length} of ${games.length}`);
      
      if (gamesWithPredictions.length === 0 && games.length > 0) {
        console.warn('[API Client] ⚠️ WARNING: All games have default 50% probability! Predictions may not be working.');
      }
    }
    
    return games;
  } catch (error) {
    console.error('[API Client] Error fetching all future games:', error);
    throw error;
  }
}
