# Vendor prospects

## Purpose

`VendorProspect` is WedMangal's internal research database of real wedding businesses. It gives us enough real supply to test search and discovery later, without adding placeholder vendors to the public site.

**A prospect is not a WedMangal vendor.**
- It has no account and no public page.
- It never appears in search, sitemap, category pages, vendor pages, discovery or any API.
- Promotion to a public listing is a separate, later decision and is **not implemented**.

## Production isolation

| Guarantee | How it is enforced |
|---|---|
| Separate table | `base_vendorprospect` does not inherit from or change `Product`. Migration 0041 only creates this table. |
| No public reads | Only `models.py`, `prospects.py`, `admin.py` and the two management commands mention `VendorProspect`. A test fails if any other module does. |
| No accounts or listings | The import writes only `VendorProspect`. Tests check that `User`, `Product`, `Service` and `Review` counts are unchanged. |
| Not reachable publicly | Tests: a prospect is absent from `/api/search/`, `/api/products/all`, `/api/products/<id>/`, `/product/<id>`, `/category/<x>` and `/sitemap.xml`. |
| Existing listings never changed | A matching listing is only *recorded* (`matches_product`); the `Product` row is never written. |
| Admin cannot create them by hand | The admin has no Add button, and no action creates or approves a listing. "Ready for outreach" sends nothing. |

## Workflow

```
collect_prospects  →  JSON research file  →  import_prospects  →  VendorProspect
(fetch allowed pages,   (reviewable, kept in      (gates, dedupe,      (Django admin review)
 no DB writes)           pilot/, untracked)        score; no other
                                                   table written)

decision:  new / needs_review / reject / duplicate   (set by the import rules)
           keep / ready_for_outreach / …              (set by a person in the admin; never overwritten by a re-import)
```

Outreach is manual, by the founder. Nothing is sent automatically.

## Model

The fields follow the agreed list, with one addition worth noting: `decision_by` (`auto` / `person`) protects your review decisions on re-import.

