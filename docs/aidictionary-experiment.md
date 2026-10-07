# AI Dictionary experiment

## 1. Hypothesis

> An evidence-backed, structured knowledge record may improve machine understanding/retrieval of a poorly represented local business.

Null hypothesis: publishing the record makes no measurable difference to how search/AI systems describe or retrieve the business, compared with a similar business that gets no record. A null result is a valid outcome.

## 2. Test entity

| | |
|---|---|
| Vendor | Lotus Banquet Hall, Virugambakkam (WedMangal vendor #789) |
| Vendor page | https://www.wedmangal.com/product/789 |
| AI Dictionary URL | https://www.wedmangal.com/AIDictionary/lotus-banquet-hall-virugambakkam |
| Official website | https://www.lotusbanquethall.com/ |

Why this vendor: it is the "Lotus … Kaliamman Koil" business the experiment was asked about (WedMangal has no "Lotus Mahal"; the listing at Kaliamman Koil Road is Lotus Banquet Hall). It has an official website to verify against, and the baseline below shows that public descriptions of it are already inconsistent — a genuinely "poorly represented" entity.

Implementation: `backend/base/aidictionary.py` (hand-checked fixture + server-rendered HTML + JSON-LD), `views/aidictionary_views.py`, route in `backend/urls.py`, one sitemap entry in `views/sitemap_view.py`, tests in `base/test_aidictionary.py`. The normal vendor page is unchanged.

## 3. Baseline dates

- Baseline round 1: **2026-10-08**, before the page was publicly reachable (see §9).
- Baseline round 2: run again ~7 days later, still before/at publication if possible, to measure normal variation.
- Publication date: **2026-10-08** (first public HTTP 200 after the nginx route was added; commit ecc5bcf).

## 4. Facts included (with status)

Status meanings: **Corroborated** = the business's own website and an independent third-party source agree (WedMangal's own listing never counts as independent). **Stated by the business** = official website only. **WedMangal listing only** = from the WedMangal record.

| Fact | Status | Sources |
|---|---|---|
| Name: Lotus Banquet Hall | Corroborated | Official site, WedMangal, WeddingWire |
| Banquet hall / event venue | Corroborated | Official site, WedMangal, WeddingWire |
| Virugambakkam, Chennai 600092, Tamil Nadu | Corroborated | Official site, WedMangal, WeddingWire |
| Kaliamman Koil Road, Ganapathraj Nagar Main Rd, near Elango Nagar bus stop | Corroborated | Official site, WedMangal, WeddingWire |
| Full address "1/25, Kaliamman Koil Road …" | Stated by the business | Official site |
| Website lotusbanquethall.com | Stated by the business | Official site, WedMangal |
| Phone +91 98845 53290 | Stated by the business | Official site, WedMangal |
| Other phones, emails, GSTIN 33APOPS5189M2ZX | Stated by the business | Official site |
| Event types (weddings, receptions, engagements, birthdays, baby showers, upanayanam, corporate) | Stated by the business | Official site |
| Air-conditioned hall | Corroborated | Official site, WedMangal, WeddingWire |
| Separate dining area | Corroborated | Official site, WedMangal, WeddingWire |
| 2 AC guest rooms; parking for 25 cars; stage/sound/projector/generator; 5,000 sq ft | Stated by the business | Official site |
| Vegetarian catering, outside food allowed | Stated by the business | Official site |
| Package prices and hours | WedMangal listing only | WedMangal |

Discrepancies shown on the page (not resolved): guest capacity (300 seated / 400 floating vs 200 / 500 vs 50–500), catering (outside food allowed vs in-house catering), street number (1/25 vs 1).

Deliberately excluded: year established ("2004" appears only in directory snippets), ratings/reviews, a pool and "24 AC rooms" (directory claims that conflict with the official site), alternate name "SundarShree Mahal" (only a search-result title for lotusbanquethall.co.in, which did not resolve on 2026-10-08), owner, social profiles, areas served.

## 5. Sources used (checked 2026-10-08)

