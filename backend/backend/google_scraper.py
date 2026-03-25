"""
Google Places Scraper — Caterers in Pallavaram, Chennai
=========================================================
Scrapes catering businesses from Google Places API and saves
them directly into your Django Product + Service models.

SETUP:
    pip install requests python-dotenv

    Create .env file in same folder:
        GOOGLE_PLACES_API_KEY=your_key_here

    Update DJANGO_SETTINGS_MODULE below to match your project.

USAGE:
    python google_scraper.py              # Full run, saves to DB
    python google_scraper.py --dry-run    # Preview only, no DB writes
    python google_scraper.py --limit 5    # Test with 5 businesses only
"""

import os
import sys
import time
import json
import argparse
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

# ─── Django Setup ─────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')  # ← Change if needed

try:
    import django
    django.setup()
    from django.contrib.auth.models import User
    from base.models import Product, Service  # ← Change 'base' to your app name
    DJANGO_AVAILABLE = True
except Exception as e:
    print(f"⚠️  Django not configured ({e})\n    Running in DRY RUN mode.\n")
    DJANGO_AVAILABLE = False

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('google_scraper.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
API_KEY   = os.getenv("GOOGLE_PLACES_API_KEY")
CITY      = "Chennai"
AREA      = "Pallavaram"
CATEGORY  = "Caterers"  # Your Product.category value

# Search queries to run — covers main catering + extra services
SEARCH_QUERIES = [
    "catering services Pallavaram Chennai",
    "wedding caterers Pallavaram Chennai",
    "event catering Pallavaram Chennai",
    "veg catering Pallavaram Chennai",
    "non veg catering Pallavaram Chennai",
    "sweet box catering Pallavaram Chennai",
    "seer box caterers Pallavaram Chennai",
    "wedding decoration catering Pallavaram Chennai",
    "brahmin catering Pallavaram Chennai",
    "outside catering Pallavaram Chennai",
]

# Common catering service packages to create as Service records
# when Google doesn't provide specific service info
DEFAULT_SERVICES = [
    {
        "name": "Veg Catering Package",
        "description": "Full vegetarian wedding/event catering including rice, sambar, rasam, kootu, poriyal, papad, pickle, payasam and more traditional items.",
        "price": 350.00,
    },
    {
        "name": "Non-Veg Catering Package",
        "description": "Non-vegetarian catering package including chicken, mutton or fish curries with rice, rotis and accompaniments.",
        "price": 500.00,
    },
    {
        "name": "Sweet Box / Seer Package",
        "description": "Traditional sweet boxes and seer items for weddings including ladoo, halwa, badam milk, dry fruits arrangement.",
        "price": 250.00,
    },
    {
        "name": "Seer Decoration Package",
        "description": "Seer (wedding tray) decoration service with traditional items beautifully arranged in decorative plates and baskets.",
        "price": 1500.00,
    },
    {
        "name": "Stage & Table Decoration",
        "description": "Floral decoration for dining hall, food serving tables and entrance. Includes banana leaf setup for traditional events.",
        "price": 3000.00,
    },
    {
        "name": "Snacks & Tiffin Catering",
        "description": "Evening snacks catering — idli, vada, pongal, upma, bajji, bonda with chutney and sambar for small events.",
        "price": 150.00,
    },
]

SCRAPER_USERNAME = "google_scraper_bot"

# ─── Google Places API ────────────────────────────────────────────────────────

def search_places(query, next_page_token=None):
    """
    Call Google Places Text Search API.
    Returns list of place results + next_page_token if more pages exist.
    """
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {
        "query": query,
        "key":   API_KEY,
        "region": "in",
        "language": "en",
    }
    if next_page_token:
        params["pagetoken"] = next_page_token

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        status = data.get("status")
        if status == "REQUEST_DENIED":
            log.error(f"❌ API Key error: {data.get('error_message')}")
            return [], None
        if status == "ZERO_RESULTS":
            return [], None
        if status not in ("OK", "ZERO_RESULTS"):
            log.warning(f"Unexpected status: {status}")
            return [], None

        return data.get("results", []), data.get("next_page_token")

    except Exception as e:
        log.error(f"Search API error: {e}")
        return [], None


def get_place_details(place_id):
    """
    Call Google Places Details API to get full info for a business.
    Returns dict with all available fields.
    """
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "key": API_KEY,
        "language": "en",
        "fields": ",".join([
            "name",
            "formatted_address",
            "formatted_phone_number",
            "international_phone_number",
            "opening_hours",
            "rating",
            "user_ratings_total",
            "website",
            "types",
            "vicinity",
            "price_level",
            "reviews",
            "photos",
        ])
    }

    try:
        resp = requests.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

        if data.get("status") != "OK":
            log.warning(f"Details API status: {data.get('status')} for {place_id}")
            return {}

        return data.get("result", {})

    except Exception as e:
        log.error(f"Details API error for {place_id}: {e}")
        return {}


