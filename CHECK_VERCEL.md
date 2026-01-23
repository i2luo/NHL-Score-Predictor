# How to Check if XGBoost Predictions Work on Vercel

Since you're getting games on Vercel but want to verify the XGBoost model is actually making predictions, here are several ways to check:

## Quick Check: Browser Console

**The easiest way** - just check the API response directly:

1. **Open your deployed Vercel app** in a browser
2. **Open DevTools** (F12)
3. **Go to Console tab**
4. **Paste this code:**

```javascript
fetch('/api/games?upcoming=true')
  .then(r => r.json())
  .then(data => {
    const games = data.games || [];
    const withPredictions = games.filter(g => g.baseWinProb !== 50);
    const withDefault = games.filter(g => g.baseWinProb === 50);
    
    console.log('📊 Results:');
    console.log(`Total games: ${games.length}`);
    console.log(`✅ With ML predictions (not 50%): ${withPredictions.length}`);
    console.log(`❌ With default 50%: ${withDefault.length}`);
    
    if (withPredictions.length > 0) {
      console.log('✅ SUCCESS: XGBoost is working!');
      console.log('Sample predictions:', withPredictions.slice(0, 3).map(g => 
        `${g.awayTeam} @ ${g.homeTeam}: ${g.baseWinProb}%`
      ));
    } else {
      console.log('❌ PROBLEM: All games show 50% - predictions not working');
    }
    
    // Show all games
    games.slice(0, 10).forEach(g => {
      const icon = g.baseWinProb !== 50 ? '✅' : '❌';
      console.log(`${icon} ${g.awayTeam} @ ${g.homeTeam}: ${g.baseWinProb}%`);
    });
  });
```

## Method 2: Use the Predictions Check Endpoint

I've created a special endpoint just for checking predictions:

1. **Visit:** `https://your-app.vercel.app/api/predictions-check`
2. **Or use the HTML checker:** Open `check-vercel-predictions.html` in your browser and enter your Vercel URL

This will show you:
- ✅ Whether predictions are working
- 📊 How many games have ML predictions vs default 50%
- 📋 Sample games with their probabilities
- 🔧 Troubleshooting tips if not working

## Method 3: Check Vercel Logs

The API route logs extensively about predictions:

1. **Go to Vercel Dashboard**
2. **Click on your project**
3. **Go to "Functions" or "Logs" tab**
4. **Look for these log messages:**

### ✅ Success indicators:
- `[API] ✓ Applied prediction to NYR @ PIT: 67%`
- `[API] Prediction summary: X applied, 0 failed`
- `[API] Games with ML predictions (not 50%): X of Y`

### ❌ Failure indicators:
- `[API] ⚠️ CRITICAL: No predictions were applied!`
- `[API] ⚠️ CRITICAL: Batch prediction script not found`
- `[API] Python command 'python3' not found`
- `[API] Games will use default 50% win probability`

## Method 4: Visual Check in Your App

**Look at the actual game cards:**

1. **Open your deployed app**
2. **Check the win probability percentages**
3. **If ALL games show exactly 50%** → Predictions are NOT working
4. **If games show different percentages** (like 45%, 67%, 52%, etc.) → Predictions ARE working ✅

## Key Indicator: baseWinProb Value

**The key thing to check:**
- **`baseWinProb = 50`** → Default value, model didn't run ❌
- **`baseWinProb = any other number`** (45, 55, 67, etc.) → Model prediction ✅

## Common Issues on Vercel

### Issue 1: Python Not Available
**Symptom:** Logs show "Python command not found"
**Solution:** Vercel doesn't have Python by default. You may need:
- Vercel's Python runtime
- Or use a different approach (serverless functions with Python)

### Issue 2: Model Files Missing
**Symptom:** Logs show "Models not found"
**Solution:** Ensure model files are:
- Committed to git
- Copied to `frontend/models/` during build
- Check `copy-files-for-vercel.js` is running

### Issue 3: Python Script Not Found
**Symptom:** Logs show "Batch prediction script not found"
**Solution:** Ensure `predict_batch.py` is:
- In `frontend/python/` directory
- Copied during build process

## Quick Test Script

Run this in your browser console on your deployed site:

```javascript
// Quick prediction check
(async () => {
  const res = await fetch('/api/games?upcoming=true');
  const data = await res.json();
  const games = data.games || [];
  
  const predictions = games.filter(g => g.baseWinProb !== 50);
  const defaults = games.filter(g => g.baseWinProb === 50);
  
  console.log(`✅ ML Predictions: ${predictions.length}`);
  console.log(`❌ Default 50%: ${defaults.length}`);
  console.log(predictions.length > 0 ? '✅ WORKING!' : '❌ NOT WORKING');
  
  // Show probabilities
  games.slice(0, 5).forEach(g => {
    console.log(`${g.awayTeam} @ ${g.homeTeam}: ${g.baseWinProb}%`);
  });
})();
```

## What Success Looks Like

When predictions are working, you should see:
- ✅ Games with various probabilities (not all 50%)
- ✅ Different teams have different probabilities
- ✅ Strong teams generally have higher probabilities
- ✅ Console shows "Games with predictions (not 50%): X of Y"

## What Failure Looks Like

When predictions are NOT working:
- ❌ ALL games show exactly 50%
- ❌ Console shows "All games have default 50% probability"
- ❌ Vercel logs show prediction errors
- ❌ No variation in probabilities

---

**TL;DR:** Check if `baseWinProb` values are different from 50. If they're all 50, predictions aren't working. If they vary (45, 55, 67, etc.), predictions ARE working! ✅
