/**
 * Pre-compute predictions for all future games
 * Run this before deploying to Vercel
 * 
 * Usage: node scripts/generate-predictions.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔮 Generating predictions for future games...\n');

// Load games data
const gamesDataPath = path.join(__dirname, '..', 'nhl_games_2021_2026.json');
if (!fs.existsSync(gamesDataPath)) {
  console.error('❌ Game data file not found:', gamesDataPath);
  process.exit(1);
}

const allGames = JSON.parse(fs.readFileSync(gamesDataPath, 'utf-8'));
console.log(`📊 Loaded ${allGames.length} total games`);

// Filter to future games (no result = not played yet).
// Dates are Eastern calendar days; compare as strings against today's Eastern
// date so tonight's games are included regardless of the machine's timezone.
const todayEastern = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date()); // 'YYYY-MM-DD'
const futureGames = allGames.filter(g => {
  if (!g.date || g.result) return false; // Skip games with results (already played)
  return g.date >= todayEastern;
});

console.log(`📅 Found ${futureGames.length} future games\n`);

if (futureGames.length === 0) {
  console.log('⚠️  No future games to predict');
  process.exit(0);
}

// Convert to format expected by predict_batch.py
// Group by unique game (avoid duplicates from home/away perspective)
const gameMap = new Map();

futureGames.forEach(g => {
  if (!g.date || !g.opponent) return;
  
  // Determine home/away
  const isHome = !g.game_location || g.game_location !== '@';
  const homeTeam = isHome ? g.team : g.opponent;
  const awayTeam = isHome ? g.opponent : g.team;
  
  const gameKey = `${g.date}-${awayTeam}-${homeTeam}`;
  
  if (!gameMap.has(gameKey)) {
    gameMap.set(gameKey, {
      id: `game-${g.date}-${awayTeam}-${homeTeam}`,
      homeTeam,
      awayTeam
    });
  }
});

const gamesForPrediction = Array.from(gameMap.values());
console.log(`🎯 Generating predictions for ${gamesForPrediction.length} unique games...\n`);

// Check if Python script exists
const pythonScript = path.join(__dirname, '..', 'predict_batch.py');
if (!fs.existsSync(pythonScript)) {
  console.error('❌ predict_batch.py not found:', pythonScript);
  process.exit(1);
}

// Check if models exist
const modelsDir = path.join(__dirname, '..', 'models');
if (!fs.existsSync(modelsDir)) {
  console.error('❌ Models directory not found:', modelsDir);
  process.exit(1);
}

try {
  // Generate predictions
  const inputJson = JSON.stringify(gamesForPrediction);
  console.log('🔄 Running batch predictions...\n');
  
  const pythonBin = process.env.PYTHON_BIN || 'python3';
  const result = execSync(
    `"${pythonBin}" "${pythonScript}"`,
    {
      input: inputJson,
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      timeout: 600000, // 10 minutes: rolling/opponent features are recomputed over the whole dataset
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    }
  );
  
  // Parse results
  let predictions;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      predictions = JSON.parse(jsonMatch[0]);
    } else {
      predictions = JSON.parse(result.trim());
    }
  } catch (e) {
    console.error('❌ Failed to parse predictions:', e.message);
    console.error('Raw output:', result.substring(0, 500));
    process.exit(1);
  }
  
  console.log(`✅ Generated ${Object.keys(predictions).length} predictions\n`);
  
  // Count successful predictions
  const successful = Object.values(predictions).filter(p => p.success).length;
  const failed = Object.keys(predictions).length - successful;
  
  console.log(`   ✅ Successful: ${successful}`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`);
  }
  
  // Show sample predictions
  console.log('\n📋 Sample predictions:');
  Object.entries(predictions).slice(0, 5).forEach(([id, pred]) => {
    if (pred.success) {
      const game = gamesForPrediction.find(g => g.id === id);
      if (game) {
        console.log(`   ${game.awayTeam} @ ${game.homeTeam}: ${pred.win_probability}%`);
      }
    }
  });
  
  // Save to frontend/data directory
  const outputPath = path.join(__dirname, '..', 'frontend', 'data', 'predictions.json');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(predictions, null, 2));
  console.log(`\n💾 Saved predictions to: ${outputPath}`);
  console.log(`\n✅ Done! Predictions are ready for deployment.\n`);
  
} catch (error) {
  console.error('❌ Error generating predictions:', error.message);
  if (error.stdout) console.error('stdout:', error.stdout.substring(0, 500));
  if (error.stderr) console.error('stderr', error.stderr.substring(0, 500));
  process.exit(1);
}
