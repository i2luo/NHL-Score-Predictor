"""
Daily update script to:
1. Scrape latest game results (update past games)
2. Scrape current injury data
3. Regenerate predictions for upcoming games

Run this daily at 12pm Eastern time
"""

import sys
import json
import os
import shutil
from pathlib import Path
from datetime import datetime, date
import subprocess

ROOT_DIR = Path(__file__).resolve().parent.parent

# Add parent directory to path
sys.path.insert(0, str(ROOT_DIR))

from scraper import (
    scrape_all_teams, scrape_all_schedules, get_current_season_year,
    is_rate_limited, DEFAULT_DELAY,
)

# Historical file name is kept for compatibility: the frontend API, the
# prediction scripts and the Vercel copy step all read this exact file.
GAMES_FILE = "nhl_games_2021_2026.json"

# Files the frontend reads at runtime. On Vercel they are copied into
# frontend/data/ at build time; locally the API also looks there first, so
# keep the copies in sync to avoid serving stale data in development.
FRONTEND_DATA_DIR = ROOT_DIR / "frontend" / "data"
FRONTEND_SYNC_FILES = [GAMES_FILE, "nhl_injuries.json", "nhl_injuries_detailed.json"]


def game_key(game: dict) -> str:
    return f"{game['date']}-{game['team']}-{game['opponent']}"


def load_existing_games(data_file: str) -> dict:
    """Load existing games data"""
    if os.path.exists(data_file):
        with open(data_file, 'r', encoding='utf-8') as f:
            games = json.load(f)
        print(f"Loaded {len(games)} existing games from {data_file}")
        return {game_key(g): g for g in games if g.get('date') and g.get('opponent')}
    return {}


def update_game_results(existing_games: dict, played_games: list, upcoming_games: list) -> list:
    """
    Merge freshly scraped data into the existing dataset.

    - played_games (from the game log) always win: they carry the final stats.
    - upcoming_games (from the schedule page) are added if unknown, or refresh
      the time/location of a known game that still has no result. They never
      overwrite a game that already has a result.
    - Stale future games (no result, date already passed) are dropped. These
      are postponed/rescheduled games or leftovers from a previous season's
      schedule and would otherwise linger forever.
    """
    updated_games = existing_games.copy()
    new_played = updated_played = new_upcoming = refreshed_upcoming = 0

    for game in played_games:
        if not game.get('result'):
            continue
        key = game_key(game)
        if key in updated_games:
            if not updated_games[key].get('result'):
                updated_played += 1
        else:
            new_played += 1
        updated_games[key] = game

    for game in upcoming_games:
        key = game_key(game)
        existing = updated_games.get(key)
        if existing is None:
            updated_games[key] = game
            new_upcoming += 1
        elif not existing.get('result'):
            existing['game_time'] = game.get('game_time') or existing.get('game_time')
            existing['game_location'] = game.get('game_location')
            refreshed_upcoming += 1

    today = date.today().isoformat()
    before = len(updated_games)
    updated_games = {
        k: g for k, g in updated_games.items()
        if g.get('result') or (g.get('date') or '') >= today
    }
    pruned = before - len(updated_games)

    result = sorted(updated_games.values(), key=lambda g: (g['date'], g['team']))
    print(f"  Played games: {updated_played} updated with results, {new_played} newly added")
    print(f"  Upcoming games: {new_upcoming} added, {refreshed_upcoming} refreshed")
    print(f"  Pruned {pruned} stale unplayed games")
    print(f"  Total games: {len(result)}")

    return result


