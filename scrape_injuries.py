"""
NHL Score Predictor - Injury Data Scraper

Primary source: ESPN's public injuries JSON endpoint (plain HTTP, no bot
protection, works unattended on CI).
Fallback source: puckpedia.com rendered with Playwright. PuckPedia sits behind
Cloudflare, which intermittently serves a JavaScript challenge that a headless
browser cannot pass, so it is only tried when ESPN fails.
"""

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

from bs4 import BeautifulSoup
import json
import sys
import time
import os
import requests
from typing import Dict, List, Optional
from datetime import datetime

ESPN_INJURIES_URL = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries"

# ESPN uses a few abbreviations that differ from hockey-reference's
ESPN_ABBR_TO_ABBR = {
    'LA': 'LAK',
    'NJ': 'NJD',
    'SJ': 'SJS',
    'TB': 'TBL',
    'VGK': 'VEG',
    'UTAH': 'UTA',
    'ARI': 'UTA',
}

# Mapping from PuckPedia team names to abbreviations
TEAM_NAME_TO_ABBR = {
    'Anaheim Ducks': 'ANA',
    'Arizona Coyotes': 'ARI',
    'Boston Bruins': 'BOS',
    'Buffalo Sabres': 'BUF',
    'Calgary Flames': 'CGY',
    'Carolina Hurricanes': 'CAR',
    'Chicago Blackhawks': 'CHI',
    'Colorado Avalanche': 'COL',
    'Columbus Blue Jackets': 'CBJ',
    'Dallas Stars': 'DAL',
    'Detroit Red Wings': 'DET',
    'Edmonton Oilers': 'EDM',
    'Florida Panthers': 'FLA',
    'Los Angeles Kings': 'LAK',
    'Minnesota Wild': 'MIN',
    'Montreal Canadiens': 'MTL',
    'Nashville Predators': 'NSH',
    'New Jersey Devils': 'NJD',
    'New York Islanders': 'NYI',
    'New York Rangers': 'NYR',
    'Ottawa Senators': 'OTT',
    'Philadelphia Flyers': 'PHI',
    'Pittsburgh Penguins': 'PIT',
    'San Jose Sharks': 'SJS',
    'Seattle Kraken': 'SEA',
    'St. Louis Blues': 'STL',
    'Tampa Bay Lightning': 'TBL',
    'Toronto Maple Leafs': 'TOR',
    'Utah': 'UTA',
    'Utah Hockey Club': 'UTA',
    'Utah Mammoth': 'UTA',
    'Vancouver Canucks': 'VAN',
    'Vegas Golden Knights': 'VEG',
    'Washington Capitals': 'WSH',
    'Winnipeg Jets': 'WPG',
}

# Preferred display name per abbreviation (first entry wins for UTA)
ABBR_TO_TEAM_NAME: Dict[str, str] = {}
for _name, _abbr in TEAM_NAME_TO_ABBR.items():
    ABBR_TO_TEAM_NAME.setdefault(_abbr, _name)
ABBR_TO_TEAM_NAME['UTA'] = 'Utah Mammoth'

