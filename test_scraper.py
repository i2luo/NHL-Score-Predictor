"""
Test script to verify the scraper works with a single team
Run this to test before scraping all teams and seasons
"""

from scraper import scrape_team_gamelog, get_current_season_year, get_past_seasons

def test_single_team_single_season():
    """Test scraping a single team for current season"""
    year = get_current_season_year()
    team = 'VAN'
    
    print(f"Testing scraper with {team} for {year-1}-{year} season...")
    print("=" * 60)
    
    games = scrape_team_gamelog(team, year, delay=1.0)
    
    if games:
        print(f"\n✓ Successfully scraped {len(games)} games")
        print("\nSample game data (first game):")
        print("-" * 60)
        for key, value in games[0].items():
            print(f"  {key}: {value}")
        print("-" * 60)
        return True
    else:
        print("\n✗ No games found. Check your connection or try a different team/year.")
        return False


def test_single_team_multiple_seasons():
    """Test scraping a single team for past 5 seasons"""
    team = 'VAN'
    seasons = get_past_seasons(num_seasons=5)
    
    print(f"Testing scraper with {team} for past 5 seasons...")
    print(f"Seasons: {', '.join([f'{y-1}-{y}' for y in seasons])}")
    print("=" * 60)
    
    all_games = []
    for year in seasons:
        print(f"\nScraping {year-1}-{year}...")
        games = scrape_team_gamelog(team, year, delay=1.0)
        all_games.extend(games)
        print(f"  Found {len(games)} games")
    
    if all_games:
        print(f"\n✓ Successfully scraped {len(all_games)} total games across 5 seasons")
        print("\nGames per season:")
        for year in seasons:
            season_games = [g for g in all_games if g['season'] == f"{year-1}-{year}"]
            print(f"  {year-1}-{year}: {len(season_games)} games")
        return True
    else:
        print("\n✗ No games found. Check your connection or try a different team/year.")
        return False

if __name__ == "__main__":
    # Test with single season first
    print("TEST 1: Single team, single season")
    print("=" * 60)
    test_single_team_single_season()
    
    print("\n\n" + "=" * 60)
    print("TEST 2: Single team, multiple seasons")
    print("=" * 60)
    test_single_team_multiple_seasons()