| Source | Type | Supports |
|---|---|---|
| https://www.lotusbanquethall.com/ | Official | name, address, phones, emails, GSTIN, capacity, facilities, catering policy, event types |
| https://www.wedmangal.com/product/789 | WedMangal listing (entered by WedMangal, not yet claimed by the business) | name, address, phone, website, packages, hours |
| https://www.weddingwire.in/kalyana-mandapams/lotus-banquet-hall--e447130 | Third-party directory | name, address, capacity range, AC dining, catering policy |
| Justdial listing (search result only; page returned HTTP 403) | Third-party directory | not used for any fact |

## 6. Structured data

One JSON-LD `@graph`:
- `WebPage` (`@id` …#webpage): `url`, `name`, `description`, `inLanguage`, `about` → business `@id`, `lastReviewed`, `isPartOf` WebSite, `publisher` WedMangal, `citation` (official site, WeddingWire), `breadcrumb`.
- `LocalBusiness` + `EventVenue` (`@id` https://www.wedmangal.com/AIDictionary/lotus-banquet-hall-virugambakkam#business): `name`, `description`, `url` (official site), `telephone`, `email`, `taxID`, `address` (PostalAddress), `amenityFeature` (air-conditioned), `sameAs` (WeddingWire listing).
- `BreadcrumbList`.

Not used (unsupported or conflicting): `AboutPage` (that type is for a page about the site's own organisation), `aggregateRating`, `review`, `award`, `foundingDate`, `founder`, `numberOfEmployees`, `maximumAttendeeCapacity`, `priceRange`, `openingHours`, `areaServed`.

Structured data is one component; Google's guidance is that it helps understanding and disambiguation but guarantees nothing.

## 7. Technical indexing status

- Server-rendered HTML (readable without JavaScript), HTTP 200, `<link rel="canonical">` to the exact URL, `meta robots index, follow`, one `<h1>`, specific `<title>` and meta description, unknown slugs return a real 404.
- robots.txt: allows `/` for all crawlers (incl. Googlebot, Google-Extended, GPTBot); only `/admin/` and `/api/` are disallowed.
- Sitemap: exactly one AI Dictionary URL, lastmod 2026-10-08.
- Internal link: none yet (the vendor page is unchanged on purpose; add one later only as a separate, dated change so its effect can be separated).
- Google Search Console: submit the URL for indexing on publication day and record the date: `____`.

## 8. Queries to test

Ask each query in the same tools (e.g. Google Search incl. AI Overview, ChatGPT with search, Perplexity, Gemini, Claude with web search), logged out / fresh session, same wording, same week. Run every query for TEST and the matching query for CONTROL (swap the name).

**A. Entity identification**
1. Who is Lotus Banquet Hall in Virugambakkam?
2. What is Lotus Banquet Hall, Chennai?
3. Where is Lotus Banquet Hall located?
4. What is the address and phone number of Lotus Banquet Hall Virugambakkam?
5. What kind of events does Lotus Banquet Hall host?

**B. Service / facility discovery**
6. Does Lotus Banquet Hall Virugambakkam have air conditioning?
7. Does Lotus Banquet Hall allow outside catering?
8. How many guests can Lotus Banquet Hall in Virugambakkam hold?
9. Does Lotus Banquet Hall have rooms for the bride and groom?
10. Is there parking at Lotus Banquet Hall Virugambakkam?

**C. Local discovery**
11. Banquet halls in Virugambakkam for about 300 guests
12. AC marriage halls near Elango Nagar bus stop, Virugambakkam
13. Wedding venues in Virugambakkam that allow outside caterers
14. Small wedding halls in Virugambakkam for a reception
15. Halls for an upanayanam in Virugambakkam, Chennai

**D. Comparison**
16. Compare Lotus Banquet Hall and SK Mahal in Virugambakkam
17. Which is better for a 300-guest reception in Virugambakkam: Lotus Banquet Hall or SK Mahal?
18. Lotus Banquet Hall vs other banquet halls in Virugambakkam — capacity and catering
19. Which Virugambakkam hall is suitable if we want to bring our own caterer?
20. Which Virugambakkam halls have AC guest rooms?

**E. Entity disambiguation**
21. Is Lotus Banquet Hall in Virugambakkam the same as Lotus Convention Centre?
22. Is Lotus Banquet Hall a caterer or a venue?
23. Is Lotus Banquet Hall the same as SundarShree Mahal?
24. What type of business is Lotus Banquet Hall, Kaliamman Koil Road?
25. Is there more than one Lotus Banquet Hall in Chennai?

None of these mention WedMangal; that is deliberate.

## 9. Baseline round 1 (2026-10-08, page not yet publicly reachable)

Tool: Claude web search (one run each; note the answer and the sources it listed).

| Query | Sources returned | What the answer said | Errors vs official site |
|---|---|---|---|
| "Lotus Banquet Hall Virugambakkam" | Cvent, WeddingWire, official site, lotusbanquethall.co.in, Justdial, an unrelated Wikipedia page | address, phone, 50–500 and 300/400 capacities, AC rooms; "established 2004", "4.5/5 from 10 reviews", pool, in-house catering, email lotusbqhr@gmail.com | pool, "24 AC rooms"-style claims, catering conflict, unverified founding year/rating/email |
| "Banquet halls in Virugambakkam Chennai for 300 guests air conditioned" | Sulekha, BookEventz, Mandap, official site, WeddingWire, Weddingz | listed Lotus first; 300 seated/400 floating, AC, "parking for 30 vehicles" | parking 30 (official: 25) |
| "Does Lotus Banquet Hall Virugambakkam allow outside catering" | Cvent, Mandap, WeddingBazaar, WeddingWire, official site, VenueBookingz | reported conflicting sources, quoted the official site (outside food allowed) and advised calling | none invented; conflict acknowledged |
| CONTROL "SK Mahal Banquet Hall Virugambakkam" | Cvent, Sulekha, VenueLook, skmahal.com (official), HallPick, Weddingz, WebIndia123 | address 7/41 AVM Avenue, 400–500 / 600 floating, 4 AC rooms, veg from ₹300/plate, phone | not checked against an official source (control is observed, not modified) |

WedMangal was not cited in any baseline answer. Run the remaining queries in each tool for round 1 before publication if possible, and save screenshots/text in `docs/aidictionary-baseline/` (date in file name).

## 10. Control

| | Entity | Treatment |
|---|---|---|
| TEST | Lotus Banquet Hall, Virugambakkam (#789) | AI Dictionary page |
| CONTROL | SK Mahal – Banquet Hall & Wedding Venue, Virugambakkam (#89) | none — do not modify its WedMangal listing or create any page for it during the experiment |

Same category and locality. Known imbalance: the control already has its own active website (skmahal.com) and more directory coverage, so it starts better represented. Compare changes from each entity's own baseline, not absolute scores.

## 11. What to measure (each round, per query, per tool)

1. Google indexing of the AI Dictionary URL (Search Console coverage; `site:` check).
2. Google search visibility (position for queries in §8; whether the page appears at all).
3. Whether the answer's sources include the AI Dictionary page.
4. Whether the business is mentioned.
5. Whether it is described correctly (venue, not caterer; Virugambakkam).
6. Whether services/facilities are correct (AC, dining, guest rooms, catering policy).
7. Whether location/contact are correct.
8. Whether the page is cited.
9. Which other source is cited instead.
10. Factual errors (count; list each — e.g. pool, founding year, parking count).
11. Whether discrepancies are acknowledged rather than one version stated as fact.
12. TEST vs CONTROL difference in all of the above, relative to baseline.

Not success: "the page exists", "Google indexed it".
Stronger signal: the page is retrieved/cited **and** answers about the TEST entity become more accurate (fewer errors, conflicts acknowledged) while the CONTROL does not change in the same way.

## 12. Cautions

- One answer proves nothing: answers vary with retrieval changes, model updates, wording, personalisation, index changes and randomness.
- Use two baseline rounds, the same wording, the same tools, similar dates, the same control; repeat each query at least 3 times per round where the tool allows.
- Record raw answers (text/screenshot) with date, tool and mode; mark citations exactly.
- Do not change the page between rounds except as a dated, logged change.
- Look for a signal, not a success story.