def extract_phone(raw):
    """Normalize phone → 91XXXXXXXXXX format (matches your model + frontend)."""
    if not raw:
        return ""
    import re
    digits = re.sub(r'\D', '', raw)
    if digits.startswith('0'):
        digits = digits[1:]
    if digits.startswith('91') and len(digits) == 12:
        return digits[:15]
    if len(digits) == 10:
        return "91" + digits
    return digits[:15]


def parse_time(time_str):
    """Parse time string like '09:00 AM' or '0900' → Python time object."""
    from datetime import time as dt_time
    if not time_str:
        return None
    import re

    # Format: "9:00 AM"
    match = re.match(r'(\d{1,2}):(\d{2})\s*(AM|PM)', time_str, re.IGNORECASE)
    if match:
        h, m, period = int(match.group(1)), int(match.group(2)), match.group(3).upper()
        if period == 'PM' and h != 12:
            h += 12
        if period == 'AM' and h == 12:
            h = 0
        return dt_time(h, m)

    # Format: "0900"
    match = re.match(r'(\d{2})(\d{2})', time_str)
    if match:
        h, m = int(match.group(1)), int(match.group(2))
        if 0 <= h <= 23 and 0 <= m <= 59:
            return dt_time(h, m)

    return None


def extract_opening_hours(details):
    """Extract opening and closing time from Google Places opening_hours."""
    hours = details.get("opening_hours", {})
    periods = hours.get("periods", [])

    opening = None
    closing  = None

    # Use Monday (day=1) or first available day
    for period in periods:
        open_info  = period.get("open", {})
        close_info = period.get("close", {})
        if open_info.get("day") == 1 or not opening:
            raw_open  = open_info.get("time", "")   # e.g. "0900"
            raw_close = close_info.get("time", "")  # e.g. "2100"

            # Convert "0900" → "09:00"
            if len(raw_open) == 4:
                raw_open = raw_open[:2] + ":" + raw_open[2:]
            if len(raw_close) == 4:
                raw_close = raw_close[:2] + ":" + raw_close[2:]

            opening = parse_time(raw_open)
            closing  = parse_time(raw_close)
            if opening:
                break

    return opening, closing


def build_services_from_reviews(details, business_name):
    """
    Try to detect specific services mentioned in Google reviews.
    Falls back to DEFAULT_SERVICES if nothing specific found.
    """
    reviews = details.get("reviews", [])
    review_text = " ".join(r.get("text", "") for r in reviews).lower()

    detected = []

    # Keywords → service mapping
    service_keywords = {
        "veg":          DEFAULT_SERVICES[0],
        "vegetarian":   DEFAULT_SERVICES[0],
        "non veg":      DEFAULT_SERVICES[1],
        "nonveg":       DEFAULT_SERVICES[1],
        "chicken":      DEFAULT_SERVICES[1],
        "sweet box":    DEFAULT_SERVICES[2],
        "sweetbox":     DEFAULT_SERVICES[2],
        "ladoo":        DEFAULT_SERVICES[2],
        "seer":         DEFAULT_SERVICES[3],
        "decoration":   DEFAULT_SERVICES[4],
        "decor":        DEFAULT_SERVICES[4],
        "snacks":       DEFAULT_SERVICES[5],
        "tiffin":       DEFAULT_SERVICES[5],
        "idli":         DEFAULT_SERVICES[5],
    }

    seen = set()
    for keyword, service in service_keywords.items():
        if keyword in review_text and service["name"] not in seen:
            detected.append(service.copy())
            seen.add(service["name"])

    # If nothing detected from reviews, use all default services
    if not detected:
        log.info(f"    No specific services in reviews — using default catering packages")
        detected = [s.copy() for s in DEFAULT_SERVICES]

    return detected


# ─── Database Save ────────────────────────────────────────────────────────────

def get_or_create_scraper_user():
    if not DJANGO_AVAILABLE:
        return None
    user, created = User.objects.get_or_create(
        username=SCRAPER_USERNAME,
        defaults={"email": "scraper@bookyourcelebration.com"}
    )
    if created:
        user.set_unusable_password()
        user.save()
        log.info(f"Created scraper system user: {SCRAPER_USERNAME}")
    return user


