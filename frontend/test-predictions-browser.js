/**
 * Browser Console Test Script
 * 
 * Paste this into your browser console (F12) to test if predictions are being rendered
 * 
 * Usage:
 *   1. Open your app in the browser
 *   2. Press F12 to open DevTools
 *   3. Go to Console tab
 *   4. Paste this entire script and press Enter
 */

(function testPredictionsInBrowser() {
  console.log('%c🧪 XGBoost Prediction Test', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
  console.log('='.repeat(60));
  
  // Test 1: Check if API data is available
  console.log('\n%c[TEST 1] Checking API Response', 'font-weight: bold; color: #10b981;');
  
  async function testAPI() {
    try {
      const response = await fetch('/api/games?upcoming=true');
      if (!response.ok) {
        console.error(`❌ API returned ${response.status}: ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      console.log(`✅ API returned ${data.games?.length || 0} games`);
      
      if (!data.games || data.games.length === 0) {
        console.warn('⚠️  No games returned from API');
        return null;
      }
      
      return data.games;
    } catch (error) {
      console.error('❌ API test failed:', error);
      return null;
    }
  }
  
  // Test 2: Check predictions in games
  function testPredictions(games) {
    console.log('\n%c[TEST 2] Checking Predictions', 'font-weight: bold; color: #10b981;');
    
    if (!games) {
      console.error('❌ Cannot test predictions - no games data');
      return;
    }
    
    const gamesWithPredictions = games.filter(g => 
      g.baseWinProb !== 50 && g.baseWinProb !== undefined && g.baseWinProb !== null
    );
    
    const gamesWithDefault = games.filter(g => 
      g.baseWinProb === 50 || g.baseWinProb === undefined || g.baseWinProb === null
    );
    
    console.log(`📊 Total games: ${games.length}`);
    console.log(`✅ Games with ML predictions (not 50%): ${gamesWithPredictions.length}`);
    console.log(`⚠️  Games with default 50%: ${gamesWithDefault.length}`);
    
    if (gamesWithPredictions.length === 0) {
      console.error('%c❌ CRITICAL: No games have ML predictions!', 'color: red; font-weight: bold;');
      console.error('   This means the XGBoost model is not being used.');
      console.error('   Check server logs for batch prediction errors.');
    } else {
      console.log(`%c✅ SUCCESS: ${gamesWithPredictions.length} games have ML predictions!`, 'color: green; font-weight: bold;');
    }
    
    // Show sample predictions
    console.log('\n%c[Sample Predictions]', 'font-weight: bold; color: #3b82f6;');
    games.slice(0, 5).forEach(game => {
      const hasPrediction = game.baseWinProb !== 50 && game.baseWinProb !== undefined;
      const icon = hasPrediction ? '✅' : '❌';
      const color = hasPrediction ? 'color: green;' : 'color: red;';
      console.log(
        `  ${icon} %c${game.awayTeam} @ ${game.homeTeam}: ${game.baseWinProb}%`,
        color,
        `(current: ${game.currentWinProb}%)`
      );
    });
    
    return {
      total: games.length,
      withPredictions: gamesWithPredictions.length,
      withDefault: gamesWithDefault.length,
      sample: games.slice(0, 5).map(g => ({
        teams: `${g.awayTeam} @ ${g.homeTeam}`,
        baseWinProb: g.baseWinProb,
        currentWinProb: g.currentWinProb,
        hasPrediction: g.baseWinProb !== 50
      }))
    };
  }
  
  // Test 3: Check DOM rendering
  function testDOMRendering() {
    console.log('\n%c[TEST 3] Checking DOM Rendering', 'font-weight: bold; color: #10b981;');
    
    // Look for game cards
    const gameCards = document.querySelectorAll('[class*="GameCard"], [class*="game-card"]');
    console.log(`📋 Found ${gameCards.length} potential game card elements`);
    
    // Look for probability displays
    const probElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent || '';
      return /Win Probability|winProb|baseWinProb/i.test(text) || 
             (/\d+%/.test(text) && text.includes('%'));
    });
    
    console.log(`📊 Found ${probElements.length} elements with probability text`);
    
    // Try to find specific probability values
    const probValues = [];
    probElements.forEach(el => {
      const text = el.textContent || '';
      const match = text.match(/(\d+)%/);
      if (match) {
        const prob = parseInt(match[1]);
        if (prob >= 0 && prob <= 100 && prob !== 50) {
          probValues.push(prob);
        }
      }
    });
    
    if (probValues.length > 0) {
      console.log(`✅ Found ${probValues.length} non-default probability values in DOM:`, probValues);
    } else {
      console.warn('⚠️  No non-default probabilities found in DOM (may be normal if all games are 50%)');
    }
    
    return {
      gameCards: gameCards.length,
      probElements: probElements.length,
      probValues: probValues
    };
  }
  
  // Test 4: Check React component state (if React DevTools available)
  function testReactState() {
    console.log('\n%c[TEST 4] Checking React State', 'font-weight: bold; color: #10b981;');
    
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('✅ React DevTools detected');
      console.log('   Tip: Use React DevTools to inspect component props and state');
    } else {
      console.log('ℹ️  React DevTools not detected (install React DevTools extension)');
    }
    
    // Try to find React root
    const reactRoots = document.querySelectorAll('[data-reactroot], #__next, #root');
    if (reactRoots.length > 0) {
      console.log(`✅ Found ${reactRoots.length} React root element(s)`);
    }
  }
  
  // Run all tests
  (async () => {
    const games = await testAPI();
    const predictionResults = testPredictions(games);
    const domResults = testDOMRendering();
    testReactState();
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('%c📊 TEST SUMMARY', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
    console.log('='.repeat(60));
    
    if (predictionResults) {
      if (predictionResults.withPredictions > 0) {
        console.log('%c✅ PREDICTIONS ARE WORKING!', 'color: green; font-weight: bold; font-size: 14px;');
        console.log(`   ${predictionResults.withPredictions} of ${predictionResults.total} games have ML predictions`);
      } else {
        console.log('%c❌ PREDICTIONS NOT WORKING', 'color: red; font-weight: bold; font-size: 14px;');
        console.log('   All games show default 50% probability');
        console.log('   Check server logs for batch prediction errors');
      }
    }
    
    console.log('\n💡 Tips:');
    console.log('   - Check Network tab to see API requests');
    console.log('   - Check Console for [API Client] and [API] logs');
    console.log('   - Look for games with probabilities ≠ 50%');
    console.log('   - Verify probabilities update when adjusting simulator controls');
  })();
})();
