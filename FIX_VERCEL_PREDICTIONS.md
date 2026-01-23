# Fixing Predictions on Vercel

## The Problem

**All games show 50% because Python is not available on Vercel's Node.js runtime.**

Vercel's Node.js serverless functions don't include Python, so when your API route tries to execute `predict_batch.py`, it fails silently and defaults to 50%.

## Quick Diagnostic

Check what's wrong:

```javascript
// In browser console on your Vercel app:
fetch('/api/predictions-debug').then(r => r.json()).then(console.log);
```

This will show you exactly what's missing.

## Solutions

### Option 1: Use Vercel Python Runtime (Best for Production)

Create a separate Python serverless function:

1. **Create `api/predict-python/index.py`:**

```python
from http.server import BaseHTTPRequestHandler
import json
import sys
from pathlib import Path

# Add python directory to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'python'))

from predict_batch import predict_batch

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            games = json.loads(post_data.decode('utf-8'))
            results = predict_batch(games)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())
```

2. **Update `vercel.json` to use Python runtime:**

```json
{
  "functions": {
    "api/predict-python/index.py": {
      "runtime": "python3.9"
    }
  },
  "buildCommand": "npm run vercel-build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

3. **Update your API route to call Python function:**

```typescript
// In frontend/app/api/games/route.ts
// Instead of execSync, call the Python function:
const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/predict-python`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(gamesForPrediction)
});
const predictions = await response.json();
```

**Note:** This requires Vercel Pro plan for Python runtime.

### Option 2: External Python API (Recommended for Free Tier)

Deploy your Python prediction API separately:

1. **Deploy to Railway/Render/Heroku:**
   - Create a simple Flask/FastAPI server
   - Expose `/predict` endpoint
   - Deploy with your models

2. **Update API route to call external API:**

```typescript
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'https://your-python-api.railway.app';

const response = await fetch(`${PYTHON_API_URL}/predict`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(gamesForPrediction)
});
const predictions = await response.json();
```

3. **Set environment variable in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `PYTHON_API_URL=https://your-python-api.railway.app`

### Option 3: Pre-compute Predictions (Simplest)

Generate predictions during build and store them:

1. **Create `scripts/generate-predictions.js`:**

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load games
const gamesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'nhl_games_2021_2026.json'), 'utf-8')
);

// Filter to future games
const futureGames = gamesData.filter(g => {
  const gameDate = new Date(g.date);
  return gameDate > new Date() && !g.result;
});

// Generate predictions
const gamesForPrediction = futureGames.map(g => ({
  id: `game-${g.date}-${g.opponent}-${g.team}`,
  homeTeam: g.game_location !== '@' ? g.team : g.opponent,
  awayTeam: g.game_location === '@' ? g.team : g.opponent
}));

const inputJson = JSON.stringify(gamesForPrediction);
const result = execSync(
  `python3 predict_batch.py`,
  { input: inputJson, encoding: 'utf-8', cwd: __dirname + '/..' }
);

const predictions = JSON.parse(result);
fs.writeFileSync(
  path.join(__dirname, '..', 'frontend', 'data', 'predictions.json'),
  JSON.stringify(predictions, null, 2)
);

console.log(`Generated ${Object.keys(predictions).length} predictions`);
```

2. **Update build script:**

```json
{
  "scripts": {
    "vercel-build": "node ../scripts/generate-predictions.js && node copy-files-for-vercel.js && next build"
  }
}
```

3. **Update API route to load pre-computed predictions:**

```typescript
// Load pre-computed predictions
const predictionsPath = getDataPath('predictions.json');
if (fs.existsSync(predictionsPath)) {
  const precomputed = JSON.parse(fs.readFileSync(predictionsPath, 'utf-8'));
  games.forEach(game => {
    const prediction = precomputed[game.id];
    if (prediction && prediction.success) {
      game.baseWinProb = Math.round(prediction.win_probability);
      game.currentWinProb = game.baseWinProb;
    }
  });
}
```

**Pros:** Simple, works on free tier, fast  
**Cons:** Predictions only update on redeploy

### Option 4: Use Node.js XGBoost (Experimental)

Try a Node.js port of XGBoost (may have compatibility issues):

```bash
npm install ml-xgboost
```

Then rewrite `predict_batch.py` logic in TypeScript.

## Recommended Approach

For **production**: Use Option 1 (Vercel Python Runtime) if you have Pro plan, or Option 2 (External API) if on free tier.

For **quick fix**: Use Option 3 (Pre-compute) - it's the simplest and works immediately.

## Testing the Fix

After implementing a solution, test:

```javascript
fetch('/api/games?upcoming=true')
  .then(r => r.json())
  .then(data => {
    const games = data.games || [];
    const withPredictions = games.filter(g => g.baseWinProb !== 50);
    console.log(`✅ Predictions working: ${withPredictions.length} of ${games.length}`);
  });
```

## Current Status Check

Run this to see what's wrong right now:

```javascript
fetch('/api/predictions-debug').then(r => r.json()).then(d => {
  console.log('Issues:', d.issues);
  console.log('Solutions:', d.solutions);
});
```