def save_to_db(business, scraper_user, dry_run=False):
    """
    Save one business (Product + Services) to Django database.

    business = {
        name, description, city, area_name, address,
        business_phone, personal_phone,
        opening_time, closing_time,
        google_rating, services: [...]
    }
    """
    name = business.get("name", "").strip()
    if not name:
        return False

    if dry_run:
        log.info(f"\n  [DRY RUN] ✅ {name}")
        log.info(f"    🏷️  Brand    : {business.get('brand')}")
        log.info(f"    📍 Area     : {business.get('area_name')}, {business.get('city')}")
        log.info(f"    🏠 Address  : {business.get('address', '')[:70]}")
        log.info(f"    📞 Phone    : {business.get('business_phone')}")
        log.info(f"    ⭐ Rating   : {business.get('google_rating')}")
        log.info(f"    🕐 Hours    : {business.get('opening_time')} → {business.get('closing_time')}")
        log.info(f"    🖼️  Image    : {'Yes' if business.get('image_url') else 'No'}")
        log.info(f"    🍽️  Services ({len(business.get('services', []))}):")
        for s in business.get("services", []):
            log.info(f"       - {s['name']}  ₹{s['price']}")
        return True

    if not DJANGO_AVAILABLE:
        return False

    try:
        # Skip duplicates
        if Product.objects.filter(name=name).exists():
            log.info(f"  ⏭️  Already exists: {name}")
            return False

        # Create Product
        product = Product(
            user           = scraper_user,
            name           = name,
            brand          = business.get("brand", name),
            category       = CATEGORY,
            description    = business.get("description", ""),
            city           = business.get("city", CITY),
            area_name      = business.get("area_name", AREA),
            address        = business.get("address", ""),
            business_phone = business.get("business_phone", ""),
            personal_phone = business.get("personal_phone", "") or business.get("business_phone", ""),
            opening_time   = business.get("opening_time"),
            closing_time   = business.get("closing_time"),
            is_approved    = False,  # Admin must approve before going live
        )

        # Download and attach Google Places photo
        image_url = business.get("image_url", "")
        if image_url:
            try:
                import requests as req_lib
                from django.core.files.base import ContentFile
                img_resp = req_lib.get(image_url, timeout=10)
                img_resp.raise_for_status()
                ext = "jpg"
                filename = f"{name[:40].replace(' ', '_')}.{ext}"
                product.image.save(filename, ContentFile(img_resp.content), save=False)
                log.info(f"    🖼️  Image downloaded: {filename}")
            except Exception as e:
                log.warning(f"    ⚠️  Image download failed: {e}")

        product.save()
        log.info(f"  ✅ Saved Product: {name}  (id={product._id})")

        # Create Services
        for svc in business.get("services", []):
            service = Service.objects.create(
                product      = product,
                name         = svc["name"],
                description  = svc.get("description", ""),
                price        = svc.get("price", 0.0),
                countInStock = 5,
                rating       = 1.0,
                numReviews   = 0,
            )
            log.info(f"    🍽️  Service: {service.name}  ₹{service.price}")

        return True

    except Exception as e:
        log.error(f"  ❌ DB error for '{name}': {e}")
        return False


# ─── Main Scraper ─────────────────────────────────────────────────────────────