| Group | Fields |
|---|---|
| Identity | `business_name`, `normalized_name`, `categories` (existing taxonomy keys; several allowed), `category_evidence` (`{category, kind, quote, source_url}`) |
| Location | `business_area` (one of the 127 supported areas, or blank), `area_status` (`located_in` / `serves` / `unknown`), `service_area`, `city`, `address`, `pincode`, `area_evidence` |
| Contact | `phone` (validated), `website_url`, `website_domain` (only the business's own site) |
| Sources | `source_name`, `source_url`, `source_listing_url`, `sources` (each URL with fetch status and time), `data_source`, `google_place_id`, `research_category`, `research_area` |
| Facts | `rating`, `review_count`, `rating_source`, `description`, `services`, `attributes`, `capacity`, `pricing` |
| Workflow | `scraped_at`, `verification_status`, `decision`, `decision_by`, `quality_passed`, `quality_score`, `quality_failures`, `missing_fields`, `duplicate_of`, `matches_product`, `notes` |

`attributes` uses the same keys and the same rule as `Product.attributes`:
- **a missing key means UNKNOWN**;
- `True` means yes and `False` means no;
- a value is kept only if a source states it, and nothing is ever turned into `False`.

## Hard gates

All must pass; the score never compensates for a failure. Implemented in `base/prospects.evaluate`.

1. **A real business name.**
2. **Explicit category evidence** for every category, taken from the business itself:
   - its name contains a word for the category (e.g. *Kalyana Mahal*, *Caterers*, *Photography*), or
   - its own description on the listing does, or
   - its official site does.
   - A directory filing it under a category is *not* enough. Sulekha files colour labs under "wedding photographers", and restaurants and serviced apartments under "banquet halls". A directory label alone → **Needs review**; no evidence at all → **Reject**.
   - Names that point to a different business (colour lab, photo express, hotel, school, academy…) → **Needs review**.
3. **Located in a supported area.**
   - A comma-separated part of the street address must *be* the area: "Tambaram", "East Tambaram" and "Tambaram West" all count.
   - These do not: "Velachery Main Road", "near Tambaram", or "Serving Chennai".
   - The area recorded is the one the address names. A business found under "Tambaram" but addressed in Selaiyur is recorded as Selaiyur.
   - Otherwise `area_status` is `unknown` or `serves`, and the record goes to **Needs review**.
4. **At least one source page actually fetched** (HTTP 200).
5. **A real phone or a street-level address** (something beyond area and city, plus a PIN code).
   - Placeholder numbers (9999999999, 1234567890, repeated digits…) are discarded and noted.
6. **Not a duplicate** of another prospect.
7. **Not an existing WedMangal listing.**

`quality_passed` is true only when every gate passes (decision **New**). That is what "quality prospect" means.

## Score (0–10, for ranking only)

| Points | Signal |
|---|---|
| +2 | the business's own website |
| +1 | phone |
| +1 | street address |
| +1 | rating with ≥ 5 reviews |
| +1 | description or services |
| +1 per attribute, up to 3 | sourced category attributes |
| +1 | two independent source sites |

`missing_fields` lists what is absent: phone, website, street address, rating, description or services, category attributes, capacity, pricing.

## Deduplication

Checked against other prospects and existing `Product` rows (read only).

**Matching rules:**

| Match | Result |
|---|---|
| Same source listing URL | The same record; it is updated. |
| Same Google place ID, website domain or phone | The same business seen elsewhere; merged into the existing prospect. |
| Same normalised name and the same address | The same business; merged. |
| Same name, different address | A **possible branch**: a separate record, marked Needs review, never merged. |
| Existing listing with the same phone or website, or the same name in the same area | `matches_product` is set and the decision is **Duplicate**. |
| Existing listing with the same name, area unconfirmed | `matches_product` is set and the decision is **Needs review**. |

**When records merge:** the new source is added, and only empty fields are filled. Categories and evidence are combined. Nothing is overwritten.

## Source rules

- **Order of preference:** official website, then official social/business page, then legitimate public directories. Google Places would be used only for discovery and verification, storing just the place ID and a Maps link.
- **Google is not used at the moment:** the only configured key is the exposed one (see below).
- **Never:**
  - bypass a CAPTCHA, login wall, paywall or robots rule;
  - fetch a disallowed or `?` URL;
  - store personal information about individuals;
  - copy customer reviews;
  - invent any field.
- `collect_prospects` reads robots.txt before every request and sends one request every 3 seconds. It identifies itself as `WedMangal-research/1.0` and caches pages, so re-runs don't re-fetch.

| Source (checked 2026-10-09) | Status |
|---|---|
| Sulekha | Used. Robots.txt allows general crawlers and explicitly allows ClaudeBot. |
| Mandap, Weddingz, VenueLook, BookEventz, VenueBookingz, WeddingBazaar | Robots.txt allows them. |
| WedMeGood | Robots.txt blocks AI agents, including Claude. **Not used.** |
| WeddingWire | Robots.txt returns 403. **Not used.** |
| Justdial | Blocks automated access. **Not used.** |

## Category rules

- Only the existing taxonomy (`CUSTOMER_CATEGORIES`) is used; no new categories.
- A business found under several category pages keeps all of them (`categories` is a list). It is never split into several records.
- Event planners, hotels and restaurants are not classified as halls, caterers or decorators unless their own words say so.

## Commands

```bash
# 1. Collect: fetches allowed pages and writes JSON only (no database)
python manage.py collect_prospects --category Halls --area Tambaram --out ../pilot/prospects/tambaram-halls.json

# 2. Check on production without saving, with a per-record report
python manage.py import_prospects ../pilot/prospects/tambaram-halls.json --dry-run --report /tmp/report.json

# 3. Import (safe to repeat)
python manage.py import_prospects ../pilot/prospects/tambaram-halls.json
```

Research files and the page cache live in `pilot/` (untracked).

## Review in the admin

Django admin → **Vendor prospects**.
- **Filters:** decision, quality passed, area status, research category and area, business area, source, verification.
- **Search:** name, address, phone, website.
- **Bulk actions:** Keep, Needs review, Reject, Duplicate, Ready for outreach. Each sets `decision_by = person`.

## The old scraper is retired

These five scripts are retired:

| Script | What it did |
|---|---|
| `backend/vendor_scraper.py` | made the 784 imported listings of 2026-03-28 |
| `backend/google_scraper.py` | earlier variant |
| `backend/backend/google_scraper.py` | earlier variant |
| `backend/import_places.py` | one-off importer (contained the exposed key) |
| `backend/inspect_site.py` | Selenium page saver |

- They now sit in `backend/retired_scrapers/`, and each starts with `raise SystemExit("RETIRED …")`. A test runs every one of them and checks that no rows are written.
- The 784 existing imports are unchanged; cleaning them up is a separate project.

## ⚠️ Google API key: must be revoked

`import_places.py` contained a Google API key, committed to git on 2026-03-26. The same key is in the local `backend/.env`.
- The key has been removed from the file, but **removing it from code does not revoke it**. It remains in git history.
- It must be revoked or rotated in Google Cloud Console (APIs & Services → Credentials), and the new key kept only in `.env`.
- Until then, treat it as compromised.
