/**
 * Test script to verify XGBoost predictions are flowing from backend to frontend
 * 
 * Usage:
 *   node test_predictions_flow.js [--api] [--frontend] [--all]
 * 
 * Options:
 *   --api: Test API route directly
 *   --frontend: Test frontend rendering (requires dev server running)
 *   --all: Run all tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check Node version for fetch support
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion < 18) {
  console.warn('⚠️  Warning: Node.js 18+ is recommended for fetch support');
  console.warn('   For older versions, API tests will be skipped');
}

// Use native fetch if available (Node 18+)
const fetch = typeof globalThis.fetch === 'function' 
  ? globalThis.fetch 
  : null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name) {
  log(`\n▶ Testing: ${name}`, 'blue');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Test 1: Verify Python batch prediction script works
async function testPythonBatchPrediction() {
  logSection('TEST 1: Python Batch Prediction Script');
  
  try {
    const testGames = [
      { id: 'test-1', homeTeam: 'NYR', awayTeam: 'PIT' },
      { id: 'test-2', homeTeam: 'TOR', awayTeam: 'BOS' },
    ];
    
    const pythonScript = path.join(__dirname, 'predict_batch.py');
    
    if (!fs.existsSync(pythonScript)) {
      logError('predict_batch.py not found');
      return false;
    }
    
    logTest('Running Python batch prediction script');
    const inputJson = JSON.stringify(testGames);
    
    const result = execSync(
      `python3 "${pythonScript}"`,
      {
        input: inputJson,
        encoding: 'utf-8',
        timeout: 30000,
        cwd: __dirname,
        maxBuffer: 1024 * 1024 * 10
      }
    );
    
    logSuccess('Python script executed successfully');
    log(`Output length: ${result.length} characters`);
    
    // Try to parse JSON
    let predictions;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        predictions = JSON.parse(result.trim());
      }
    } catch (e) {
      logError(`Failed to parse JSON: ${e.message}`);
      log(`Raw output: ${result.substring(0, 500)}`);
      return false;
    }
    
    logSuccess(`Parsed ${Object.keys(predictions).length} predictions`);
    
    // Verify predictions
    let allValid = true;
    for (const game of testGames) {
      const prediction = predictions[game.id];
      if (!prediction) {
        logError(`No prediction for game ${game.id} (${game.awayTeam} @ ${game.homeTeam})`);
        allValid = false;
        continue;
      }
      
      if (prediction.success && typeof prediction.win_probability === 'number') {
        const prob = prediction.win_probability;
        if (prob >= 0 && prob <= 100 && prob !== 50) {
          logSuccess(`${game.awayTeam} @ ${game.homeTeam}: ${prob}% (non-default prediction)`);
        } else if (prob === 50) {
          logWarning(`${game.awayTeam} @ ${game.homeTeam}: ${prob}% (default value - may indicate model not working)`);
        } else {
          logError(`${game.awayTeam} @ ${game.homeTeam}: ${prob}% (invalid probability)`);
          allValid = false;
        }
      } else {
        logError(`${game.awayTeam} @ ${game.homeTeam}: Prediction failed - ${prediction.error || 'unknown error'}`);
        allValid = false;
      }
    }
    
    return allValid;
  } catch (error) {
    logError(`Python batch prediction test failed: ${error.message}`);
    if (error.stdout) log(`stdout: ${error.stdout.substring(0, 500)}`);
    if (error.stderr) log(`stderr: ${error.stderr.substring(0, 500)}`);
    return false;
  }
}

// Test 2: Test API route directly
async function testAPIRoute() {
  logSection('TEST 2: API Route (/api/games)');
  
  if (!fetch) {
    logWarning('fetch not available (Node.js 18+ required)');
    logWarning('Skipping API route test');
    logWarning('You can test manually: curl http://localhost:3000/api/games?upcoming=true');
    return false;
  }
  
  try {
    logTest('Checking if Next.js dev server is running');
    
    // Check if dev server is running
    let serverRunning = false;
    try {
      const response = await fetch('http://localhost:3000/api/games?upcoming=true&debug=true');
      serverRunning = true;
      logSuccess('Dev server is already running');
    } catch (e) {
      logWarning('Dev server not running. Please start it with: cd frontend && npm run dev');
      logWarning('Skipping API route test');
      return false;
    }
    
    logTest('Fetching games from API route');
    const response = await fetch('http://localhost:3000/api/games?upcoming=true&debug=true');
    
    if (!response.ok) {
      logError(`API returned ${response.status}: ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    logSuccess(`API returned ${data.games?.length || 0} games`);
    
    if (!data.games || data.games.length === 0) {
      logWarning('No games returned - this might be expected if no upcoming games');
      if (data.debug) {
        log('Debug info:', JSON.stringify(data.debug, null, 2));
      }
      return false;
    }
    
    // Check predictions
    const gamesWithPredictions = data.games.filter(g => 
      g.baseWinProb !== 50 && g.baseWinProb !== undefined
    );
    
    log(`Games with ML predictions (not 50%): ${gamesWithPredictions.length} of ${data.games.length}`);
    
    if (gamesWithPredictions.length === 0) {
      logError('⚠️ CRITICAL: No games have ML predictions! All showing default 50%');
      logError('This means batch predictions did not run or failed');
      return false;
    }
    
    // Show sample games
    logTest('Sample games with predictions:');
    data.games.slice(0, 5).forEach(game => {
      const hasPrediction = game.baseWinProb !== 50;
      const status = hasPrediction ? '✓' : '✗';
      const color = hasPrediction ? 'green' : 'red';
      log(
        `  ${status} ${game.awayTeam} @ ${game.homeTeam}: baseWinProb=${game.baseWinProb}%, currentWinProb=${game.currentWinProb}%`,
        color
      );
    });
    
    return gamesWithPredictions.length > 0;
  } catch (error) {
    logError(`API route test failed: ${error.message}`);
    return false;
  }
}

// Test 3: Test frontend rendering
async function testFrontendRendering() {
  logSection('TEST 3: Frontend Rendering');
  
  if (!fetch) {
    logWarning('fetch not available (Node.js 18+ required)');
    logWarning('Skipping automated frontend test');
  } else {
    try {
      logTest('Checking if frontend is accessible');
      
      const response = await fetch('http://localhost:3000');
      
      if (!response.ok) {
        logError(`Frontend returned ${response.status}: ${response.statusText}`);
        return false;
      }
      
      logSuccess('Frontend is accessible');
    } catch (error) {
      logError(`Frontend test failed: ${error.message}`);
      logWarning('Make sure dev server is running: cd frontend && npm run dev');
      return false;
    }
  }
  
  logWarning('Manual verification needed:');
  log('  1. Open http://localhost:3000 in your browser');
  log('  2. Open browser DevTools (F12)');
  log('  3. Go to Console tab');
  log('  4. Paste the contents of frontend/test-predictions-browser.js');
  log('  5. Look for games with win probabilities that are NOT 50%');
  log('  6. Verify probabilities are displayed in GameCard components');
  
  return true;
}

// Test 4: Verify model files exist
function testModelFiles() {
  logSection('TEST 4: Model Files');
  
  const modelDir = path.join(__dirname, 'models');
  const requiredFiles = [
    'goals_model_20260114_185123.pkl',
    'win_model_20260114_185123.pkl',
    'feature_names_20260114_185123.txt'
  ];
  
  let allExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(modelDir, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      logSuccess(`${file} exists (${(stats.size / 1024).toFixed(2)} KB)`);
    } else {
      logError(`${file} NOT FOUND at ${filePath}`);
      allExist = false;
    }
  }
  
  // Also check frontend/models
  const frontendModelDir = path.join(__dirname, 'frontend', 'models');
  logTest('Checking frontend/models directory (for Vercel deployment)');
  
  if (fs.existsSync(frontendModelDir)) {
    logSuccess('frontend/models directory exists');
    for (const file of requiredFiles) {
      const filePath = path.join(frontendModelDir, file);
      if (fs.existsSync(filePath)) {
        logSuccess(`  ${file} exists in frontend/models`);
      } else {
        logWarning(`  ${file} missing in frontend/models (may cause deployment issues)`);
      }
    }
  } else {
    logWarning('frontend/models directory does not exist (may cause deployment issues)');
  }
  
  return allExist;
}

// Test 5: Verify data files exist
function testDataFiles() {
  logSection('TEST 5: Data Files');
  
  const dataFiles = [
    'nhl_games_2021_2026.json',
    'nhl_injuries.json',
    'nhl_injuries_detailed.json'
  ];
  
  let allExist = true;
  
  for (const file of dataFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      logSuccess(`${file} exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      logError(`${file} NOT FOUND`);
      allExist = false;
    }
    
    // Also check frontend/data
    const frontendDataPath = path.join(__dirname, 'frontend', 'data', file);
    if (fs.existsSync(frontendDataPath)) {
      logSuccess(`  Also exists in frontend/data/`);
    } else {
      logWarning(`  Missing in frontend/data/ (may cause deployment issues)`);
    }
  }
  
  return allExist;
}

// Main test runner
async function runTests() {
  const args = process.argv.slice(2);
  const runAll = args.includes('--all') || args.length === 0;
  const runAPI = args.includes('--api') || runAll;
  const runFrontend = args.includes('--frontend') || runAll;
  
  log('\n' + '='.repeat(60));
  log('XGBoost Prediction Flow Test Suite', 'cyan');
  log('='.repeat(60) + '\n');
  
  const results = {
    modelFiles: testModelFiles(),
    dataFiles: testDataFiles(),
    pythonScript: false,
    apiRoute: false,
    frontend: false,
  };
  
  if (runAll || args.includes('--python')) {
    results.pythonScript = await testPythonBatchPrediction();
  }
  
  if (runAPI) {
    results.apiRoute = await testAPIRoute();
  }
  
  if (runFrontend) {
    results.frontend = await testFrontendRendering();
  }
  
  // Summary
  logSection('TEST SUMMARY');
  
  const testNames = {
    modelFiles: 'Model Files',
    dataFiles: 'Data Files',
    pythonScript: 'Python Batch Prediction',
    apiRoute: 'API Route',
    frontend: 'Frontend Rendering',
  };
  
  let allPassed = true;
  for (const [key, name] of Object.entries(testNames)) {
    if (results[key] === undefined) {
      log(`⊘ ${name}: Not tested`, 'yellow');
    } else if (results[key]) {
      log(`✓ ${name}: PASSED`, 'green');
    } else {
      log(`✗ ${name}: FAILED`, 'red');
      allPassed = false;
    }
  }
  
  console.log('\n');
  if (allPassed) {
    log('🎉 All tests passed! Predictions are flowing correctly.', 'green');
  } else {
    log('⚠️  Some tests failed. Check the output above for details.', 'yellow');
    log('\nTroubleshooting tips:');
    log('  1. Ensure Python 3 is installed and accessible');
    log('  2. Install Python dependencies: pip install -r requirements.txt');
    log('  3. Ensure model files are in the models/ directory');
    log('  4. Start the dev server: cd frontend && npm run dev');
    log('  5. Check browser console for frontend logs');
  }
  
  console.log('\n');
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