# Mapping from logo alt text to full team names
LOGO_ALT_TO_TEAM = {
    'Ducks logo.': 'Anaheim Ducks',
    'Coyotes logo.': 'Arizona Coyotes',
    'Bruins logo.': 'Boston Bruins',
    'Sabres logo.': 'Buffalo Sabres',
    'Flames logo.': 'Calgary Flames',
    'Hurricanes logo.': 'Carolina Hurricanes',
    'Blackhawks logo.': 'Chicago Blackhawks',
    'Avalanche logo.': 'Colorado Avalanche',
    'Blue Jackets logo.': 'Columbus Blue Jackets',
    'Stars logo.': 'Dallas Stars',
    'Red Wings logo.': 'Detroit Red Wings',
    'Oilers logo.': 'Edmonton Oilers',
    'Panthers logo.': 'Florida Panthers',
    'Kings logo.': 'Los Angeles Kings',
    'Wild logo.': 'Minnesota Wild',
    'Canadiens logo.': 'Montreal Canadiens',
    'Predators logo.': 'Nashville Predators',
    'Devils logo.': 'New Jersey Devils',
    'Islanders logo.': 'New York Islanders',
    'Rangers logo.': 'New York Rangers',
    'Senators logo.': 'Ottawa Senators',
    'Flyers logo.': 'Philadelphia Flyers',
    'Penguins logo.': 'Pittsburgh Penguins',
    'Sharks logo.': 'San Jose Sharks',
    'Kraken logo.': 'Seattle Kraken',
    'Blues logo.': 'St. Louis Blues',
    'Lightning logo.': 'Tampa Bay Lightning',
    'Maple Leafs logo.': 'Toronto Maple Leafs',
    'Utah logo.': 'Utah',
    'Canucks logo.': 'Vancouver Canucks',
    'Golden Knights logo.': 'Vegas Golden Knights',
    'Capitals logo.': 'Washington Capitals',
    'Jets logo.': 'Winnipeg Jets',
    'Mammoth logo.': 'Utah',  # Utah Mammoth
}

# Mapping from PuckPedia team URL slugs to abbreviations
TEAM_SLUG_TO_ABBR = {
    'anaheim-ducks': 'ANA',
    'arizona-coyotes': 'ARI',
    'boston-bruins': 'BOS',
    'buffalo-sabres': 'BUF',
    'calgary-flames': 'CGY',
    'carolina-hurricanes': 'CAR',
    'chicago-blackhawks': 'CHI',
    'colorado-avalanche': 'COL',
    'columbus-blue-jackets': 'CBJ',
    'dallas-stars': 'DAL',
    'detroit-red-wings': 'DET',
    'edmonton-oilers': 'EDM',
    'florida-panthers': 'FLA',
    'los-angeles-kings': 'LAK',
    'minnesota-wild': 'MIN',
    'montreal-canadiens': 'MTL',
    'nashville-predators': 'NSH',
    'new-jersey-devils': 'NJD',
    'new-york-islanders': 'NYI',
    'new-york-rangers': 'NYR',
    'ottawa-senators': 'OTT',
    'philadelphia-flyers': 'PHI',
    'pittsburgh-penguins': 'PIT',
    'san-jose-sharks': 'SJS',
    'seattle-kraken': 'SEA',
    'st-louis-blues': 'STL',
    'tampa-bay-lightning': 'TBL',
    'toronto-maple-leafs': 'TOR',
    'utah': 'UTA',
    'utah-mammoth': 'UTA',
    'vancouver-canucks': 'VAN',
    'vegas-golden-knights': 'VEG',
    'washington-capitals': 'WSH',
    'winnipeg-jets': 'WPG',
}

INJURY_URL = "https://puckpedia.com/injuries"


def scrape_injuries(use_playwright: bool = True, html_file: str = None) -> Dict[str, int]:
    """
    Scrape injury data from PuckPedia and return injury counts per team
    
    Args:
        use_playwright: Use Playwright to bypass Cloudflare (default: True)
        html_file: Optional path to saved HTML file to parse instead of scraping
        
    Returns:
        Dictionary mapping team abbreviations to injury counts
    """
    injury_counts: Dict[str, int] = {abbr: 0 for abbr in TEAM_NAME_TO_ABBR.values()}
    
    # Get detailed injuries and count them
    injuries = scrape_injuries_detailed(use_playwright=use_playwright, html_file=html_file)
    
    for injury in injuries:
        team = injury.get('team')
        if team in injury_counts:
            injury_counts[team] += 1
    
    return injury_counts


