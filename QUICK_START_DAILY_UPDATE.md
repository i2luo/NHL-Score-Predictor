# Quick Start: Daily Updates

## What It Does

Every day at **12pm Eastern time**, the system will:
1. ✅ Scrape latest game results (update past games with scores)
2. ✅ Scrape current injury data from PuckPedia
3. ✅ Regenerate predictions for all upcoming games

## Setup (Choose One)

### Option A: GitHub Actions (Recommended - Free)

1. **Push the workflow file** (already created):
   ```bash
   git add .github/workflows/daily-update.yml
   git commit -m "Add daily update workflow"
   git push
   ```

2. **Enable Actions** in GitHub:
   - Go to your repo → Settings → Actions → General
   - Enable "Allow all actions and reusable workflows"
   - Save

3. **Done!** The workflow will run automatically daily at 12pm Eastern

### Option B: Vercel Cron (Requires Pro Plan)

1. **Set environment variable** in Vercel:
   - Dashboard → Project → Settings → Environment Variables
   - Add: `CRON_SECRET` = (any random string)

2. **Deploy** - cron is already configured in `vercel.json`

**Note**: Vercel doesn't have Python, so you'll need to use GitHub Actions or an external service.

## Test It

Run the update script manually to test:

```bash
python3 scripts/daily_update.py
```

This will:
- Update game results
- Scrape injuries
- Regenerate predictions

## Verify It's Working

After the first run, check:

1. **Game data updated:**
   ```bash
   # Check if games have new results
   cat nhl_games_2021_2026.json | grep -A 5 "2025-01-15" | head -10
   ```

2. **Injuries updated:**
   ```bash
   cat nhl_injuries.json
   ```

3. **Predictions regenerated:**
   ```bash
   ls -lh frontend/data/predictions.json
   ```

## Manual Trigger (GitHub Actions)

To run the update manually:

1. Go to GitHub → Actions tab
2. Click "Daily Update" workflow
3. Click "Run workflow" → "Run workflow"

## Schedule

- **Time**: 12pm Eastern (5pm UTC)
- **Frequency**: Daily
- **Duration**: ~2-5 minutes

## Files Updated

- `nhl_games_2021_2026.json` - Game results
- `nhl_injuries.json` - Injury counts
- `nhl_injuries_detailed.json` - Detailed injuries
- `frontend/data/predictions.json` - Predictions

All changes are automatically committed and pushed (GitHub Actions).

## Troubleshooting

**Workflow not running?**
- Check Actions are enabled in repo settings
- Check workflow file is in `.github/workflows/`

**Script fails?**
- Check GitHub Actions logs
- Try running manually: `python3 scripts/daily_update.py`

**Predictions not updating?**
- Check if script completed successfully
- Verify `frontend/data/predictions.json` was updated
- Check file was committed and pushed

## Next Steps

1. ✅ Push the workflow file to GitHub
2. ✅ Enable GitHub Actions
3. ✅ Wait for first run (or trigger manually)
4. ✅ Verify files are updated

That's it! Your predictions will update daily automatically. 🎉
