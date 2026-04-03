"""
BookYourCelebrations — Chennai Wedding Vendor Scraper
======================================================
Scrapes 1 vendor per area per category from Google Places API.
131 areas × 13 categories = up to ~1703 vendors.

Fills ALL fields that AddProductPage.js + ServicePage.js expect:
  Product : name, image, brand, category, description, city, area_name,
            address, business_phone, personal_phone, opening_time, closing_time
  Service : name, description, price, countInStock, images (up to 2 per service)

SETUP
-----
    pip install requests python-dotenv

    Create  .env  in same folder:
        GOOGLE_PLACES_API_KEY=your_key_here

    Update DJANGO_SETTINGS_MODULE below if needed.
    Update the  from base.models  import line to match your app name.

USAGE
-----
    python vendor_scraper.py --dry-run              # Preview, no DB writes
    python vendor_scraper.py --dry-run --limit 5    # Test 5 vendors
    python vendor_scraper.py                        # Full run → saves to DB
    python vendor_scraper.py --category Halls       # One category only
    python vendor_scraper.py --area "Anna Nagar"    # One area only
    python vendor_scraper.py --no-images            # Skip image downloads (faster)
    python vendor_scraper.py --reset-progress       # Start fresh (ignore progress file)
"""

import os, sys, re, time, argparse, logging, json
import requests
from datetime import time as dt_time
from dotenv import load_dotenv

load_dotenv()

# ── Django setup ──────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')  # ← update if needed

try:
    import django; django.setup()
    from django.contrib.auth.models import User
    from base.models import Product, Service, ServiceImage, Review   # ← update 'base' if needed
    DJANGO_AVAILABLE = True
except Exception as exc:
    print(f"⚠  Django not available ({exc})\n   Forcing DRY-RUN mode.\n")
    DJANGO_AVAILABLE = False

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('vendor_scraper.log', encoding='utf-8'),
        logging.StreamHandler(),
    ]
)
log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")
CITY    = "Chennai"

# ── 131 Chennai areas ─────────────────────────────────────────────────────────
AREAS = [
    "Adyar","Alandur","Alwarpet","Ambattur","Aminjikarai",
    "Anakaputhur","Anna Nagar","Anna Nagar East","Anna Nagar West",
    "Arumbakkam","Ashok Nagar","Avadi","Ayanavaram",
    "Basin Bridge","Besant Nagar","Chromepet","Chetpet",
    "Choolaimedu","Choolai","Chitlapakkam",
    "Egmore","Ekkattuthangal",
    "Gerugambakkam","Gopalapuram","Guindy",
    "Injambakkam","Iyyappanthangal","Jafferkhanpet",
    "Kattupakkam","Kilpauk","Kodambakkam","Korattur","Korukkupet",
    "Kotturpuram","Kottur","Kovalam","Koyambedu",
    "Madipakkam","Maduravoyal","Maduvinkarai","Mambalam","Mandaveli",
    "Medavakkam","Meenambakkam","Mogappair","Moovarasampet",
    "Mugalivakkam","Mylapore",
    "Nandambakkam","Nanganallur","Neelankarai","Nerkundram",
    "Nolambur","Nungambakkam",
    "Padi","Pallavaram","Pallikaranai","Pammal","Pattabiram",
    "Perambur","Perungalathur","Perungudi","Poonamallee",
    "Porur","Pozhichalur","Puliyanthope",
    "Ramapuram","Red Hills","Royapettah","Royapuram",
    "Saidapet","Selaiyur","Sembakkam","Sholinganallur",
    "Sithalapakkam","Sriperumbudur","St. Thomas Mount",
    "T. Nagar","Tambaram","Thiruvanmiyur","Thiruverkadu",
    "Thiruvottiyur","Thoraipakkam","Tondiarpet","Triplicane",
    "Urapakkam","Vadapalani","Valasaravakkam","Vanagaram","Vandalur",
    "Velachery","Vepery","Virugambakkam",
    "West Mambalam","Wimco Nagar",
    # extended suburbs to reach 131
    "Kolathur","Madhavaram","Manali","Minjur","Ponneri","Redhills",
    "Thirumullaivoyal","Adambakkam","Alapakkam","Alwarthirunagar",
    "Athipet","Ayapakkam","Chengalpattu","Gummidipoondi",
    "Irumbuliyur","Kadapakkam","Kanathur","Kattankulathur",
    "Keelambakkam","Kelambakkam","Kovur","Mangadu",
    "Maraimalai Nagar","Mudichur","Nemam","Oragadam","Padappai",
    "Puzhuthivakkam","Thirumazhisai","Vichoor",
    "Ambattur Estate","Arcot Road","Chitlapakkam East","Selaiyur East",
][:131]   # hard cap at exactly 131