def parse_injuries_from_html(html_content: str) -> List[Dict]:
    """
    Parse injury data from HTML content (can be from saved file or web response)
    
    Args:
        html_content: HTML string to parse
        
    Returns:
        List of injury dictionaries
    """
    injuries = []
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find ALL injuries tables (there are multiple tbody elements for different injury categories)
    tbodies = soup.find_all('tbody', class_='divide-y')
    if not tbodies:
        # Try finding any tbody
        tbodies = soup.find_all('tbody')
    
    if not tbodies:
        print("Warning: No tbody found in HTML")
        return injuries
    
    # Collect all rows from all tbody elements
    all_rows = []
    for tbody in tbodies:
        rows = tbody.find_all('tr')
        all_rows.extend(rows)
    
    print(f"Found {len(tbodies)} injury tables with {len(all_rows)} total rows")
    
    rows = all_rows
    
    for row in rows:
        # Skip group header rows (e.g., "Day to Day", "Week to Week")
        if 'pp_tbodygroup' in row.get('class', []):
            continue
        
        cells = row.find_all(['td', 'th'])
        if len(cells) < 3:
            continue
        
        # Extract player name from first cell (inside <a> tag)
        player_link = cells[0].find('a')
        player_name = player_link.get_text().strip() if player_link else cells[0].get_text().strip()
        
        if not player_name:
            continue
        
        # Extract team from data-content attribute (icon popover)
        team_name = None
        team_abbr = None
        
        # Look for icon with data-content attribute
        icon = row.find('i', class_='fa-magnifying-glass-plus')
        if icon:
            import html as html_module
            data_content = icon.get('data-content', '')
            if data_content:
                decoded = html_module.unescape(data_content)
                # Look for team links in format /team/team-slug
                import re
                team_links = re.findall(r'/team/([^"\']+)', decoded)
                if team_links:
                    team_slug = team_links[0].lower()
                    team_abbr = TEAM_SLUG_TO_ABBR.get(team_slug)
                    if team_abbr:
                        # Find team name from abbreviation
                        for name, abbr in TEAM_NAME_TO_ABBR.items():
                            if abbr == team_abbr:
                                team_name = name
                                break
        
        # Fallback 1: Look for logo image in cell 1 (team logo cell in 6-cell structure)
        # Only check cell 1 to avoid picking up wrong logos from other cells
        if not team_abbr and len(cells) > 1:
            logo_img = cells[1].find('img')
            if logo_img:
                alt_text = logo_img.get('alt', '')
                team_name = LOGO_ALT_TO_TEAM.get(alt_text)
                if team_name:
                    team_abbr = TEAM_NAME_TO_ABBR.get(team_name)
        
        # Fallback 2: Look for team link in player's link (if player link contains team info)
        if not team_abbr and player_link:
            player_href = player_link.get('href', '')
            if '/team/' in player_href:
                import re
                team_slug_match = re.search(r'/team/([^/]+)', player_href)
                if team_slug_match:
                    team_slug = team_slug_match.group(1).lower()
                    team_abbr = TEAM_SLUG_TO_ABBR.get(team_slug)
                    if team_abbr:
                        for name, abbr in TEAM_NAME_TO_ABBR.items():
                            if abbr == team_abbr:
                                team_name = name
                                break
        
        # Extract timeline, status, and reason from cells
        # Structure can be:
        #   5 cells: [Player, Timeline, Status, Reason, Icon]
        #   6 cells: [Player, Logo, Timeline, Status, Reason, Icon]
        timeline = ""
        status = ""
        reason = ""
        
        # Determine cell indices based on structure
        # Check if cell 1 has a logo/image (6-cell structure)
        has_logo_in_cell1 = cells[1].find('img') is not None if len(cells) > 1 else False
        
        if has_logo_in_cell1 and len(cells) >= 6:
            # 6-cell structure: [Player, Logo, Timeline, Status, Reason, Icon]
            timeline_idx = 2
            status_idx = 3
            reason_idx = 4
        else:
            # 5-cell structure: [Player, Timeline, Status, Reason, Icon]
            timeline_idx = 1
            status_idx = 2
            reason_idx = 3
        
        # Extract timeline
        if len(cells) > timeline_idx:
            timeline_cell = cells[timeline_idx]
            # Look for div with font-semibold class (most reliable)
            timeline_div = timeline_cell.find('div', class_='font-semibold')
            if timeline_div:
                timeline = timeline_div.get_text().strip()
            else:
                # Try any div
                timeline_div = timeline_cell.find('div')
                if timeline_div:
                    timeline = timeline_div.get_text().strip()
                else:
                    # Fallback to cell text
                    timeline = timeline_cell.get_text().strip()
        
        # Extract status
        if len(cells) > status_idx:
            status = cells[status_idx].get_text().strip()
        
        # Extract reason
        if len(cells) > reason_idx:
            reason = cells[reason_idx].get_text().strip()
        
        if player_name and team_abbr:
            injuries.append({
                'player': player_name,
                'team': team_abbr,
                'team_name': team_name,
                'timeline': timeline,
                'status': status,
                'reason': reason,
                'scraped_date': datetime.now().isoformat()
            })
    
    # Deduplicate injuries (same player + team combination)
    seen = set()
    unique_injuries = []
    for injury in injuries:
        key = (injury['player'], injury['team'])
        if key not in seen:
            seen.add(key)
            unique_injuries.append(injury)
    
    print(f"Removed {len(injuries) - len(unique_injuries)} duplicate injuries")
    
    return unique_injuries


