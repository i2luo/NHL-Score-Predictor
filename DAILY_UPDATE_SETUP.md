# Daily Update Setup

This guide explains how to set up automated daily updates at 12pm Eastern time to:
1. Scrape latest game results
2. Scrape current injury data  
3. Regenerate predictions for upcoming games

## Option 1: Vercel Cron Jobs (Requires Pro Plan)

Vercel Pro plan includes cron jobs. If you have Pro:

### Setup Steps

1. **Add cron configuration** (already done in `vercel.json`):
   ```json
   {
     "crons": [
       {
         "path": "/api/cron-daily-update",
         "schedule": "0 17 * * *"
       }
     ]
   }
   ```
   - Schedule: `0 17 * * *` = 5pm UTC = 12pm EST (adjust for DST if needed)

2. **Set environment variable** in Vercel Dashboard:
   - Go to Project → Settings → Environment Variables
   - Add: `CRON_SECRET` = (generate a random string)

3. **Deploy** - The cron job will run automatically

### Limitations

- **Python not available**: Vercel's Node.js runtime doesn't have Python
- **Workaround**: The cron endpoint will need to call an external service or use pre-computed updates

## Option 2: GitHub Actions (Recommended for Free Tier)

GitHub Actions can run Python scripts and has free tier with generous limits.

### Setup Steps

1. **The workflow is already configured** in `.github/workflows/daily-update.yml`

2. **Enable GitHub Actions**:
   - Go to your GitHub repository
   - Settings → Actions → General
   - Enable "Allow all actions and reusable workflows"

3. **Set up repository secrets** (if needed):
   - Settings → Secrets and variables → Actions
   - No secrets needed for basic setup (uses GITHUB_TOKEN automatically)

4. **The workflow will**:
   - Run daily at 12pm Eastern (5pm UTC)
   - Scrape game results and injuries
   - Regenerate predictions
   - Commit and push changes automatically

### Manual Trigger

You can also trigger it manually:
- Go to Actions tab in GitHub
- Select "Daily Update" workflow
- Click "Run workflow"

## Option 3: External Cron Service

Use a service like cron-job.org, EasyCron, or similar:

1. **Create a webhook endpoint** that triggers the update
2. **Set up cron job** to call your endpoint daily
3. **Endpoint can**:
   - Call GitHub Actions API to trigger workflow
   - Or call a serverless function
   - Or make HTTP request to your update service

### Example: Trigger GitHub Actions via API

```bash
curl -X POST \
  -H "Authorization: token YOUR_GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/actions/workflows/daily-update.yml/dispatches \
  -d '{"ref":"main"}'
```

## Option 4: Local Server / VPS

If you have a server running 24/7:

1. **Set up cron on your server**:
   ```bash
   crontab -e
   ```
   
2. **Add this line** (adjust path and timezone):
   ```bash
   0 12 * * * cd /path/to/NHLScorePredictor && /usr/bin/python3 scripts/daily_update.py >> /var/log/nhl-update.log 2>&1
   ```

3. **Make script executable**:
   ```bash
   chmod +x scripts/daily_update.py
   ```

## Testing the Update Script

Test locally before setting up automation:

```bash
# Run the daily update script
python3 scripts/daily_update.py
```

This will:
1. ✅ Load existing games
2. ✅ Scrape current season for new results
3. ✅ Update games with new results
4. ✅ Scrape injury data
5. ✅ Regenerate predictions

## Schedule Time Adjustments

**12pm Eastern Time:**
- EST (Nov-Mar): 5pm UTC = `0 17 * * *`
- EDT (Mar-Nov): 4pm UTC = `0 16 * * *`

**To adjust:**
- Vercel cron: Update `vercel.json` schedule
- GitHub Actions: Update `.github/workflows/daily-update.yml` cron
- External cron: Adjust in your cron service settings

## What Gets Updated

1. **Game Results** (`nhl_games_2021_2026.json`):
   - Scrapes current season only (faster)
   - Updates existing games with new results
   - Adds any new games

2. **Injury Data**:
   - `nhl_injuries.json` - Summary counts
   - `nhl_injuries_detailed.json` - Detailed player info

3. **Predictions** (`frontend/data/predictions.json`):
   - Regenerates for all future games
   - Uses updated game data and injuries

## Monitoring

### Check Vercel Cron Logs:
- Vercel Dashboard → Your Project → Functions
- Look for `/api/cron-daily-update` function logs

### Check GitHub Actions:
- GitHub → Actions tab
- View "Daily Update" workflow runs
- Check logs for any errors

### Verify Updates:
```javascript
// Check if predictions were updated today
fetch('/api/games?upcoming=true')
  .then(r => r.json())
  .then(data => {
    const games = data.games || [];
    const withPredictions = games.filter(g => g.baseWinProb !== 50);
    console.log(`Predictions: ${withPredictions.length} of ${games.length}`);
  });
```

## Troubleshooting

### Issue: Python not available on Vercel
**Solution**: Use GitHub Actions (Option 2) instead

### Issue: GitHub Actions not running
**Check**:
- Actions are enabled in repository settings
- Workflow file is in `.github/workflows/` directory
- Cron syntax is correct

### Issue: Script times out
**Solution**: 
- Increase timeout in workflow/function
- Or split into separate jobs (scrape → predict)

### Issue: Predictions not updating
**Check**:
- Script completed successfully
- `frontend/data/predictions.json` was updated
- Files were committed and pushed (for GitHub Actions)

## Recommended Setup

**For most users**: Use **GitHub Actions (Option 2)**
- ✅ Free
- ✅ Python available
- ✅ Automatic commits
- ✅ Easy to monitor
- ✅ Can trigger manually

**For Vercel Pro users**: Use **Vercel Cron (Option 1)**
- ✅ Integrated with deployment
- ✅ No external dependencies
- ⚠️ Requires Python workaround
