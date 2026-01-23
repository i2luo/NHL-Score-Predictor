# Testing XGBoost Predictions Flow

This guide explains how to verify that predictions from the XGBoost model are being sent and rendered in the frontend.

## Quick Test (Browser Console)

The fastest way to test if predictions are working:

1. **Start your dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open your app in the browser** (usually http://localhost:3000)

3. **Open browser DevTools** (F12 or Cmd+Option+I)

4. **Go to Console tab**

5. **Copy and paste the contents of `frontend/test-predictions-browser.js`** into the console and press Enter

This will:
- ✅ Check if API is returning games
- ✅ Verify which games have ML predictions (not default 50%)
- ✅ Check if predictions are rendered in the DOM
- ✅ Show a summary of results

## Comprehensive Test (Node.js Script)

For a more thorough test of the entire pipeline:

```bash
# Test everything
node test_predictions_flow.js --all

# Test specific components
node test_predictions_flow.js --python  # Test Python script only
node test_predictions_flow.js --api      # Test API route only
node test_predictions_flow.js --frontend # Test frontend only
```

This script tests:
1. ✅ Model files exist
2. ✅ Data files exist
3. ✅ Python batch prediction script works
4. ✅ API route returns predictions
5. ✅ Frontend is accessible

## What to Look For

### ✅ Success Indicators

- Games have `baseWinProb` values that are **NOT 50%**
- Different games show different probabilities
- Probabilities make sense (e.g., strong teams have higher win probabilities)
- Console logs show `[API] ✓ Applied prediction to...` messages
- Browser console shows `[API Client] Games with predictions (not 50%): X of Y`

### ❌ Failure Indicators

- All games show exactly **50%** probability
- Console shows `⚠️ WARNING: All games have default 50% probability!`
- Server logs show `⚠️ CRITICAL: No predictions were applied!`
- API returns games but `baseWinProb` is always 50

## Troubleshooting

### Problem: All games show 50% probability

**Possible causes:**
1. **Python script not found** - Check that `predict_batch.py` exists in the correct location
2. **Models not found** - Verify model files are in `models/` directory
3. **Python dependencies missing** - Run `pip install -r requirements.txt`
4. **No games to predict** - Check that there are future games in the data

**Solutions:**
- Check server logs for error messages
- Verify Python 3 is installed: `python3 --version`
- Test Python script directly: `echo '[{"id":"test","homeTeam":"NYR","awayTeam":"PIT"}]' | python3 predict_batch.py`
- Check that model files exist: `ls models/`

### Problem: API returns games but no predictions

**Check:**
1. Server console logs for `[API] ========== BATCH PREDICTION SECTION ==========`
2. Look for `[API] ✓ Applied prediction to...` messages
3. Verify `predict_batch.py` is being executed successfully
4. Check for Python errors in server logs

### Problem: Predictions work in API but not in frontend

**Check:**
1. Browser console for `[API Client]` logs
2. Network tab to see API response
3. Verify `baseWinProb` is in the API response JSON
4. Check React component props in React DevTools

## Manual Verification Steps

1. **Check API Response:**
   - Open Network tab in DevTools
   - Find request to `/api/games?upcoming=true`
   - Check Response tab
   - Look for `baseWinProb` values that are not 50

2. **Check Component Props:**
   - Install React DevTools extension
   - Inspect `GameCard` or `SimulatorView` components
   - Verify `game.baseWinProb` prop is not 50

3. **Check Console Logs:**
   - Look for `[API Client] Sample games with win probabilities:`
   - Verify probabilities are logged correctly
   - Check for any error messages

4. **Visual Check:**
   - Games should show different win probability percentages
   - Probability bars should vary in length
   - Strong teams should generally have higher probabilities

## Expected Behavior

When everything is working correctly:

1. **API Route** (`/api/games`):
   - Loads game data
   - Calls `predict_batch.py` with game list
   - Receives predictions from Python script
   - Applies predictions to games (sets `baseWinProb`)
   - Returns games with predictions

2. **Frontend**:
   - Fetches games from API
   - Receives games with `baseWinProb` values
   - Displays probabilities in `GameCard` components
   - Allows adjustment in `SimulatorView`

3. **Python Script**:
   - Loads XGBoost models
   - Prepares features for each game
   - Makes predictions using models
   - Returns win probabilities (0-100%)

## Debug Mode

Add `?debug=true` to API requests to get additional debug information:

```
http://localhost:3000/api/games?upcoming=true&debug=true
```

This will include:
- Total scraped games
- Games after conversion
- Sample games
- Injury data

## Logging

The codebase includes extensive logging:

- **Server logs** (`[API]` prefix): Show prediction process
- **Client logs** (`[API Client]` prefix): Show data fetching
- **Component logs** (`[GameCard]`, `[SimulatorView]`): Show rendering

Enable verbose logging by checking browser console and server terminal.
