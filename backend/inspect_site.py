"""
Site Inspector — Run this FIRST before the main scraper
=========================================================
Saves the rendered HTML of a category page so you can
find the correct CSS selectors.

SETUP:
    pip install selenium webdriver-manager

USAGE:
    python inspect_site.py
    
Then open  output_html/photographers.html  in your browser
and use browser DevTools (F12) to find the right selectors.
"""

import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

try:
    from webdriver_manager.chrome import ChromeDriverManager
    driver_service = Service(ChromeDriverManager().install())
except Exception:
    driver_service = None  # fallback to system chromedriver

BASE_URL = "https://www.bookyourcelebration.com"

PAGES_TO_INSPECT = [
    "/photographers",
    "/entertainment",
    "/banquet-halls",
]

def make_driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    if driver_service:
        return webdriver.Chrome(service=driver_service, options=opts)
    return webdriver.Chrome(options=opts)


def inspect_page(driver, path):
    url = BASE_URL + path
    slug = path.strip("/")
    print(f"\n🔍 Loading: {url}")
    driver.get(url)

    # Wait up to 15s for any content to appear
    try:
        WebDriverWait(driver, 15).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "body *"))
        )
    except Exception:
        pass

    # Extra wait for JS rendering
    time.sleep(4)

    html = driver.page_source
    os.makedirs("output_html", exist_ok=True)
    out_path = f"output_html/{slug}.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  ✅ Saved → {out_path}  ({len(html):,} bytes)")

    # Print all unique class names found (helps identify selectors)
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    
    # Print all <a> tags with hrefs (vendor links)
    print(f"\n  📎 Sample <a> links found:")
    links = soup.find_all("a", href=True)[:20]
    for a in links:
        print(f"     {a['href'][:80]}")

    # Print card-like elements
    print(f"\n  🃏 Elements with 'card' in class:")
    for el in soup.find_all(class_=lambda c: c and 'card' in c.lower())[:10]:
        print(f"     <{el.name} class='{' '.join(el.get('class', []))[:60]}'>")

    # Print elements with 'vendor' or 'business' in class
    print(f"\n  🏢 Elements with 'vendor'/'business' in class:")
    for el in soup.find_all(class_=lambda c: c and any(k in c.lower() for k in ['vendor','business','listing','item']))[:10]:
        print(f"     <{el.name} class='{' '.join(el.get('class', []))[:60]}'>")

    return out_path


def inspect_vendor_detail(driver, url):
    """Inspect a single vendor detail page."""
    print(f"\n🔍 Loading vendor detail: {url}")
    driver.get(url)
    time.sleep(4)

    html = driver.page_source
    os.makedirs("output_html", exist_ok=True)
    slug = url.rstrip("/").split("/")[-1]
    out_path = f"output_html/detail_{slug}.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  ✅ Saved → {out_path}")

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")

    print("\n  📋 Text content preview (first 50 elements):")
    for el in soup.find_all(['h1','h2','h3','h4','p','span','div'])[:50]:
        text = el.get_text(strip=True)
        classes = ' '.join(el.get('class', []))[:40]
        if text and len(text) > 3:
            print(f"     <{el.name} class='{classes}'> {text[:80]}")


def main():
    print("=" * 60)
    print("🚀 BookYourCelebration Site Inspector")
    print("=" * 60)

    driver = make_driver()
    try:
        # Step 1: Inspect listing pages
        all_links = []
        for path in PAGES_TO_INSPECT:
            out = inspect_page(driver, path)

            # Collect first vendor link for detail inspection
            from bs4 import BeautifulSoup
            with open(out) as f:
                soup = BeautifulSoup(f.read(), "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if href.startswith("/") and href.count("/") >= 2 and href != path:
                    all_links.append(BASE_URL + href)
                    break

        # Step 2: Inspect first vendor detail page found
        if all_links:
            print(f"\n{'='*60}")
            print(f"🏢 Inspecting first vendor detail page...")
            inspect_vendor_detail(driver, all_links[0])
        else:
            print("\n⚠️  No vendor detail links found automatically.")
            print("    Open output_html/*.html and copy a vendor URL manually.")

    finally:
        driver.quit()

    print("\n" + "=" * 60)
    print("✅ Inspection complete!")
    print("\nNEXT STEPS:")
    print("  1. Open output_html/ folder")
    print("  2. Open the .html files in your browser")
    print("  3. Use F12 DevTools to find the correct CSS selectors")
    print("  4. Share the selectors / HTML snippets with me")
    print("  5. I'll update scraper.py with the correct selectors")
    print("=" * 60)


if __name__ == "__main__":
    main()