def run(dry_run=False, limit=None):
    if not API_KEY:
        log.error("❌ GOOGLE_PLACES_API_KEY not found in .env file!")
        log.error("   Create .env file with:  GOOGLE_PLACES_API_KEY=your_key_here")
        return

    log.info("=" * 60)
    log.info("🚀 Google Places Scraper — Caterers in Pallavaram, Chennai")
    log.info(f"   Dry run : {dry_run}")
    log.info(f"   Limit   : {limit or 'No limit'}")
    log.info("=" * 60)

    scraper_user = get_or_create_scraper_user()

    # Collect unique places across all search queries
    seen_place_ids = set()
    all_places     = []

    for query in SEARCH_QUERIES:
        log.info(f"\n🔎 Searching: '{query}'")
        next_token = None

        while True:
            results, next_token = search_places(query, next_token)

            for place in results:
                pid = place.get("place_id")
                if pid and pid not in seen_place_ids:
                    seen_place_ids.add(pid)
                    all_places.append(place)
                    log.info(f"   + {place.get('name')}  ({place.get('formatted_address', '')[:60]})")

            # Respect limit
            if limit and len(all_places) >= limit:
                break

            # Google requires 2s delay before using next_page_token
            if next_token:
                log.info("   📄 Loading next page...")
                time.sleep(2)
            else:
                break

        if limit and len(all_places) >= limit:
            all_places = all_places[:limit]
            break

        time.sleep(1)  # polite delay between queries

    log.info(f"\n📊 Total unique businesses found: {len(all_places)}")
    log.info("=" * 60)

    # Process each business
    saved   = 0
    skipped = 0
    failed  = 0

    for i, place in enumerate(all_places, 1):
        place_id = place.get("place_id")
        name     = place.get("name", "Unknown")
        log.info(f"\n[{i}/{len(all_places)}] {name}")

        # Get full details from Places Details API
        details = get_place_details(place_id)
        if not details:
            log.warning(f"  ⚠️  No details returned, using basic info")
            details = place

        # Parse address into components
        full_address = details.get("formatted_address", place.get("formatted_address", ""))

        # area_name: always use AREA constant (Pallavaram) — Google vicinity is unreliable
        area_name = AREA

        # Phone
        phone_raw = (
            details.get("international_phone_number") or
            details.get("formatted_phone_number") or ""
        )
        phone = extract_phone(phone_raw)

        # Opening / closing hours — default 10:00–22:00 if Google has none
        opening_time, closing_time = extract_opening_hours(details)
        from datetime import time as dt_time
        if not opening_time:
            opening_time = dt_time(10, 0)  # 10:00 AM default
        if not closing_time:
            closing_time = dt_time(22, 0)  # 10:00 PM default
        # Convert to "HH:MM:00" string — matches Django TimeField serializer format
        opening_time = opening_time.strftime("%H:%M:%S")
        closing_time = closing_time.strftime("%H:%M:%S")

        # Description — build from rating + review snippets
        rating        = details.get("rating", "")
        total_reviews = details.get("user_ratings_total", 0)
        reviews       = details.get("reviews", [])
        review_snippets = ". ".join(
            r.get("text", "")[:100] for r in reviews[:2] if r.get("text")
        )

        description = f"{name} is a catering service located in {area_name}, {CITY}. "
        if rating:
            description += f"Rated {rating}\u2b50 on Google with {total_reviews} reviews. "
        if review_snippets:
            description += review_snippets

        # Image — fetch first photo from Google Places Photos API
        image_url = ""
        photos = details.get("photos", [])
        if photos:
            photo_ref = photos[0].get("photo_reference", "")
            if photo_ref:
                image_url = (
                    f"https://maps.googleapis.com/maps/api/place/photo"
                    f"?maxwidth=800&photo_reference={photo_ref}&key={API_KEY}"
                )

        # Services
        services = build_services_from_reviews(details, name)

        # Build final business object — matches your setProductData fields exactly
        business = {
            "name":           name,
            "brand":          name,          # brand = same as name
            "image_url":      image_url,     # from Google Photos
            "description":    description,
            "city":           CITY,
            "area_name":      area_name,     # always "Pallavaram"
            "address":        full_address,
            "business_phone": phone,
            "personal_phone": phone,         # same as business phone
            "opening_time":   opening_time,  # "HH:MM:SS" string, default 10:00 AM
            "closing_time":   closing_time,  # "HH:MM:SS" string, default 10:00 PM
            "google_rating":  rating,
            "services":       services,
        }

        # Save to DB
        result = save_to_db(business, scraper_user, dry_run=dry_run)
        if result:
            saved += 1
        else:
            skipped += 1

        # Rate limiting — Google allows 10 requests/second
        time.sleep(0.5)

    # Summary
    log.info("\n" + "=" * 60)
    log.info(f"✅ DONE!")
    log.info(f"   Saved   : {saved}")
    log.info(f"   Skipped : {skipped} (duplicates)")
    log.info(f"   Failed  : {failed}")
    log.info(f"   Total   : {len(all_places)}")
    if not dry_run and saved > 0:
        log.info(f"\n⚠️  Remember: All products saved with is_approved=False")
        log.info(f"   Go to Django Admin to approve them before they go live.")
    log.info("=" * 60)

    # Save results summary to JSON
    log.info(f"\n📄 Full log saved to: google_scraper.log")


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Google Places → Django DB Scraper')
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview data without saving to database')
    parser.add_argument('--limit', type=int, default=None,
                        help='Limit number of businesses (e.g. --limit 5 for testing)')
    args = parser.parse_args()

    run(dry_run=args.dry_run, limit=args.limit)