def _espn_team_abbr(team_obj: dict, team_display_name: Optional[str]) -> Optional[str]:
    """Resolve an ESPN team object / display name to a hockey-reference abbreviation."""
    name = (team_obj or {}).get('displayName') or team_display_name
    if name and name in TEAM_NAME_TO_ABBR:
        return TEAM_NAME_TO_ABBR[name]
    abbr = ((team_obj or {}).get('abbreviation') or '').upper()
    if abbr:
        abbr = ESPN_ABBR_TO_ABBR.get(abbr, abbr)
        if abbr in ABBR_TO_TEAM_NAME:
            return abbr
    return None


def _normalize_espn_timeline(status: str) -> str:
    status = (status or '').strip()
    return {
        'Day-To-Day': 'Day to Day',
        'Injured Reserve': 'Injured Reserve',
        'Out': 'Out',
    }.get(status, status)


def scrape_injuries_espn(max_attempts: int = 3) -> List[Dict]:
    """
    Fetch current NHL injuries from ESPN's public JSON endpoint.

    Returns records in the same shape as the PuckPedia parser so the rest of the
    pipeline (and the frontend) does not care which source produced them.
    Raises on failure so the caller can fall back.
    """
    last_error: Optional[Exception] = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = requests.get(
                ESPN_INJURIES_URL,
                headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'},
                timeout=30,
            )
            response.raise_for_status()
            payload = response.json()
            break
        except Exception as e:  # network error, non-200, invalid JSON
            last_error = e
            print(f"ESPN attempt {attempt}/{max_attempts} failed: {type(e).__name__}: {e}")
            if attempt < max_attempts:
                time.sleep(5 * attempt)
    else:
        raise RuntimeError(f"ESPN injuries request failed: {last_error}")

    injuries: List[Dict] = []
    scraped_at = datetime.now().isoformat()
    for team_entry in payload.get('injuries', []):
        team_display = team_entry.get('displayName')
        for item in team_entry.get('injuries', []) or []:
            athlete = item.get('athlete') or {}
            team_abbr = _espn_team_abbr(athlete.get('team') or {}, team_display)
            if not team_abbr:
                print(f"  Skipping injury with unknown team: {team_display} / {athlete.get('team', {}).get('abbreviation')}")
                continue

            first = (athlete.get('firstName') or '').strip()
            last = (athlete.get('lastName') or '').strip()
            if first and last:
                player = f"{last}, {first}"
            else:
                player = (athlete.get('displayName') or '').strip()
            if not player:
                continue

            details = item.get('details') or {}
            injuries.append({
                'player': player,
                'team': team_abbr,
                'team_name': ABBR_TO_TEAM_NAME.get(team_abbr, team_display),
                'timeline': _normalize_espn_timeline(item.get('status', '')),
                'status': 'OUT',
                'reason': (details.get('type') or item.get('shortComment') or '').strip(),
                'scraped_date': scraped_at,
                'source': 'espn',
            })

    if not injuries:
        raise RuntimeError("ESPN returned a valid response but no injury records")

    print(f"Fetched {len(injuries)} injury records from ESPN")
    return injuries


