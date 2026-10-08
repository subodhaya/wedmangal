# Retired scrapers — do not run

These scripts created the 784 imported listings of 2026-03-28 (`vendor_scraper.py`) or are earlier variants of it.
They wrote unreviewed Google Places data straight into production `Product`, `Service`, `ServiceImage`, `Review`
and `User` rows: placeholder owner accounts (`@bookyourcelebrations.com`), `is_approved=True`, the fallback phone
`9999999999`, default opening hours, template services, and copied Google reviews.

Every file starts with `raise SystemExit(...)`, so running or importing it does nothing. They are kept only as a
record of how the existing data was made. New vendor data goes into the isolated `VendorProspect` table — see
`docs/prospects.md`.

**Security:** `import_places.py` contained a Google API key in git history (first committed 2026-03-26). Removing it
from the file does not revoke it. The key must be revoked/rotated in Google Cloud; until then treat it as compromised.
