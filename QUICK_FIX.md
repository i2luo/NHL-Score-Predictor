# Quick Fix: Get Predictions Working on Vercel

## The Problem

Vercel's Node.js runtime doesn't have Python, so your predictions can't run. All games show 50%.

## Quick Fix (5 minutes)

**Pre-compute predictions before deploying:**

1. **Generate predictions locally:**
   ```bash
   node scripts/generate-predictions.js
   ```

2. **Commit the predictions file:**
   ```bash
   git add frontend/data/predictions.json
   git commit -m "Add pre-computed predictions"
   git push
   ```

3. **Deploy to Vercel** - predictions will now work!

The API route will automatically use pre-computed predictions if available, falling back to Python only if the file doesn't exist.

## Verify It Works

After deploying, check:

```javascript
fetch('/api/games?upcoming=true')
  .then(r => r.json())
  .then(data => {
    const games = data.games || [];
    const withPredictions = games.filter(g => g.baseWinProb !== 50);
    console.log(`✅ Predictions: ${withPredictions.length} of ${games.length}`);
  });
```

## When to Regenerate

Regenerate predictions when:
- New games are added to the schedule
- You want updated predictions
- Before each deployment

Just run `node scripts/generate-predictions.js` again and commit the updated file.

## Better Long-term Solutions

See `FIX_VERCEL_PREDICTIONS.md` for:
- Using Vercel Python runtime
- External Python API
- Other deployment options

But for now, pre-computing works great! ✅