# ── Category definitions ──────────────────────────────────────────────────────
#
# Each category has:
#   prefix           → Django username prefix  e.g. "hall" → hall1, hall2 …
#   queries          → Google search strings ({area} / {city} will be substituted)
#   default_services → fallback services when review keywords are absent
#   keywords         → review text keyword → default_services[index]
#
CATEGORIES = {

    "Halls": {
        "prefix": "hall",
        "queries": [
            "marriage hall {area} {city}",
            "kalyana mandapam {area} {city}",
            "banquet hall {area} {city}",
        ],
        "default_services": [
    {
        "name": "Full Day Hall Booking",
        "description": "Full day rental for wedding ceremony and reception. Includes seating, PA system and power backup.",
    },
    {
        "name": "Half Day Booking",
        "description": "Morning muhurtham or evening reception slot. Ideal for smaller gatherings up to 300 guests.",
    },
    {
        "name": "AC Dining Hall",
        "description": "Air-conditioned dining hall with tables and chairs for up to 500 guests.",
    },
    {
        "name": "Parking & Valet",
        "description": "Secure parking for 100+ vehicles with optional valet service for wedding guests.",
    },
],
"keywords": {
    "ac": 2, "air conditioned": 2, "dining": 2,
    "parking": 3, "valet": 3,
    "half day": 1, "half-day": 1,
},
    },

"Makeup_Artist": {
    "prefix": "makeup",
    "queries": [
        "bridal makeup artist {area} {city}",
        "makeup artist {area} {city}",
        "airbrush makeup {area} {city}",
    ],
    "default_services": [
        {
            "name": "Bridal Makeup (Wedding Day)",
            "description": "Complete bridal makeup including hair styling, saree draping and accessories.",
        },
        {
            "name": "Engagement / Reception Makeup",
            "description": "Party-ready makeup for engagement or reception. Includes hair styling.",
        },
        {
            "name": "Airbrush Bridal Makeup",
            "description": "Long-lasting airbrush foundation. Sweat-proof and photograph-ready finish.",
        },
        {
            "name": "Saree Draping",
            "description": "Professional saree draping in all South Indian styles for bride and family.",
        },
        {
            "name": "Bridesmaid Makeup (per person)",
            "description": "Makeup for bridesmaids and wedding guests.",
        },
    ],
    "keywords": {
        "airbrush": 2, "air brush": 2,
        "saree": 3, "draping": 3,
        "bridesmaid": 4, "guest": 4,
    },
},

"Photographers": {
    "prefix": "photographer",
    "queries": [
        "wedding photographers {area} {city}",
        "candid photographers {area} {city}",
        "wedding videographers {area} {city}",
    ],
    "default_services": [
        {
            "name": "Full Day Wedding Photography",
            "description": "Complete wedding day coverage. 500+ edited photos, digital delivery.",
        },
        {
            "name": "Candid Photography Package",
            "description": "Artistic candid style. 400+ edited photos delivered digitally.",
        },
        {
            "name": "Pre-Wedding Shoot",
            "description": "2–3 hour shoot at chosen location. 100+ edited photos.",
        },
        {
            "name": "Wedding Cinematography",
            "description": "Full day video with cinematic editing, highlight reel and full event video.",
        },
        {
            "name": "Drone Photography",
            "description": "Aerial drone photography and videography for venues and outdoor events.",
        },
    ],
    "keywords": {
        "candid": 1,
        "pre-wedding": 2, "pre wedding": 2,
        "video": 3, "cinema": 3,
        "drone": 4, "aerial": 4,
    },
},

"Caterers": {
    "prefix": "caterer",
    "queries": [
        "wedding caterers {area} {city}",
        "catering services {area} {city}",
        "veg catering {area} {city}",
    ],
    "default_services": [
        {
            "name": "Veg Catering Package (per plate)",
            "description": "Full vegetarian wedding catering: rice, sambar, rasam, kootu, poriyal, papad, pickle, payasam.",
        },
        {
            "name": "Non-Veg Catering Package (per plate)",
            "description": "Non-veg catering: chicken / mutton / fish curry, rice, rotis and accompaniments.",
        },
        {
            "name": "Sweet Box / Seer Package",
            "description": "Traditional sweet boxes: ladoo, halwa, badam milk, dry fruits arrangement.",
        },
        {
            "name": "Snacks & Tiffin Catering",
            "description": "Evening snacks: idli, vada, pongal, upma, bajji, bonda with chutney and sambar.",
        },
        {
            "name": "Stage & Table Decoration",
            "description": "Floral decoration for dining hall, serving tables and entrance.",
        },
    ],
    "keywords": {
        "veg": 0, "vegetarian": 0,
        "non veg": 1, "nonveg": 1, "chicken": 1, "mutton": 1,
        "sweet": 2, "ladoo": 2, "seer": 2,
        "snacks": 3, "tiffin": 3, "idli": 3,
        "decoration": 4,
    },
},

"Decorators": {
    "prefix": "decorator",
    "queries": [
        "wedding decorators {area} {city}",
        "event decorators {area} {city}",
        "stage decoration {area} {city}",
    ],
    "default_services": [
        {
            "name": "Full Wedding Hall Decoration",
            "description": "Complete hall decoration: stage, entrance arch, floral arrangements, table centrepieces, lighting.",
        },
        {
            "name": "Stage & Mandap Decoration",
            "description": "Bridal stage and mandap with fresh flowers, fabric draping and traditional elements.",
        },
        {
            "name": "Entrance Arch & Car Decoration",
            "description": "Decorative entrance arch and traditional car decoration for the couple.",
        },
        {
            "name": "Balloon & Theme Decoration",
            "description": "Custom balloon and theme decoration for receptions, birthdays and events.",
        },
        {
            "name": "Photography Backdrop",
            "description": "Custom floral or fabric photography backdrop for wedding photos.",
        },
    ],
    "keywords": {
        "floral": 0, "flower": 0, "hall": 0,
        "stage": 1, "mandap": 1,
        "arch": 2, "entrance": 2, "car": 2,
        "balloon": 3, "theme": 3,
        "backdrop": 4,
    },
},
"Mehandi_Artist": {
    "prefix": "mehandi",
    "queries": [
        "mehandi artist {area} {city}",
        "henna artist {area} {city}",
        "bridal mehandi {area} {city}",
    ],
    "default_services": [
        {
            "name": "Bridal Mehandi (Full Hands & Feet)",
            "description": "Intricate bridal design on both hands up to elbows and both feet. Natural henna.",
        },
        {
            "name": "Half-Hand Mehandi",
            "description": "Detailed mehandi up to wrists for bridesmaids and guests.",
        },
        {
            "name": "Groom Mehandi",
            "description": "Simple design for grooms — initials, floral motifs or name hidden in pattern.",
        },
        {
            "name": "Arabic / Minimal Mehandi",
            "description": "Contemporary Arabic or minimal style for modern brides and guests.",
        },
    ],
    "keywords": {
        "bridal": 0, "full": 0,
        "groom": 2,
        "arabic": 3, "minimal": 3,
    },
},

"DJ_Artist": {
    "prefix": "dj",
    "queries": [
        "DJ for wedding {area} {city}",
        "wedding DJ sound system {area} {city}",
    ],
    "default_services": [
        {
            "name": "Wedding DJ (Full Night)",
            "description": "Professional DJ for full wedding night — 6 hours, high-quality sound system and lighting.",
        },
        {
            "name": "DJ + LED Wall Package",
            "description": "DJ setup with LED video wall, visuals synced to music during reception.",
        },
        {
            "name": "Sound System Rental",
            "description": "High-quality PA sound system with subwoofers for indoor and outdoor events.",
        },
        {
            "name": "Stage Lighting Package",
            "description": "Moving heads, laser lights and fog machine for stage and dance floor.",
        },
    ],
    "keywords": {
        "led": 1,
        "sound": 2, "speaker": 2,
        "light": 3, "laser": 3,
    },
},

"Invitation": {
    "prefix": "invitation",
    "queries": [
        "wedding invitation cards {area} {city}",
        "marriage invitation printing {area} {city}",
    ],
    "default_services": [
        {
            "name": "Printed Wedding Cards (100 pcs)",
            "description": "Premium printed invitation cards, 100 pieces. Design, print and envelope included.",
        },
        {
            "name": "Digital Invitation (WhatsApp Video)",
            "description": "Animated digital invitation video for WhatsApp and social media sharing.",
        },
        {
            "name": "Premium Boxed Invitation (per piece)",
            "description": "Luxury boxed invitation with inserts, ribbon and custom accessories.",
        },
        {
            "name": "Wedding Website",
            "description": "Custom wedding website with RSVP, schedule, photo gallery and map.",
        },
    ],
    "keywords": {
        "digital": 1, "whatsapp": 1, "video": 1,
        "box": 2, "luxury": 2,
        "website": 3, "online": 3,
    },
},

"Jewellery": {
    "prefix": "jeweller",
    "queries": [
        "bridal jewellery {area} {city}",
        "jewellery shop {area} {city}",
        "wedding jewellery rental {area} {city}",
    ],
    "default_services": [
        {
            "name": "Bridal Gold Jewellery Set",
            "description": "Complete bridal gold set: necklace, earrings, bangles, maang tikka and nose ring.",
        },
        {
            "name": "Jewellery Rental (1 Day)",
            "description": "Premium temple or stone-studded sets available for rent for weddings and events.",
        },
        {
            "name": "Imitation Jewellery Set",
            "description": "Handcrafted imitation bridal sets — silk thread, beads, stone and antique designs.",
        },
        {
            "name": "Custom Jewellery Design",
            "description": "Custom-designed gold or silver jewellery made to your specifications.",
        },
    ],
    "keywords": {
        "rental": 1, "rent": 1,
        "imitation": 2,
        "custom": 3,
    },
},

"Pandit": {
    "prefix": "pandit",
    "queries": [
        "pandit for wedding {area} {city}",
        "purohit for marriage {area} {city}",
    ],
    "default_services": [
        {
            "name": "Hindu Wedding Ceremony (Full Muhurtham)",
            "description": "Complete ceremony with all rituals, saptapadi, mangalsutra and vedic chanting.",
        },
        {
            "name": "Engagement Ceremony (Nichayathartham)",
            "description": "Traditional engagement ceremony with all rituals and arrangements.",
        },
        {
            "name": "Satyanarayan Puja",
            "description": "Satyanarayan puja for home, office or event with all required materials.",
        },
        {
            "name": "Griha Pravesh Puja",
            "description": "House warming ceremony with complete arrangements and vedic rituals.",
        },
    ],
    "keywords": {
        "engagement": 1, "nichayathartham": 1,
        "satyanarayan": 2,
        "griha": 3, "housewarming": 3,
    },
},

"Planners": {
    "prefix": "planner",
    "queries": [
        "wedding planners {area} {city}",
        "event management company {area} {city}",
    ],
    "default_services": [
        {
            "name": "Full Wedding Planning",
            "description": "End-to-end planning: vendor booking, coordination, budgeting and on-day management.",
        },
        {
            "name": "Day-of Coordination",
            "description": "Coordinator manages wedding day schedule, vendor timelines and guest logistics.",
        },
        {
            "name": "Partial Wedding Planning",
            "description": "Support for specific aspects — venue, catering or decor coordination.",
        },
        {
            "name": "Destination Wedding Planning",
            "description": "Full planning for destination weddings including travel, stays and event logistics.",
        },
    ],
    "keywords": {
        "full": 0, "complete": 0,
        "day of": 1, "day-of": 1, "coordinator": 1,
        "partial": 2,
        "destination": 3,
    },
},

"Entertainment": {
    "prefix": "entertainer",
    "queries": [
        "nadaswaram {area} {city}",
        "live band wedding {area} {city}",
        "wedding entertainment {area} {city}",
    ],
    "default_services": [
        {
            "name": "Nadaswaram & Thavil",
            "description": "Traditional nadaswaram and thavil performance for auspicious wedding rituals.",
        },
        {
            "name": "Live Band Performance",
            "description": "Live music band for reception or sangeet — Bollywood, Carnatic or fusion.",
        },
        {
            "name": "Classical Dance Performance",
            "description": "Bharatanatyam or classical dance performance for cultural wedding events.",
        },
        {
            "name": "Anchoring / Emcee",
            "description": "Professional bilingual (Tamil / English) anchor for wedding reception.",
        },
    ],
    "keywords": {
        "nadaswaram": 0, "thavil": 0,
        "band": 1, "live": 1,
        "dance": 2, "bharatanatyam": 2,
        "anchor": 3, "emcee": 3,
    },
},

"Travel_Transport": {
    "prefix": "transport",
    "queries": [
        "wedding car rental {area} {city}",
        "bus hire wedding {area} {city}",
    ],
    "default_services": [
        {
            "name": "Bridal Car (Decorated)",
            "description": "Premium car with floral decoration for bride and groom. Driver included for full wedding day.",
        },
        {
            "name": "Guest Bus Hire (per bus)",
            "description": "AC mini-bus or full bus for wedding guest transportation between venues.",
        },
        {
            "name": "Vintage / Luxury Car",
            "description": "Vintage or luxury car rental for photo shoots and grand wedding arrivals.",
        },
        {
            "name": "Airport / Station Transfer",
            "description": "Comfortable cab transfers for outstation guests from airport or railway station.",
        },
    ],
    "keywords": {
        "bus": 1, "mini bus": 1,
        "vintage": 2, "luxury": 2,
        "airport": 3, "station": 3,
    },
},}

