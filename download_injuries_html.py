"""
Helper script to download and save the injuries HTML page
This uses Playwright to bypass Cloudflare and save the HTML file
"""

try:
    from playwright.sync_api import sync_playwright
    import time
    import os
except ImportError:
    print("ERROR: Playwright not installed. Run: pip install playwright")
    print("Then: python3 -m playwright install chromium")
    exit(1)

INJURY_URL = "https://puckpedia.com/injuries"
OUTPUT_FILE = "injuries.html"

def download_html():
    """Download the injuries page HTML and save it to a file"""
    print("=" * 60)
    print("Downloading Injuries HTML Page")
    print("=" * 60)
    print()
    
    try:
        with sync_playwright() as p:
            print("Launching browser...")
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = context.new_page()
            
            print(f"Loading {INJURY_URL}...")
            page.goto(INJURY_URL, wait_until='domcontentloaded', timeout=60000)
            
            print("Waiting for content to load...")
            try:
                page.wait_for_selector('tbody', timeout=30000, state='attached')
            except:
                print("Waiting additional time for dynamic content...")
                time.sleep(5)
            
            # Get page HTML
            print("Saving HTML...")
            html = page.content()
            browser.close()
        
        # Save to file
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(html)
        
        file_size = os.path.getsize(OUTPUT_FILE) / 1024  # Size in KB
        print(f"\n✅ Successfully saved HTML to: {OUTPUT_FILE}")
        print(f"   File size: {file_size:.1f} KB")
        print(f"\nNow you can run:")
        print(f"   python3 scrape_injuries.py --html-file {OUTPUT_FILE}")
        
    except Exception as e:
        print(f"\n❌ Error downloading HTML: {e}")
        import traceback
        traceback.print_exc()
        print("\n💡 Alternative: Manually save the page:")
        print(f"   1. Open {INJURY_URL} in your browser")
        print(f"   2. Right-click → Save Page As → {OUTPUT_FILE}")
        print(f"   3. Run: python3 scrape_injuries.py --html-file {OUTPUT_FILE}")

if __name__ == "__main__":
    download_html()
