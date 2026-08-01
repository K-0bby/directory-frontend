# [Bug] Same listing shows different cover images on different pages — `category_landing` returns a divergent media payload

**Severity:** Medium — visible to end users on public pages
**Area:** API / listing serialization
**Reported from:** Frontend (me-fie-directory), verified directly against `https://me-fie.co.uk`

---

## Summary

The same listing renders a different cover image depending on which page you're on. Root cause is on the API side, not the client: `GET /api/category_landing` serializes listings with a **different and truncated media payload** than every other listing endpoint — fewer images, no image `id`s, and the `cover` / `cover_is_explicit` fields omitted entirely.

Because affected listings have no explicit cover (`cover: null`), every client must fall back to `images[0]` — and `images[0]` is a different image depending on the endpoint.

---

## Reproduction

Test listing: **GINA'S** (`slug: gina-s`, Food & Restaurant, United Kingdom)

```bash
# A — home page feed
curl -s "https://me-fie.co.uk/api/all_listings_by_country_and_category?country=United%20Kingdom&per_page=50" \
  -H "Accept: application/json"

# B — businesses listing page
curl -s "https://me-fie.co.uk/api/businesses?country=United%20Kingdom&per_page=100" \
  -H "Accept: application/json"

# C — listing detail page
curl -s "https://me-fie.co.uk/api/listing/gina-s/show" \
  -H "Accept: application/json"

# D — category landing page  ← the outlier
curl -s "https://me-fie.co.uk/api/category_landing?category_slug=food-restaurant&country=United%20Kingdom" \
  -H "Accept: application/json"
```

---

## Observed vs expected

| Endpoint | `cover` | `cover_is_explicit` | `images` returned | `images[0]` → rendered |
| --- | --- | --- | --- | --- |
| A `all_listings_by_country_and_category` | present, `null` | `false` | 4 images — ids `234, 231, 232, 233` | `gte.png` (flyer) |
| B `businesses` | present, `null` | `false` | 4 images — same order | `gte.png` (flyer) |
| C `listing/{slug}/show` | present, `null` | `false` | 4 images — same order; `gallery` positions 1–4 put id `234` at **position 1** | `gte.png` (flyer) |
| D `category_landing` | **field absent** | **field absent** | **1 image only** — `231 g2.jpg`, **no `id`** | `g2.jpg` (storefront) |

**Expected:** all four endpoints return the same `images` set, in the same order, with the same `cover` / `cover_is_explicit` fields, so every surface resolves the same cover.

**Actual:** D diverges on all three counts.

### Raw payload from D (note the missing fields)

Top-level keys present on the listing object in `category_landing`:

```
['bio', 'categories', 'city', 'country', 'description', 'event_city',
 'event_country', 'event_end_date', 'event_start_date', 'event_venue',
 'id', 'images', 'listing_verified', 'name', 'rating', 'ratings_count',
 'reach_badge', 'slug', 'type']
```

No `cover`. No `cover_is_explicit`. No `gallery`.

```json
"images": [
  {
    "original": ".../gina-s/231/g2.jpg",
    "thumb":    ".../gina-s/231/conversions/g2-thumb.jpg",
    "webp":     ".../gina-s/231/conversions/g2-webp.webp",
    "card":     ".../gina-s/231/conversions/g2-webp.webp"
  }
]
```

Compare to A/B/C, which return all four images each carrying an `id`.

---

## Why the client can't work around this

The frontend has already been updated to treat `cover` as authoritative and fall back to `images[0]` only when no explicit cover exists. That correctly fixes listings where `cover_is_explicit: true` (verified working for Kozo Restaurant, Bosphorus Restaurant & Cafe, La bonté Shito, Capitol Cafe & Restaurant).

It cannot fix the `category_landing` case, because in that response:

- there is no `cover` to honour,
- there is no `id` or `position` to sort deterministically by,
- the differing image **is not present in the response at all**, so it can't be selected.

---

## Requested fixes

### 1. Make `category_landing` use the same listing resource as the other endpoints (primary fix)

It should emit the identical serialized shape — `cover`, `cover_is_explicit`, and the full `images` array with `id`s in consistent order — rather than its own reduced projection. This is the minimum needed to resolve the reported bug.

### 2. Always populate `cover` server-side (recommended follow-up)

Currently `cover` is `null` whenever the vendor hasn't explicitly chosen one, which pushes the "which image is the cover?" decision out to every client, where it gets re-derived inconsistently.

Suggestion: always return a resolved `cover`, falling back server-side to the first gallery image by `position` when none is explicitly set. Keep `cover_is_explicit` as-is so clients can still distinguish a deliberate choice from a fallback.

This makes the cover a single server-owned decision and prevents this whole class of bug from recurring on any future endpoint or client.

---

## Notes

- Ordering in A/B/C (`234, 231, 232, 233`) is **not** id-ascending — it follows the vendor's `gallery.position`, where id `234` is position 1. So the flyer is the vendor's intended lead image, and the category page showing the storefront is the incorrect one.
- Scope is not limited to GINA'S; any listing with `cover_is_explicit: false` and more than one image is affected wherever the category page appears alongside another surface.