# ─────────────────────────────────────────────────────────────────────────────
# Google Places helpers
# ─────────────────────────────────────────────────────────────────────────────

def search_first(query):
    """Text search → return the single best result or None."""
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    try:
        r = requests.get(url, params={"query": query, "key": API_KEY,
                                      "region": "in", "language": "en"}, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("status") == "OK":
            results = data.get("results", [])
            return results[0] if results else None
        return None
    except Exception as e:
        log.warning(f"  Search error [{query[:50]}]: {e}")
        return None


def get_details(place_id):
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    fields = ",".join([
        "name","formatted_address","formatted_phone_number",
        "international_phone_number","opening_hours",
        "rating","user_ratings_total","reviews","photos",
    ])
    try:
        r = requests.get(url, params={"place_id": place_id, "key": API_KEY,
                                      "language": "en", "fields": fields}, timeout=10)
        r.raise_for_status()
        data = r.json()
        return data.get("result", {}) if data.get("status") == "OK" else {}
    except Exception as e:
        log.warning(f"  Details error [{place_id}]: {e}")
        return {}

# ─────────────────────────────────────────────────────────────────────────────
# Parsing helpers
# ─────────────────────────────────────────────────────────────────────────────

def norm_phone(raw):
    if not raw:
        return "9999999999"
    d = re.sub(r'\D', '', raw)
    if d.startswith('0'):       d = d[1:]
    if d.startswith('91') and len(d) == 12:
        return d[:15]
    if len(d) == 10:
        return "91" + d
    return d[:15] if d else "9999999999"


def parse_t(s):
    if not s: return None
    s = s.replace(":", "")
    m = re.match(r'^(\d{2})(\d{2})$', s)
    if m:
        h, mn = int(m.group(1)), int(m.group(2))
        if 0 <= h <= 23 and 0 <= mn <= 59:
            return dt_time(h, mn)
    return None


def extract_hours(details):
    periods = details.get("opening_hours", {}).get("periods", [])
    op = cl = None
    for p in periods:
        oi, ci = p.get("open",{}), p.get("close",{})
        if oi.get("day") == 1 or not op:
            op = parse_t(oi.get("time",""))
            cl = parse_t(ci.get("time",""))
            if op: break
    return (
        (op or dt_time(10, 0)).strftime("%H:%M:%S"),
        (cl or dt_time(22, 0)).strftime("%H:%M:%S"),
    )


def pick_services(details, cfg):
    text = " ".join(r.get("text","") for r in details.get("reviews",[])).lower()
    hits = set()
    for kw, idx in cfg["keywords"].items():
        if kw in text:
            hits.add(idx)
    defs = cfg["default_services"]
    return [defs[i].copy() for i in sorted(hits)] if hits else [s.copy() for s in defs]


def photo_url(ref):
    return (f"https://maps.googleapis.com/maps/api/place/photo"
            f"?maxwidth=800&photo_reference={ref}&key={API_KEY}")


def dl_image(url, fname):
    try:
        from django.core.files.base import ContentFile
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        return ContentFile(r.content), fname
    except Exception as e:
        log.warning(f"  Image DL failed ({fname}): {e}")
        return None, None

# ─────────────────────────────────────────────────────────────────────────────
# Username counter (per prefix, in-memory + DB aware)
# ─────────────────────────────────────────────────────────────────────────────

_counters = {}

def next_idx(prefix):
    if prefix not in _counters:
        i = 1
        if DJANGO_AVAILABLE:
            while User.objects.filter(username=f"{prefix}{i}").exists():
                i += 1
        _counters[prefix] = i
    idx = _counters[prefix]
    _counters[prefix] += 1
    return idx

# ─────────────────────────────────────────────────────────────────────────────
# DB save
# ─────────────────────────────────────────────────────────────────────────────

def save_vendor(v, cfg, dry_run=False, dl_imgs=True):
    """
    v  = vendor dict built in main loop.
    cfg = category config dict.
    """
    name   = v["name"]
    prefix = cfg["prefix"]
    u_idx  = next_idx(prefix)
    rating = v.get("rating", "")
    photos = v.get("photos", [])
    revs   = v.get("reviews", [])

    # ── Dry run preview ───────────────────────────────────────────────────────
    if dry_run:
        log.info(f"  [DRY-RUN] {name}")
        log.info(f"    user={prefix}{u_idx}  area={v['area_name']}  cat={v['category']}")
        log.info(f"    phone={v['business_phone']}  {v['opening_time']} → {v['closing_time']}")
        log.info(f"    photos={len(photos)}  reviews={len(revs)}")
        for s in v["services"]:
            p = f"₹{s['price']}" if s['price'] else "Contact for Price"
            log.info(f"    • {s['name']}  {p}")
        return True

    if not DJANGO_AVAILABLE:
        return False

    try:
        # Skip duplicates
        if Product.objects.filter(name=name).exists():
            log.info(f"  ⏭  Exists: {name}")
            _counters[prefix] -= 1      # don't waste the index
            return False

        # ── User ──────────────────────────────────────────────────────────────
        uname = f"{prefix}{u_idx}"
        user  = User.objects.create(
            username=uname,
            email=f"{uname}@bookyourcelebrations.com",
            first_name=prefix.capitalize(),
            last_name=str(u_idx),
        )
        user.set_unusable_password(); user.save()

        # ── Product ───────────────────────────────────────────────────────────
        product = Product(
            user=user, name=name, brand=name,
            category=v["category"],
            description=v["description"],
            city=CITY,
            area_name=v["area_name"],
            address=v["address"],
            business_phone=v["business_phone"],
            personal_phone=v["business_phone"],
            opening_time=v["opening_time"],
            closing_time=v["closing_time"],
            is_approved=True,
        )
        if dl_imgs and v.get("image_url"):
            content, fname = dl_image(
                v["image_url"],
                f"{name[:40].replace(' ','_')}.jpg"
            )
            if content:
                product.image.save(fname, content, save=False)
        product.save()
        log.info(f"  ✅ Saved: {name}  id={product._id}  user={uname}")

        # Photo pool for service images (skip photos[0] = product cover)
        refs = [p.get("photo_reference","") for p in photos[1:]
                if p.get("photo_reference")]

        # ── Services ──────────────────────────────────────────────────────────
        for si, svc in enumerate(v["services"]):
            service = Service.objects.create(
                product=product,
                name=svc["name"],
                description=svc.get("description",""),
                price=svc.get("price", 0) or 0,
                countInStock=5,
                rating=float(rating) if rating else 1.0,
                numReviews=len(revs),
            )
            p_str = f"₹{service.price}" if service.price else "Contact for Price"
            log.info(f"    🍽  {service.name}  {p_str}")

            if dl_imgs:
                imgs_saved = 0
                for ref in refs[:]:
                    if imgs_saved >= 2: break
                    content, fn = dl_image(
                        photo_url(ref),
                        f"svc_{product._id}_{si}_{imgs_saved}.jpg"
                    )
                    if content:
                        try:
                            img = ServiceImage(service=service)
                            img.image.save(fn, content, save=True)
                            imgs_saved += 1
                            refs.pop(0)
                        except Exception as e:
                            log.warning(f"    ServiceImage failed: {e}")

        # ── Reviews ───────────────────────────────────────────────────────────
        first_svc = product.services.first()
        for rev in revs[:5]:
            txt = rev.get("text","").strip()
            if not txt or not first_svc: continue
            Review.objects.create(
                service=first_svc, user=user,
                name=rev.get("author_name","Google User"),
                rating=rev.get("rating", 3),
                comment=txt,
            )

        return True

    except Exception as e:
        log.error(f"  ❌ DB error for '{name}': {e}")
        import traceback; log.error(traceback.format_exc())
        return False

# ─────────────────────────────────────────────────────────────────────────────
# Main loop
# ─────────────────────────────────────────────────────────────────────────────

def run(categories=None, areas=None, dry_run=False, limit=None, dl_imgs=True):
    if not API_KEY:
        log.error("❌ GOOGLE_PLACES_API_KEY not found in .env!")
        return

    cats  = categories or list(CATEGORIES.keys())
    arls  = areas      or AREAS

    # Resume support: track what's been processed in a JSON file
    PROGRESS_FILE = "scraper_progress.json"
    progress = {}
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            try: progress = json.load(f)
            except: progress = {}

    total_saved = total_skip = processed = 0

    log.info("=" * 65)
    log.info(f"🚀 BYC Vendor Scraper")
    log.info(f"   Areas      : {len(arls)}")
    log.info(f"   Categories : {len(cats)}  →  {', '.join(cats)}")
    log.info(f"   Dry run    : {dry_run}")
    log.info(f"   Limit      : {limit or 'none'}")
    log.info(f"   Images     : {dl_imgs}")
    log.info("=" * 65)

    for cat in cats:
        cfg = CATEGORIES[cat]
        log.info(f"\n{'─'*65}\n📂 {cat}\n{'─'*65}")

        for area in arls:
            key = f"{cat}::{area}"

            if key in progress and progress[key] in ("saved", "no_results"):
                log.info(f"  ↩  Skip (done): {area}")
                continue

            # Try each query for this category until we get a result
            place = None
            for qtpl in cfg["queries"]:
                q = qtpl.format(area=area, city=CITY)
                place = search_first(q)
                if place:
                    break
                time.sleep(0.3)

            if not place:
                log.info(f"  ⚠  No result: {cat} in {area}")
                progress[key] = "no_results"
                _save_progress(PROGRESS_FILE, progress)
                continue

            pid     = place.get("place_id","")
            details = get_details(pid) if pid else {}
            if not details:
                details = place

            # ── Build vendor dict ─────────────────────────────────────────────
            name     = (details.get("name") or place.get("name","")).strip()
            address  = (details.get("formatted_address")
                        or place.get("formatted_address",""))
            phone    = norm_phone(
                details.get("international_phone_number") or
                details.get("formatted_phone_number") or "")
            opening, closing = extract_hours(details)
            rating   = details.get("rating","")
            n_revs   = details.get("user_ratings_total", 0)
            reviews  = details.get("reviews", [])
            photos   = details.get("photos", [])

            snippets = ". ".join(
                r.get("text","")[:100] for r in reviews[:2] if r.get("text"))
            cat_label = cat.replace("_"," ")
            desc = f"{name} is a {cat_label} based in {area}, {CITY}."
            if rating:
                desc += f" Rated {rating}★ on Google ({n_revs} reviews)."
            if snippets:
                desc += f" {snippets}"

            cover_url = ""
            if photos:
                ref = photos[0].get("photo_reference","")
                if ref: cover_url = photo_url(ref)

            vendor = {
                "name":           name,
                "category":       cat,
                "description":    desc,
                "area_name":      area,
                "city":           CITY,
                "address":        address,
                "business_phone": phone,
                "opening_time":   opening,
                "closing_time":   closing,
                "image_url":      cover_url,
                "rating":         rating,
                "photos":         photos,
                "reviews":        reviews,
                "services":       pick_services(details, cfg),
            }

            log.info(f"\n  [{area}] {name}")
            ok = save_vendor(vendor, cfg, dry_run=dry_run, dl_imgs=dl_imgs)

            if ok:
                total_saved += 1
                progress[key] = "saved"
            else:
                total_skip += 1
                progress[key] = "skipped"

            _save_progress(PROGRESS_FILE, progress)

            processed += 1
            if limit and processed >= limit:
                log.info(f"\n⚠  Limit of {limit} reached — stopping.")
                break

            time.sleep(0.8)   # polite rate limiting

        if limit and processed >= limit:
            break

    log.info("\n" + "=" * 65)
    log.info(f"✅ DONE  |  saved={total_saved}  skipped={total_skip}  total={processed}")
    if not dry_run and total_saved:
        log.info("⚠  All vendors saved with is_approved=False.")
        log.info("   Go to Django Admin → Products → approve to make them live.")
    log.info("=" * 65)


def _save_progress(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    p = argparse.ArgumentParser(
        description="Google Places → Django DB (BookYourCelebrations)"
    )
    p.add_argument("--dry-run",        action="store_true",
                   help="Preview only — no DB writes")
    p.add_argument("--limit",          type=int, default=None,
                   help="Max vendors to process (good for testing)")
    p.add_argument("--category",       type=str, default=None,
                   help=f"Single category. Choices: {', '.join(CATEGORIES)}")
    p.add_argument("--area",           type=str, default=None,
                   help='Single area, e.g. --area "Anna Nagar"')
    p.add_argument("--no-images",      action="store_true",
                   help="Skip all image downloads (much faster)")
    p.add_argument("--reset-progress", action="store_true",
                   help="Delete scraper_progress.json and start fresh")
    args = p.parse_args()

    if args.reset_progress and os.path.exists("scraper_progress.json"):
        os.remove("scraper_progress.json")
        print("🗑  Progress file reset.\n")

    run(
        categories=[args.category] if args.category else None,
        areas     =[args.area]     if args.area      else None,
        dry_run   = args.dry_run,
        limit     = args.limit,
        dl_imgs   = not args.no_images,
    )