def save_games(games: list, filename: str):
    """Save games to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(games, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(games)} games to {filename}")


def sync_frontend_data():
    """Copy the data files the frontend reads into frontend/data/."""
    FRONTEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name in FRONTEND_SYNC_FILES:
        src = ROOT_DIR / name
        if src.exists():
            shutil.copyfile(src, FRONTEND_DATA_DIR / name)
            print(f"  Synced {name} -> frontend/data/")

def main():
    print("=" * 60)
    print("NHL Score Predictor - Daily Update")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()
    
    # Step 1: Update game results
    print("STEP 1: Updating game results...")
    print("-" * 60)
    
    data_file = str(ROOT_DIR / GAMES_FILE)
    existing_games = load_existing_games(data_file)
    
    # Scrape current season only (for faster updates)
    current_year = get_current_season_year()
    print(f"Scraping current season ({current_year-1}-{current_year})...")
    
    played_games = scrape_all_teams(year=current_year, delay=DEFAULT_DELAY)
    print(f"Scraped {len(played_games)} played games from current season")

    upcoming_games = scrape_all_schedules(year=current_year, delay=DEFAULT_DELAY)
    print(f"Scraped {len(upcoming_games)} upcoming games from current season schedules")

    games_ok = True
    if is_rate_limited():
        games_ok = False
        print("✗ hockey-reference rate-limited this run; game data is incomplete (will catch up next run)")
    if not played_games and not upcoming_games:
        games_ok = False
        print("✗ Nothing scraped (network/site problem?). Keeping existing data untouched.")
    else:
        all_games = update_game_results(existing_games, played_games, upcoming_games)
        save_games(all_games, data_file)
    print()
    
    # Step 2: Scrape injuries
    print("STEP 2: Scraping injury data...")
    print("-" * 60)
    
    try:
        injury_script = ROOT_DIR / "scrape_injuries.py"
        if injury_script.exists():
            result = subprocess.run(
                [sys.executable, str(injury_script)],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                print("✓ Injury data scraped successfully")
                if result.stdout:
                    # Show last few lines of output
                    lines = result.stdout.strip().split('\n')
                    for line in lines[-5:]:
                        if line.strip():
                            print(f"  {line}")
            else:
                print(f"✗ Error scraping injuries:")
                if result.stderr:
                    print(f"  {result.stderr[:500]}")
                print("  Continuing with predictions update...")
        else:
            print(f"✗ Injury scraper not found: {injury_script}")
    except subprocess.TimeoutExpired:
        print("✗ Injury scraping timed out")
    except Exception as e:
        print(f"✗ Error scraping injuries: {e}")
        print("  Continuing with predictions update...")
    print()
    
    # Step 3: Regenerate predictions
    print("STEP 3: Regenerating predictions...")
    print("-" * 60)
    
    predictions_ok = False
    try:
        # Run the prediction generation script
        script_path = ROOT_DIR / "scripts" / "generate-predictions.js"
        if script_path.exists():
            print("Running prediction generation script...")
            result = subprocess.run(
                ["node", str(script_path)],
                cwd=ROOT_DIR,
                capture_output=True,
                text=True,
                timeout=900,  # feature engineering over the full dataset is slow on CI runners
                env={**os.environ, "PYTHON_BIN": sys.executable},
            )
            
            if result.returncode == 0:
                predictions_ok = True
                print("✓ Predictions regenerated successfully")
                if result.stdout:
                    print(result.stdout)
            else:
                print(f"✗ Error generating predictions:")
                print(result.stdout[-2000:])
                print(result.stderr[-2000:])
        else:
            print(f"✗ Prediction script not found: {script_path}")
    except subprocess.TimeoutExpired:
        print("✗ Prediction generation timed out")
    except Exception as e:
        print(f"✗ Error running prediction script: {e}")
    
    print()

    # Step 4: Keep the frontend's local data copies in sync
    print("STEP 4: Syncing data files into frontend/data/...")
    print("-" * 60)
    sync_frontend_data()
    print()

    # Make the CI job fail loudly instead of silently publishing incomplete data.
    # (The workflow still commits whatever did update.)
    problems = []
    if not games_ok:
        problems.append("game scrape incomplete")
    if not predictions_ok:
        problems.append("predictions were not regenerated")
    if problems:
        print(f"✗ Daily update finished with errors: {'; '.join(problems)}")
        sys.exit(1)
    print("=" * 60)
    print("Daily update complete!")
    print("=" * 60)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

if __name__ == "__main__":
    main()
