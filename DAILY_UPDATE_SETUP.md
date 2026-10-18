# Daily Update Setup

Once a day a GitHub Actions workflow (`.github/workflows/daily-update.yml`) runs
`scripts/daily_update.py`, which:

1. Scrapes the current season's **completed games** from each team's
   hockey-reference game log (`/teams/<TEAM>/<YEAR>_gamelog.html`).
2. Scrapes each team's **schedule page** (`/teams/<TEAM>/<YEAR>_games.html`) for
   upcoming games. The game log only lists games that have already been played,
   so this is the only source of future matchups and start times.
3. Merges both into `nhl_games_2021_2026.json`, dropping unplayed games whose
   date has already passed (postponements / last season's leftovers).
4. Fetches current injuries from ESPN's public JSON endpoint into
   `nhl_injuries.json` and `nhl_injuries_detailed.json`. If ESPN fails it falls
   back to rendering PuckPedia with Playwright (unreliable: Cloudflare often
   serves a bot challenge). On total failure the previous day's files are kept.
5. Regenerates `frontend/data/predictions.json` for every future game using the
   models in `models/`.
6. Copies the data files into `frontend/data/` and commits + pushes whatever
   changed. The push triggers a Vercel redeploy, which is how the live site
   picks up the new data.

> Vercel Cron is **not** used. Vercel's Node runtime has no Python, so the
> scraping/prediction pipeline cannot run there. The old `crons` entry in
> `vercel.json` and the `frontend/api/cron-daily-update` route were removed.

## One-time setup

1. **Enable Actions** for the repository: Settings → Actions → General →
   "Allow all actions and reusable workflows". Also confirm "Workflow
   permissions" allows read and write (the workflow requests
   `contents: write` itself, but the repo setting must not forbid it).
2. **Trigger the first run manually**: Actions tab → "Daily Update" →
   "Run workflow". Scheduled runs only start after the workflow file is on the
   default branch, and a manual run is the quickest way to confirm everything
   works.
3. **Keep the repo active.** GitHub automatically disables scheduled workflows
   in public repos after 60 days with no commits. The daily commit produced by
   this workflow counts as activity, so once it is running it keeps itself alive.
4. Nothing else is required: the workflow uses the built-in `GITHUB_TOKEN`.

## Schedule

The cron is `0 16 * * *` (16:00 UTC). GitHub cron does not follow daylight
saving, so that is 12pm EDT / 11am EST. Either is fine: previous night's games
are final and the day's games have not started. Scheduled runs can be delayed
by GitHub during busy periods.

## Running it locally

```bash
pip install -r requirements.txt
python -m playwright install chromium
python3 scripts/daily_update.py
```

The script writes the same files the workflow commits. It exits non-zero if
predictions could not be regenerated so the problem is visible in CI logs.

## Verifying

- **Actions tab**: the latest "Daily Update" run is green and (on days with
  changes) ends with a `Daily update: ...` commit on `main`.
- **Data**: `nhl_games_2021_2026.json` contains games dated in the future with
  `"result": null` and a `game_time`.
- **Site**: `/api/games?upcoming=true&debug=true` returns a non-empty `games`
  array. If the site shows an amber "placeholder games" banner, the API returned
  no upcoming games — check the latest workflow run.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| No runs in the Actions tab | Actions disabled for the repo, or workflow never triggered manually after being added. |
| Run fails at "Commit and push" with 403 | Repo setting "Workflow permissions" is read-only. |
| Injury step logs "ESPN source failed" and the fallback also fails | Transient. The previous day's injury files are kept; check again after the next run. |
| hockey-reference returns HTTP 429 | Rate limit (~20 req/min). The scraper waits ≥3.5s between requests and backs off on 429; do not lower `DEFAULT_DELAY` in `scraper.py`. |
| "Models directory not found" | `models/*.pkl` are not committed. They must be in git for CI. |
| Predictions time out | `predict_batch.py` recomputes features over the whole dataset; the limits are 10 min in `generate-predictions.js` and 15 min in `daily_update.py`. |
| Site still stale after a green run | Vercel did not redeploy. Check the Vercel project is connected to the GitHub repo and deploys on push to `main`. |
