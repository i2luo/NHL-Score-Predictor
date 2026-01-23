import { NextResponse } from 'next/server';
import { GET as getGames } from '../games/route';

/**
 * Simple endpoint to check if XGBoost predictions are working
 * 
 * Usage: https://your-vercel-app.vercel.app/api/predictions-check
 * 
 * Returns:
 * - Total games
 * - Games with ML predictions (not 50%)
 * - Games with default 50%
 * - Sample games with their probabilities
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    // Create a mock request to call the games API handler
    const mockRequest = new Request('http://localhost/api/games?upcoming=true');
    const gamesResponse = await getGames(mockRequest);
    
    if (!gamesResponse.ok) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch games',
          status: gamesResponse.status,
          statusText: gamesResponse.statusText
        },
        { status: 500 }
      );
    }
    
    const data = await gamesResponse.json();
    const games = data.games || [];
    
    // Analyze predictions
    const gamesWithPredictions = games.filter((g: any) => 
      g.baseWinProb !== 50 && g.baseWinProb !== undefined && g.baseWinProb !== null
    );
    
    const gamesWithDefault = games.filter((g: any) => 
      g.baseWinProb === 50 || g.baseWinProb === undefined || g.baseWinProb === null
    );
    
    // Get sample games
    const sampleGames = games.slice(0, 10).map((g: any) => ({
      id: g.id,
      teams: `${g.awayTeam} @ ${g.homeTeam}`,
      date: g.date,
      baseWinProb: g.baseWinProb,
      currentWinProb: g.currentWinProb,
      hasMLPrediction: g.baseWinProb !== 50 && g.baseWinProb !== undefined
    }));
    
    // Determine status
    const isWorking = gamesWithPredictions.length > 0;
    const status = isWorking ? 'WORKING' : 'NOT_WORKING';
    
    return NextResponse.json({
      status,
      isWorking,
      summary: {
        totalGames: games.length,
        gamesWithMLPredictions: gamesWithPredictions.length,
        gamesWithDefault50: gamesWithDefault.length,
        predictionRate: games.length > 0 
          ? ((gamesWithPredictions.length / games.length) * 100).toFixed(1) + '%'
          : '0%'
      },
      sampleGames,
      message: isWorking
        ? `✅ XGBoost predictions are working! ${gamesWithPredictions.length} of ${games.length} games have ML predictions.`
        : `❌ XGBoost predictions are NOT working. All ${games.length} games show default 50% probability.`,
      troubleshooting: !isWorking ? {
        checkVercelLogs: 'Check Vercel function logs for Python script errors',
        checkPythonFiles: 'Verify predict_batch.py exists in frontend/python/',
        checkModelFiles: 'Verify model files exist in frontend/models/',
        checkPythonRuntime: 'Vercel may need Python runtime configured'
      } : null
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to check predictions',
        message: error.message,
        status: 'ERROR'
      },
      { status: 500 }
    );
  }
}
