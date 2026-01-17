"""
NHL Score Predictor - Web Scraper
Scrapes game log data from hockey-reference.com for all NHL teams
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import csv
from typing import List, Dict, Optional
from datetime import datetime
import os

# NHL Team Abbreviations
NHL_TEAMS = [
    'ANA', 'ARI', 'BOS', 'BUF', 'CGY', 'CAR', 'CHI', 'COL', 'CBJ', 'DAL',
    'DET', 'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NSH', 'NJD', 'NYI', 'NYR',
    'OTT', 'PHI', 'PIT', 'SJS', 'SEA', 'STL', 'TBL', 'TOR', 'UTA', 'VAN',
    'VEG', 'WSH', 'WPG'
]

BASE_URL = "https://www.hockey-reference.com/teams/{team}/{year}_gamelog.html"


def get_current_season_year() -> int:
    """Get the current NHL season year (e.g., 2026 for 2025-26 season)"""
    now = datetime.now()
    # NHL season typically starts in October, so if we're past October, use next year
    if now.month >= 10:
        return now.year + 1
    return now.year


def scrape_team_gamelog(team: str, year: int, delay: float = 1.0) -> List[Dict]:
    """
    Scrape game log data for a specific team and season
    
    Args:
        team: Team abbreviation (e.g., 'VAN')
        year: Season year (e.g., 2026 for 2025-26 season)
        delay: Delay between requests in seconds
        
    Returns:
        List of dictionaries containing game data
    """
    url = BASE_URL.format(team=team, year=year)
    
    print(f"Scraping {team} {year-1}-{year} season...")
    
    try:
        # Add headers to mimic a browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Try lxml first, fall back to html.parser if not available
        try:
            soup = BeautifulSoup(response.content, 'lxml')
        except Exception:
            # Fall back to built-in html.parser
            soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find the table with id="team_games"
        table = soup.find('table', {'id': 'team_games'})
        
        if not table:
            print(f"  Warning: Table not found for {team}")
            return []
        
        games = []
        tbody = table.find('tbody')
        
        if not tbody:
            print(f"  Warning: Table body not found for {team}")
            return []
        
        # Get all rows in tbody (excluding header rows)
        rows = tbody.find_all('tr')
        
        for row in rows:
            # Skip header rows
            if 'thead' in row.get('class', []):
                continue
            
            # Skip rows that don't have game data (empty or future games)
            cells = row.find_all(['th', 'td'])
            if len(cells) < 5:
                continue
            
            # Extract data from each cell using data-stat attributes
            game_data = {
                'team': team,
                'season': f"{year-1}-{year}",
                'rank': _get_cell_text(row, 'ranker'),
                'game_num': _get_cell_text(row, 'team_game_num_season'),
                'date': _get_cell_text(row, 'date'),
                'game_location': _get_cell_text(row, 'game_location'),  # @ for away, empty for home
                'opponent': _get_cell_text(row, 'opp_name_abbr'),
                'result': _get_cell_text(row, 'team_game_result'),  # W, L, T
                'goals_for': _get_cell_text(row, 'goals'),
                'goals_against': _get_cell_text(row, 'goals_against'),
                'overtime': _get_cell_text(row, 'overtimes'),  # OT, SO, or empty
                'shots': _get_cell_text(row, 'shots'),
                'penalty_minutes': _get_cell_text(row, 'pen_min'),
                'power_play_goals': _get_cell_text(row, 'goals_pp'),
                'power_play_opportunities': _get_cell_text(row, 'chances_pp'),
                'short_handed_goals': _get_cell_text(row, 'goals_sh'),
                'shots_against': _get_cell_text(row, 'shots_against'),
                'opp_penalty_minutes': _get_cell_text(row, 'opp_pen_min'),
                'opp_power_play_goals': _get_cell_text(row, 'goals_against_pp'),
                'opp_power_play_opportunities': _get_cell_text(row, 'opp_chances_pp'),
                'opp_short_handed_goals': _get_cell_text(row, 'goals_against_sh'),
                'faceoff_wins': _get_cell_text(row, 'faceoff_wins'),
                'faceoff_losses': _get_cell_text(row, 'faceoff_losses'),
                'faceoff_percentage': _get_cell_text(row, 'faceoff_percentage'),
                'corsi_for': _get_cell_text(row, 'tm_5on5_corsi_for'),
                'corsi_against': _get_cell_text(row, 'tm_gm_5on5_corsi_against'),
                'corsi_percentage': _get_cell_text(row, 'tm_gm_5on5_corsi_pct'),
                'fenwick_for': _get_cell_text(row, 'tm_5on5_fenwick_for'),
                'fenwick_against': _get_cell_text(row, 'tm_gm_5on5_fenwick_against'),
                'fenwick_percentage': _get_cell_text(row, 'tm_gm_5on5_fenwick_pct'),
                'offensive_zone_start_pct': _get_cell_text(row, 'tm_5on5_zs_offense_pct'),
                'pdo': _get_cell_text(row, 'tm_5on5_pdo_team')
            }
            
            # Add games that have been played (have a result and goals)
            # OR future games (have date and opponent but no result yet)
            # Note: goals_for can be '0' for a shutout, so we check if it's not None/empty
            has_result = game_data['result'] is not None and game_data['result'] != ''
            has_goals = (game_data['goals_for'] is not None and 
                        game_data['goals_against'] is not None)
            has_basic_info = game_data['date'] and game_data['opponent']
            
            # Include played games (with results) OR future games (without results)
            if has_basic_info:
                if has_result and has_goals:
                    # Past game with complete data
                    games.append(game_data)
                elif not has_result:
                    # Future game (no result yet) - include it!
                    # For future games, goals will be None/empty, which is fine
                    games.append(game_data)
        
        print(f"  Found {len(games)} games for {team}")
        
        # Rate limiting
        time.sleep(delay)
        
        return games
        
    except requests.exceptions.RequestException as e:
        print(f"  Error fetching data for {team}: {e}")
        return []
    except Exception as e:
        print(f"  Error parsing data for {team}: {e}")
        return []


def _get_cell_text(row, data_stat: str) -> Optional[str]:
    """
    Extract text from a cell with a specific data-stat attribute
    
    Handles:
    - Cells with links (extracts link text)
    - Empty cells (returns None)
    - Cells with class 'iz' (invisible/zero, returns '0' or None)
    """
    cell = row.find(['th', 'td'], {'data-stat': data_stat})
    if not cell:
        return None
    
    # Check if cell has 'iz' class (invisible/zero value)
    if 'iz' in cell.get('class', []):
        # For numeric stats, return '0', otherwise None
        numeric_stats = ['goals', 'goals_against', 'goals_pp', 'goals_sh', 
                        'goals_against_pp', 'goals_against_sh', 'shots', 
                        'shots_against', 'pen_min', 'opp_pen_min']
        if data_stat in numeric_stats:
            return '0'
        return None
    
    # Handle links - get the text from the link if it exists
    link = cell.find('a')
    if link:
        text = link.get_text(strip=True)
        return text if text else None
    
    # Get text directly from cell
    text = cell.get_text(strip=True)
    
    # Return None for empty strings
    return text if text else None


def scrape_all_teams(year: Optional[int] = None, delay: float = 1.0) -> List[Dict]:
    """
    Scrape game log data for all NHL teams for a single season
    
    Args:
        year: Season year (defaults to current season)
        delay: Delay between requests in seconds
        
    Returns:
        List of all game dictionaries
    """
    if year is None:
        year = get_current_season_year()
    
    all_games = []
    
    print(f"Scraping NHL game logs for {year-1}-{year} season...")
    print(f"Total teams: {len(NHL_TEAMS)}\n")
    
    for i, team in enumerate(NHL_TEAMS, 1):
        print(f"[{i}/{len(NHL_TEAMS)}] ", end="")
        games = scrape_team_gamelog(team, year, delay)
        all_games.extend(games)
    
    print(f"\nTotal games scraped for {year-1}-{year}: {len(all_games)}")
    return all_games


def scrape_multiple_seasons(years: List[int], delay: float = 1.0) -> List[Dict]:
    """
    Scrape game log data for all NHL teams across multiple seasons
    
    Args:
        years: List of season years to scrape (e.g., [2026, 2025, 2024, 2023, 2022])
        delay: Delay between requests in seconds
        
    Returns:
        List of all game dictionaries from all seasons
    """
    all_games = []
    total_seasons = len(years)
    
    print("=" * 60)
    print(f"Scraping {total_seasons} seasons for all NHL teams")
    print(f"Seasons: {', '.join([f'{y-1}-{y}' for y in years])}")
    print("=" * 60)
    print()
    
    for season_idx, year in enumerate(years, 1):
        print(f"\n{'='*60}")
        print(f"SEASON {season_idx}/{total_seasons}: {year-1}-{year}")
        print(f"{'='*60}\n")
        
        season_games = scrape_all_teams(year=year, delay=delay)
        all_games.extend(season_games)
        
        print(f"\n✓ Completed {year-1}-{year} season: {len(season_games)} games")
        
        # Extra delay between seasons
        if season_idx < total_seasons:
            print(f"Waiting {delay * 2:.1f}s before next season...\n")
            time.sleep(delay * 2)
    
    return all_games


def get_past_seasons(num_seasons: int = 5) -> List[int]:
    """
    Get list of season years for the past N seasons (including current)
    
    Args:
        num_seasons: Number of seasons to include (default: 5)
        
    Returns:
        List of season years, most recent first
    """
    current_year = get_current_season_year()
    return [current_year - i for i in range(num_seasons)]


def save_to_json(games: List[Dict], filename: str = "nhl_games.json"):
    """Save game data to JSON file"""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(games, f, indent=2, ensure_ascii=False)
    print(f"Data saved to {filename}")


def save_to_csv(games: List[Dict], filename: str = "nhl_games.csv"):
    """Save game data to CSV file"""
    if not games:
        print("No games to save")
        return
    
    fieldnames = games[0].keys()
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(games)
    print(f"Data saved to {filename}")


def main():
    """Main function to run the scraper"""
    print("=" * 60)
    print("NHL Score Predictor - Data Scraper")
    print("=" * 60)
    print(f"Target URL pattern: {BASE_URL}")
    print("=" * 60)
    print()
    
    # Get past 5 seasons (current + 4 previous)
    seasons = get_past_seasons(num_seasons=5)
    
    # Scrape all teams for all seasons
    all_games = scrape_multiple_seasons(seasons, delay=1.5)
    
    if all_games:
        # Create filename with season range
        start_season = seasons[-1] - 1  # Oldest season start year
        end_season = seasons[0]  # Most recent season end year
        
        # Save to both JSON and CSV
        json_filename = f"nhl_games_{start_season}_{end_season}.json"
        csv_filename = f"nhl_games_{start_season}_{end_season}.csv"
        
        save_to_json(all_games, json_filename)
        save_to_csv(all_games, csv_filename)
        
        print("\n" + "=" * 60)
        print("SCRAPING COMPLETE!")
        print("=" * 60)
        print(f"Total games collected: {len(all_games):,}")
        print(f"Seasons covered: {len(seasons)} ({start_season}-{end_season})")
        print(f"Files created:")
        print(f"  - {json_filename}")
        print(f"  - {csv_filename}")
        print("=" * 60)
        
        # Print summary by season
        print("\nGames per season:")
        for year in seasons:
            season_games = [g for g in all_games if g['season'] == f"{year-1}-{year}"]
            print(f"  {year-1}-{year}: {len(season_games):,} games")
    else:
        print("\nNo games were scraped. Please check your connection and try again.")


if __name__ == "__main__":
    main()
