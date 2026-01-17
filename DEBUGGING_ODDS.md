# Debugging Win Probabilities (Odds) Issue

## Problem
Win probabilities (odds) are not rendering correctly upon initial site load on Vercel.

## Changes Made

### 1. Created Missing Library Files
- **`frontend/lib/api.ts`**: API client functions with comprehensive logging
- **`frontend/lib/calculations.ts`**: Utility functions (getTeamName, calculateWinProb)
- **`frontend/lib/mockData.ts`**: Mock data generators for fallback

### 2. Enhanced API Route Debugging (`frontend/app/api/games/route.ts`)
Added detailed logging to track:
- Batch prediction script execution
- Python script output and errors
- Prediction application to games
- Warnings when predictions fail

### 3. Enhanced Frontend Debugging
- **`frontend/app/page.tsx`**: Logs received games and their probabilities
- **`frontend/components/GameCard.tsx`**: Warns when games show default 50% probability
- **`frontend/lib/api.ts`**: Logs API responses and probability data

## How to Debug

### Step 1: Check Vercel Logs
1. Go to your Vercel dashboard
2. Navigate to your deployment
3. Click on "Functions" or "Logs"
4. Look for API route logs (should show `/api/games`)

### Step 2: Look for These Key Log Messages

#### Success Indicators:
```
[API] Applied prediction to TEAM1 @ TEAM2: 65%
[API] Prediction summary: X applied, 0 failed out of Y games
[Frontend] Games with predictions (not 50%): X of Y
```

#### Failure Indicators:
```
[API] ⚠️ CRITICAL: No predictions were applied!
[API] Batch prediction script not found
[API] Batch prediction execution failed
[Frontend] ⚠️ WARNING: All games have default 50% probability!
[GameCard] ⚠️ Game has default 50% probability
```

### Step 3: Check Browser Console
1. Open your deployed site
2. Open browser DevTools (F12)
3. Go to Console tab
4. Look for logs starting with `[Frontend]` or `[GameCard]`

### Step 4: Common Issues and Solutions

#### Issue 1: Batch Prediction Script Not Found
**Symptoms:**
```
[API] ⚠️ Batch prediction script not found at: ...
```

**Solution:**
- Ensure `predict_batch.py` is in the `frontend/python/` directory
- Check that the file is committed to git
- Verify the file is copied during Vercel build (check `copy-files-for-vercel.js`)

#### Issue 2: Python Script Execution Fails
**Symptoms:**
```
[API] Batch prediction execution failed: ...
[API] Python stderr: ...
```

**Solution:**
- Check Python dependencies are installed (requirements.txt)
- Verify models directory exists and contains trained models
- Check data files are available (nhl_games_2021_2026.json)
- Look at stderr output for specific Python errors

#### Issue 3: Predictions Returned but Not Applied
**Symptoms:**
```
[API] Parsed X predictions
[API] ✗ No valid prediction for TEAM1 @ TEAM2
```

**Solution:**
- Check game IDs match between frontend and Python script
- Verify prediction format matches expected structure
- Check for type mismatches (win_probability should be a number)

#### Issue 4: All Games Show 50%
**Symptoms:**
```
[Frontend] Games with predictions (not 50%): 0 of X
[GameCard] ⚠️ Game has default 50% probability
```

**Solution:**
- Check if batch prediction is running at all
- Verify predictions are being generated correctly
- Check if predictions are being applied to game objects

## Testing Locally

1. **Test API Route:**
   ```bash
   curl "http://localhost:3000/api/games?upcoming=true&debug=true"
   ```

2. **Check Logs:**
   - Server logs will show `[API]` messages
   - Browser console will show `[Frontend]` and `[GameCard]` messages

3. **Verify Predictions:**
   - Look for games with probabilities other than 50%
   - Check that predictions match expected values

## Next Steps

1. **Deploy to Vercel** and check logs
2. **Identify the specific failure point** using the logs
3. **Fix the root cause** based on error messages
4. **Verify the fix** by checking that games show non-50% probabilities

## Additional Debugging

To get even more detailed information, you can:

1. **Add `?debug=true` to API calls:**
   ```
   /api/games?upcoming=true&debug=true
   ```

2. **Check Vercel function logs** for full stack traces

3. **Test Python script directly:**
   ```bash
   echo '[{"id":"test","homeTeam":"TOR","awayTeam":"MTL"}]' | python3 frontend/python/predict_batch.py
   ```
