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
from pathlib import Path
from datetime import datetime
import subprocess

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scraper import scrape_all_teams, get_current_season_year
import subprocess

def load_existing_games(data_file: str) -> dict:
    """Load existing games data"""
    if os.path.exists(data_file):
        with open(data_file, 'r', encoding='utf-8') as f:
            games = json.load(f)
        print(f"Loaded {len(games)} existing games from {data_file}")
        return {f"{g['date']}-{g['team']}-{g['opponent']}": g for g in games}
    return {}

def update_game_results(existing_games: dict, new_games: list) -> list:
    """Update existing games with new results, add new games"""
    updated_games = existing_games.copy()
    new_count = 0
    updated_count = 0
    
    for new_game in new_games:
        # Create key for matching
        key = f"{new_game['date']}-{new_game['team']}-{new_game['opponent']}"
        
        if key in updated_games:
            # Game exists - update if it has new results
            existing = updated_games[key]
            if new_game.get('result') and not existing.get('result'):
                # New result available - update
                updated_games[key] = new_game
                updated_count += 1
            elif new_game.get('result') and existing.get('result'):
                # Both have results - use the newer one (should be same, but just in case)
                updated_games[key] = new_game
        else:
            # New game - add it
            updated_games[key] = new_game
            new_count += 1
    
    result = list(updated_games.values())
    print(f"  Updated {updated_count} games with new results")
    print(f"  Added {new_count} new games")
    print(f"  Total games: {len(result)}")
    
    return result

def save_games(games: list, filename: str):
    """Save games to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(games, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(games)} games to {filename}")

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
    
    data_file = "nhl_games_2021_2026.json"
    existing_games = load_existing_games(data_file)
    
    # Scrape current season only (for faster updates)
    current_year = get_current_season_year()
    print(f"Scraping current season ({current_year-1}-{current_year})...")
    
    new_games = scrape_all_teams(year=current_year, delay=1.5)
    print(f"Scraped {len(new_games)} games from current season")
    
    # Merge with existing games
    all_games = update_game_results(existing_games, new_games)
    
    # Save updated games
    save_games(all_games, data_file)
    print()
    
    # Step 2: Scrape injuries
    print("STEP 2: Scraping injury data...")
    print("-" * 60)
    
    try:
        injury_script = Path(__file__).parent.parent / "scrape_injuries.py"
        if injury_script.exists():
            result = subprocess.run(
                ["python3", str(injury_script)],
                cwd=Path(__file__).parent.parent,
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
    
    try:
        # Run the prediction generation script
        script_path = Path(__file__).parent.parent / "scripts" / "generate-predictions.js"
        if script_path.exists():
            print("Running prediction generation script...")
            result = subprocess.run(
                ["node", str(script_path)],
                cwd=Path(__file__).parent.parent,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                print("✓ Predictions regenerated successfully")
                if result.stdout:
                    print(result.stdout)
            else:
                print(f"✗ Error generating predictions:")
                print(result.stderr)
        else:
            print(f"✗ Prediction script not found: {script_path}")
    except subprocess.TimeoutExpired:
        print("✗ Prediction generation timed out")
    except Exception as e:
        print(f"✗ Error running prediction script: {e}")
    
    print()
    print("=" * 60)
    print("Daily update complete!")
    print("=" * 60)
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

if __name__ == "__main__":
    main()