def _fetch_injury_html_once(p) -> str:
    """Load the injuries page in a fresh headless browser and return its HTML."""
    browser = p.chromium.launch(
        headless=True,
        # Flags that keep headless Chromium stable in containers / CI runners
        args=['--disable-dev-shm-usage', '--no-sandbox', '--disable-gpu'],
    )
    try:
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1366, 'height': 900},
        )
        page = context.new_page()

        print("Loading page...")
        page.goto(INJURY_URL, wait_until='domcontentloaded', timeout=60000)

        # The table is rendered client-side; also give a Cloudflare interstitial
        # time to resolve (it reloads the page on its own).
        print("Waiting for content to load...")
        try:
            page.wait_for_selector('tbody tr', timeout=45000, state='attached')
        except Exception:
            print("Table not found yet, waiting a little longer...")
            page.wait_for_timeout(8000)

        return page.content()
    finally:
        browser.close()


def _scrape_with_playwright(max_attempts: int = 3) -> List[Dict]:
    """
    Fetch and parse the injuries page, retrying with a fresh browser when the
    page crashes, Cloudflare blocks the request, or the table came back empty.
    """
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            with sync_playwright() as p:
                html = _fetch_injury_html_once(p)
            injuries = parse_injuries_from_html(html)
            if injuries:
                return injuries
            title = (html or '')[:2000]
            blocked = 'Just a moment' in title or 'cf-chl' in title or 'challenge-platform' in title
            last_error = 'Cloudflare challenge page returned' if blocked else 'page loaded but no injury rows were found'
            print(f"Attempt {attempt}/{max_attempts}: {last_error}")
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            print(f"Attempt {attempt}/{max_attempts} failed: {last_error}")

        if attempt < max_attempts:
            wait = 10 * attempt
            print(f"Retrying in {wait}s...")
            time.sleep(wait)

    raise RuntimeError(f"Injury scrape failed after {max_attempts} attempts: {last_error}")


def scrape_injuries_detailed(use_playwright: bool = True, html_file: str = None) -> List[Dict]:
    """
    Scrape detailed injury data including player names and status
    
    Args:
        use_playwright: Use Playwright to bypass Cloudflare (default: True)
        html_file: Optional path to saved HTML file to parse instead of scraping
        
    Returns:
        List of injury dictionaries with player, team, status, timeline, reason
    """
    injuries = []
    
    # If HTML file provided, parse from file (EASIEST METHOD - no scraping needed!)
    if html_file:
        try:
            print(f"Parsing injuries from saved HTML file: {html_file}")
            with open(html_file, 'r', encoding='utf-8') as f:
                html_content = f.read()
            injuries = parse_injuries_from_html(html_content)
            print(f"Parsed {len(injuries)} injury records from file")
            return injuries
        except FileNotFoundError:
            print(f"\n❌ Error: File '{html_file}' not found")
            print(f"\nTo save the HTML file:")
            print(f"  1. Open https://puckpedia.com/injuries in your browser")
            print(f"  2. Right-click on the page → 'Save Page As'")
            print(f"  3. Save it as 'injuries.html' in: {os.getcwd()}")
            print(f"  4. Run: python3 scrape_injuries.py --html-file injuries.html")
            print(f"\nOr provide the full path to your HTML file:")
            print(f"  python3 scrape_injuries.py --html-file /path/to/injuries.html")
            return injuries
        except Exception as e:
            print(f"Error parsing HTML file: {e}")
            import traceback
            traceback.print_exc()
            return injuries
    
    # Primary source: ESPN JSON (reliable, no browser needed)
    try:
        print(f"Fetching injury data from ESPN ({ESPN_INJURIES_URL})...")
        return scrape_injuries_espn()
    except Exception as e:
        print(f"ESPN source failed: {e}")
        print("Falling back to PuckPedia...")

    if not PLAYWRIGHT_AVAILABLE and use_playwright:
        print("ERROR: Playwright not available for the PuckPedia fallback. Install with: pip install playwright")
        print("Then run: playwright install chromium")
        print("\n💡 EASIER METHOD: Save the HTML page manually and use:")
        print("   python scrape_injuries.py --html-file injuries.html")
        return injuries
    
    try:
        print(f"Scraping detailed injury data from {INJURY_URL}...")
        
        if use_playwright:
            print("Using Playwright to bypass Cloudflare protection...")
            injuries = _scrape_with_playwright(max_attempts=3)
            print(f"Scraped {len(injuries)} injury records")
        else:
            # Fallback to requests (will likely fail with 403)
            import requests
            session = requests.Session()
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            response = session.get(INJURY_URL, headers=headers, timeout=15)
            response.raise_for_status()
            injuries = parse_injuries_from_html(response.text)
            print(f"Scraped {len(injuries)} injury records")
        
    except Exception as e:
        print(f"Error scraping injury data: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 TIP: Save the HTML page manually and use:")
        print("   python scrape_injuries.py --html-file injuries.html")
        print("\nTo save HTML:")
        print("   1. Open https://puckpedia.com/injuries in your browser")
        print("   2. Right-click → Save Page As → injuries.html")
        print("   3. Run: python scrape_injuries.py --html-file injuries.html")
    
    return injuries


