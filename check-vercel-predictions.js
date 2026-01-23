/**
 * Quick script to check if XGBoost predictions are working on Vercel
 * 
 * Usage:
 *   1. Open your deployed Vercel app
 *   2. Open browser console (F12)
 *   3. Paste this entire script and press Enter
 *   4. Replace 'YOUR_VERCEL_URL' with your actual Vercel URL
 * 
 * Or run directly:
 *   node check-vercel-predictions.js YOUR_VERCEL_URL
 */

const VERCEL_URL = process.argv[2] || 'YOUR_VERCEL_URL';

async function checkVercelPredictions() {
  console.log('🔍 Checking XGBoost predictions on Vercel...\n');
  
  if (VERCEL_URL === 'YOUR_VERCEL_URL') {
    console.log('❌ Please provide your Vercel URL');
    console.log('   Usage: node check-vercel-predictions.js https://your-app.vercel.app');
    console.log('   Or paste this script in browser console and set VERCEL_URL variable');
    return;
  }
  
  const apiUrl = `${VERCEL_URL.replace(/\/$/, '')}/api/games?upcoming=true`;
  console.log(`📡 Fetching: ${apiUrl}\n`);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`❌ API returned ${response.status}: ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    const games = data.games || [];
    
    console.log(`✅ API returned ${games.length} games\n`);
    
    if (games.length === 0) {
      console.log('⚠️  No games returned. This might be expected if there are no upcoming games.');
      return;
    }
    
    // Analyze predictions
    const gamesWithPredictions = games.filter(g => 
      g.baseWinProb !== 50 && g.baseWinProb !== undefined && g.baseWinProb !== null
    );
    
    const gamesWithDefault = games.filter(g => 
      g.baseWinProb === 50 || g.baseWinProb === undefined || g.baseWinProb === null
    );
    
    // Results
    console.log('='.repeat(60));
    console.log('📊 PREDICTION ANALYSIS');
    console.log('='.repeat(60));
    console.log(`Total games: ${games.length}`);
    console.log(`✅ Games with ML predictions (not 50%): ${gamesWithPredictions.length}`);
    console.log(`❌ Games with default 50%: ${gamesWithDefault.length}`);
    console.log(`📈 Prediction rate: ${((gamesWithPredictions.length / games.length) * 100).toFixed(1)}%`);
    console.log('');
    
    // Status
    if (gamesWithPredictions.length > 0) {
      console.log('✅ SUCCESS: XGBoost predictions ARE working!');
      console.log(`   ${gamesWithPredictions.length} of ${games.length} games have ML predictions.\n`);
    } else {
      console.log('❌ PROBLEM: XGBoost predictions are NOT working!');
      console.log('   All games show default 50% probability.\n');
      console.log('🔧 Troubleshooting:');
      console.log('   1. Check Vercel function logs for Python errors');
      console.log('   2. Verify predict_batch.py exists in frontend/python/');
      console.log('   3. Verify model files exist in frontend/models/');
      console.log('   4. Check if Python runtime is available on Vercel');
      console.log('   5. Look for "[API] ⚠️ CRITICAL: No predictions were applied!" in logs\n');
    }
    
    // Sample games
    console.log('='.repeat(60));
    console.log('📋 SAMPLE GAMES (first 10):');
    console.log('='.repeat(60));
    
    games.slice(0, 10).forEach((game, index) => {
      const hasPrediction = game.baseWinProb !== 50 && game.baseWinProb !== undefined;
      const icon = hasPrediction ? '✅' : '❌';
      const status = hasPrediction ? 'ML Prediction' : 'Default 50%';
      const color = hasPrediction ? '\x1b[32m' : '\x1b[31m';
      const reset = '\x1b[0m';
      
      console.log(
        `${icon} ${game.awayTeam} @ ${game.homeTeam}: ${color}${game.baseWinProb}%${reset} (${status})`
      );
    });
    
    console.log('');
    
    // Detailed breakdown
    if (gamesWithPredictions.length > 0) {
      console.log('='.repeat(60));
      console.log('✅ GAMES WITH ML PREDICTIONS:');
      console.log('='.repeat(60));
      gamesWithPredictions.slice(0, 5).forEach(game => {
        console.log(`   ${game.awayTeam} @ ${game.homeTeam}: ${game.baseWinProb}%`);
      });
      if (gamesWithPredictions.length > 5) {
        console.log(`   ... and ${gamesWithPredictions.length - 5} more`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking predictions:', error.message);
    if (error.message.includes('fetch')) {
      console.error('   Make sure your Vercel URL is correct and the app is deployed');
    }
  }
}

// Run if in Node.js
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch') || globalThis.fetch;
  checkVercelPredictions();
} else {
  // Browser environment - export function
  window.checkVercelPredictions = checkVercelPredictions;
  console.log('✅ Script loaded! Run: checkVercelPredictions()');
  console.log('   Or set VERCEL_URL variable first:');
  console.log('   const VERCEL_URL = "https://your-app.vercel.app";');
}
