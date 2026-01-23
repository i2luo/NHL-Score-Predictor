# XGBoost Predictions Fix for Vercel

## Problem
All games were showing 50% base probability on Vercel deployment, meaning XGBoost model predictions weren't working.

## Root Cause
1. **Vercel doesn't have Python** - Can't run `predict_batch.py` on Vercel's Node.js runtime
2. **Missing predictions file** - `frontend/data/predictions.json` didn't exist
3. **File was ignored** - `.gitignore` was ignoring the predictions file

## Solution Applied

### 1. Generated Predictions File
Ran the prediction generation script locally:
```bash
node scripts/generate-predictions.js
```

This created `frontend/data/predictions.json` with 503 predictions for all future games.

### 2. Fixed .gitignore
Updated `.gitignore` to allow `predictions.json`:
```
*.json
!frontend/data/predictions.json  # Exception must come after *.json
```

### 3. API Route Already Configured
The API route (`frontend/app/api/games/route.ts`) was already set up to:
- Check for `predictions.json` first
- Use pre-computed predictions if available
- Fall back to Python script only if file doesn't exist

## Files Changed

1. ✅ `frontend/data/predictions.json` - Generated predictions (56KB, 503 games)
2. ✅ `.gitignore` - Added exception for predictions.json
3. ✅ `scripts/generate-predictions.js` - Fixed TypeScript syntax errors
4. ✅ `frontend/copy-files-for-vercel.js` - Added comment about predictions.json

## Next Steps

1. **Commit and push:**
   ```bash
   git add frontend/data/predictions.json .gitignore scripts/generate-predictions.js frontend/copy-files-for-vercel.js
   git commit -m "Add pre-computed XGBoost predictions for Vercel deployment"
   git push
   ```

2. **Deploy to Vercel** - The predictions file will be included in deployment

3. **Verify it works:**
   ```javascript
   // In browser console on deployed site:
   fetch('/api/games?upcoming=true')
     .then(r => r.json())
     .then(data => {
       const games = data.games || [];
       const withPredictions = games.filter(g => g.baseWinProb !== 50);
       console.log(`✅ Predictions: ${withPredictions.length} of ${games.length}`);
     });
   ```

## Regenerating Predictions

When you need to update predictions (after daily update, new games, etc.):

```bash
# Regenerate predictions
node scripts/generate-predictions.js

# Commit and push
git add frontend/data/predictions.json
git commit -m "Update predictions"
git push
```

Or let the daily update workflow handle it automatically (it will regenerate and commit).

## How It Works

1. **Local/CI**: `generate-predictions.js` runs Python script to generate predictions
2. **File**: Predictions saved to `frontend/data/predictions.json`
3. **Git**: File is committed and pushed
4. **Vercel**: File is deployed with the app
5. **API**: Route loads predictions from file (no Python needed)
6. **Frontend**: Games display with correct base probabilities

## Verification

After deployment, check Vercel function logs for:
```
[API] Found pre-computed predictions, loading...
[API] Loaded 503 pre-computed predictions
[API] Pre-computed prediction summary: X applied, 0 failed
```

If you see "No pre-computed predictions matched game IDs", the game IDs might not match. Check the game ID format in the API route vs predictions file.