def save_injury_counts(injury_counts: Dict[str, int], filename: str = "nhl_injuries.json"):
    """Save injury counts to JSON file"""
    with open(filename, 'w') as f:
        json.dump(injury_counts, f, indent=2)
    print(f"Injury counts saved to {filename}")


def save_injury_details(injuries: List[Dict], filename: str = "nhl_injuries_detailed.json"):
    """Save detailed injury data to JSON file"""
    with open(filename, 'w') as f:
        json.dump(injuries, f, indent=2)
    print(f"Detailed injury data saved to {filename}")


def main():
    """Main function to run the injury scraper"""
    import sys
    
    print("=" * 60)
    print("NHL Score Predictor - Injury Data Scraper")
    print("=" * 60)
    print()
    
    # Check for HTML file argument
    html_file = None
    if '--html-file' in sys.argv:
        idx = sys.argv.index('--html-file')
        if idx + 1 < len(sys.argv):
            html_file = sys.argv[idx + 1]
    
    # Scrape detailed injury data
    injuries = scrape_injuries_detailed(use_playwright=True, html_file=html_file)
    
    if injuries:
        # Calculate injury counts per team
        injury_counts: Dict[str, int] = {abbr: 0 for abbr in TEAM_NAME_TO_ABBR.values()}
        for injury in injuries:
            team = injury.get('team')
            if team in injury_counts:
                injury_counts[team] += 1
        
        # Save both detailed and summary data
        save_injury_details(injuries, "nhl_injuries_detailed.json")
        save_injury_counts(injury_counts, "nhl_injuries.json")
        
        print("\n" + "=" * 60)
        print("INJURY SCRAPING COMPLETE!")
        print("=" * 60)
        print(f"Total injured players: {len(injuries)}")
        print(f"\nInjuries per team:")
        for team, count in sorted(injury_counts.items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                print(f"  {team}: {count}")
        print("=" * 60)
    else:
        # Do NOT overwrite the existing files: yesterday's injuries are far more
        # useful than an all-zeros template. Signal failure to the caller instead.
        print("\nNo injury data was scraped. Existing nhl_injuries*.json files were left unchanged.")
        if not os.path.exists("nhl_injuries.json"):
            empty_counts: Dict[str, int] = {abbr: 0 for abbr in TEAM_NAME_TO_ABBR.values()}
            save_injury_counts(empty_counts, "nhl_injuries.json")
            print("Created an empty nhl_injuries.json so the site can still start.")
        sys.exit(1)


if __name__ == "__main__":
    main()
