# Events Page Audit - Event Carousel Functionality

**Date:** June 11, 2026
**Scope:** `/events` page, focusing on the first event carousel and its interaction with country selection/geolocation.

---

## 1. Overview

The `/events` page is designed to display a list of events, with the initial carousel showcasing events relevant to the user's detected or selected country. This audit examines the data flow from user interaction (country selection) or automatic detection (geolocation) through to the backend API and finally to the rendering of the event carousel.

---

## 2. Intended Functionality

1.  **Country Selection/Detection:**
    *   Users can explicitly select a country using the `CountryDropdown` within the `SearchHeader`.
    *   If no country is explicitly selected, the system should attempt to geolocate the user's country based on their IP address.
2.  **Data Fetching:**
    *   The event data for the carousel should be fetched from the backend API, filtered by the selected/detected country.
    *   **Updated:** The hero carousel displays only events whose `event_start_date` falls within the next 14 days (two weeks) from today through today + 14 days. This window automatically shifts daily.
3.  **Data Filtering & Sorting (Frontend):**
    *   The carousel displays all `approved` events within the 14-day window (both verified and unverified).
    *   Events are sorted with the following priority:
        1.  `listing_verified`: Verified events first, unverified events second.
        2.  `event_start_date`: Within each verified/unverified group, events are sorted by date ascending (closest date first, e.g., 11th June before 12th June).
        3.  Stable sort: If multiple events share the same date and verification status, their original order is preserved.

    *   The `EventCarousel` component should display the filtered and sorted events.
    *   The page title or carousel title should dynamically reflect the selected/detected country.
    *   **New:** The date range picker in the `SearchHeader` should reflect the dynamically calculated two-week range by default, but allow user overrides.

---

## 3. Key Components & Data Flow Analysis

Based on the provided context and architectural patterns (especially from `ARCHITECTURE.md` and `businessListing.md`), the following components are crucial:

*   **`src/app/events/events-content.tsx`:** The main Events page component that:
    *   Calculates the 14-day window using `useMemo` (today at 00:00 to today + 14 days at 23:59:59).
    *   Sorts all fetched events with `sortedItems` memo: verified events first, then by date ascending.
    *   In `renderHero`, filters `sortedItems` to include only events within the 14-day window.
    *   Passes the filtered and pre-sorted events to `EventCarousel`.
*   **`src/lib/directory/use-directory-listings.ts`:** This hook:
    *   Reads `country` from `useSearchParams`.
    *   Fetches events from the BFF proxy at `/api/events`.
    *   Passes the client's real IP to the backend (via the BFF proxy) for geolocation.
    *   Expose `items` (processed events), `isLoading`, `error`, and `detectedCountry` (from API meta).
*   **`src/app/api/events/route.ts` (BFF Proxy):**
    *   Intercepts frontend requests to `/api/events`.
    *   **Crucially**, it should extract the real client IP (e.g., from `x-forwarded-for` header) and forward it to the Laravel backend as an `ip_address` query parameter. This was a fix implemented for businesses (`businessListing.md`).
    *   Forwards the request to the Laravel backend's `/api/events` endpoint.
*   **Laravel Backend (`/api/events` endpoint, e.g., `EventListings.php`):**
    *   Receives the `ip_address` parameter.
    *   Performs geolocation based on the IP.
    *   Filters events by the detected/selected country.
    *   Filters by `status=approved` (both verified and unverified events are returned).
    *   Returns event data along with `meta.detected_country`.
*   **`src/components/events/event-carousel.tsx`:** This component receives the pre-filtered and pre-sorted events array as a prop and renders them in a scrollable carousel.

---

## 4. Implementation Details

### 4.1 Frontend Event Carousel Logic (`events-content.tsx`)

The hero carousel displays approved events from today through the next 14 days with the following logic:

1.  **14-Day Window Calculation:**
    ```typescript
    const [twoWeekWindowStart, twoWeekWindowEnd] = useMemo(() => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 14);
      end.setHours(23, 59, 59, 999);
      return [start, end];
    }, []);
    ```
    - `twoWeekWindowStart`: Today at 00:00:00
    - `twoWeekWindowEnd`: Today + 14 days at 23:59:59
    - This window automatically updates each day.

2.  **Event Sorting (`sortedItems` memo):**
    ```typescript
    const sortedItems = useMemo(() => {
      return [...items].sort((a, b) => {
        if (a.verified !== b.verified) return a.verified ? -1 : 1;
        const ta = a.startDateRaw ? new Date(a.startDateRaw).getTime() : Infinity;
        const tb = b.startDateRaw ? new Date(b.startDateRaw).getTime() : Infinity;
        return ta - tb;
      });
    }, [items]);
    ```
    - Verified events come first (returns -1 when `a.verified` is true)
    - Within each group (verified/unverified), events are sorted by `startDateRaw` ascending
    - Same-day events preserve their natural order from the array

3.  **Hero Carousel Filtering (`renderHero`):**
    ```typescript
    renderHero={(heroItems) => {
      const nextTwoWeekEvents = heroItems.filter((e) => {
        if (!e.startDateRaw) return false;
        const start = new Date(e.startDateRaw);
        if (isNaN(start.getTime())) return false;
        return start >= twoWeekWindowStart && start <= twoWeekWindowEnd;
      });
      return <EventCarousel events={nextTwoWeekEvents} title={heroTitle} showNavigation />;
    }}
    ```
    - Filters `heroItems` (which are already sorted by `sortedItems`) to include only events within the 14-day window
    - Passes filtered events to `EventCarousel`

### 4.2 Backend Event Fetching

The backend (`EventListings.php`) is responsible for:
- Filtering events by `status = 'approved'`
- Filtering by country (via geolocation from `ip_address` parameter)
- Returning both verified and unverified approved events
- The frontend handles the 14-day window filtering and sorting

---

## 5. Potential Bugs & Areas for Verification

### 5.1 14-Day Window Not Applied (High Severity)

*   **Problem:** The carousel shows events beyond the 14-day window (e.g., showing events from 4 months ahead).
*   **Verification:**
    *   Load `/events` page on June 11, 2026.
    *   Verify that only events between June 11 and June 25, 2026 appear in the hero carousel.
    *   Load the page on June 12, 2026 and verify the window has shifted to June 12 - June 26.
    *   Check browser console for any errors in the date calculation.
*   **Likely Cause:**
    *   The `twoWeekWindowStart` and `twoWeekWindowEnd` variables are not being calculated correctly.
    *   The filter in `renderHero` is not comparing dates correctly.
    *   Events from the API are missing or have invalid `startDateRaw` values.

### 5.2 Verified Events Not Appearing First (Medium Severity)

*   **Problem:** Unverified events appear before verified events in the carousel.
*   **Verification:**
    *   Load the page with both verified and unverified events within the 14-day window.
    *   Visually inspect the carousel order; verified events should appear first.
    *   Check the `sortedItems` computation in browser console.
*   **Likely Cause:**
    *   The `sortedItems` memo is not correctly comparing `a.verified` and `b.verified`.
    *   Events are being re-sorted after `sortedItems` is computed.
    *   The API is not returning the `verified` flag correctly.

### 5.3 Date Order Not Ascending (Medium Severity)

*   **Problem:** Events are not sorted by date ascending within their verified/unverified groups.
*   **Verification:**
    *   Load the page with multiple verified events on different dates.
    *   Verify they appear in chronological order (earliest date first).
    *   Check same-day events; they should maintain their natural API order.
*   **Likely Cause:**
    *   The date comparison in `sortedItems` is reversed or using invalid date parsing.
    *   `startDateRaw` format is not being parsed correctly.

### 5.4 Country Filtering Not Applied (High Severity)

*   **Problem:** The carousel shows events from all countries, not just the selected/detected country.
*   **Verification:**
    *   Check network requests to `/api/events` to confirm the `country` parameter is being sent.
    *   Verify the backend `EventListings` action is filtering by country.
    *   Check the `ip_address` parameter is correctly forwarded by the BFF proxy.
*   **Likely Cause:**
    *   The BFF proxy not correctly extracting and forwarding the client IP.
    *   The backend `EventListings` not implementing country filtering.
    *   The `useDirectoryListings` hook not forwarding the `country` search parameter.

### 5.5 Non-Approved Events Displayed (Medium Severity)

*   **Problem:** The carousel shows events with `status != 'approved'`.
*   **Verification:**
    *   Check the backend `EventListings` query to confirm `->where('status', 'approved')` is applied.
    *   Inspect events returned by the API and verify all have `status = 'approved'`.
*   **Likely Cause:**
    *   Missing status filter in the backend query.
    *   API returning data without applying the status filter.

---

## 6. Recommendations for Verification & Fixes

1.  **Test the 14-Day Window:**
    *   Ensure the page correctly calculates and displays events for June 11 - June 25, 2026 when accessed on June 11.
    *   Verify the window shifts daily (test on June 12, 13, etc.).

2.  **Test Event Sorting:**
    *   Manually add or seed test events with known verified/unverified status and dates.
    *   Verify they appear in the correct order in the carousel.

3.  **Test Country Filtering:**
    *   Verify the BFF proxy correctly extracts the client IP and forwards it to the backend.
    *   Confirm backend country filtering is applied.

4.  **Test Date Format Handling:**
    *   Verify `startDateRaw` is a valid ISO date string (e.g., "2026-06-11").
    *   Ensure date parsing in the filter is correct (use `new Date(startDateRaw)`).

5.  **Review API Response:**
    *   Inspect the actual API response from `/api/events` to verify all events have required fields: `startDateRaw`, `verified`, and dates are within expected range.


### 4.5 Caching Issues (Medium Severity)

*   **Problem:** If the backend or BFF proxy uses aggressive caching without considering country as a cache key, users might see stale event data for a different country.
*   **Verification:** Change country, then clear browser cache and re-test. Check backend cache keys.
*   **Likely Cause:** Cache keys not incorporating `country` or `ip_address`. `businessListing.md` noted removal of per-page caching for this reason.

### 4.6 Frontend State Desynchronization (Medium Severity)

*   **Problem:** The `CountryDropdown` might show one country selected, but the carousel data reflects a different country (e.g., after browser back/forward navigation).
*   **Verification:** Use browser back/forward buttons after changing the country.
*   **Likely Cause:** The frontend state for `selectedCountry` is not fully synchronized with the URL search parameters, or the data fetching hook isn't reacting to URL changes. This was a bug fixed for businesses (`businessListing.md`).

### 4.7 BFF Bypass / Client-Side Token Storage (Critical Security)

*   **Problem:** If the `/events` page's data fetching (or any subsequent API calls for events) directly calls the Laravel backend instead of the Next.js BFF proxy, it exposes the authentication token client-side.
*   **Verification:** Inspect network requests. All API calls should go to `/api/events` (or similar BFF routes), not directly to `NEXT_PUBLIC_API_URL`.
*   **Likely Cause:** Inconsistent application of the BFF pattern, similar to issues found in `admin_listing_actions_audit.md`.

### 4.8 Geolocation on Localhost/Dev (Low Severity)

*   **Problem:** Geolocation might not work as expected on `localhost` or development environments.
*   **Verification:** Test on `localhost` and a deployed environment.
*   **Likely Cause:** `Stevebauman\Location` (or similar) typically skips geolocation for private/local IPs. This is expected behavior but can be confusing during development.

---

## 5. Recommendations for Verification & Fixes

1.  **Verify `src/app/events/page.tsx` (or `events-content.tsx`):**
    *   Ensure it uses `useDirectoryListings` with `endpoint: "/api/events"` and `forwardParams` including `country` and `event_start_date`, `event_end_date`.
    *   Confirm that the `EventCarousel` receives the `items` from this hook.
2.  **Verify `src/app/api/events/route.ts`:**
    *   Confirm it correctly extracts the client IP from `x-forwarded-for`, `x-real-ip`, or `cf-connecting-ip` headers.
    *   Ensure it forwards this `ip_address` to the Laravel backend.
    *   Verify it's not bypassing the BFF for any requests.
3.  **Verify Laravel Backend (`EventListings.php` or equivalent):**
    *   Check for `->where('status', 'approved')` and `->where('listing_verified', true)`.
    *   Confirm country filtering logic is applied based on `ip_address` or `country` parameter.
    *   Ensure appropriate `orderBy` clauses are present for sorting.
    *   Verify `meta.detected_country` is returned in the response.
4.  **Verify `SearchHeader` and URL Synchronization:**
    *   Ensure `handleCountrySelect` correctly updates the URL search parameters.
    *   Confirm that the `selectedCountry` state (if any) in the client component is synchronized with the URL parameters, similar to the fix for businesses.
5.  **Review Caching Strategy:**
    *   Ensure backend and BFF caching mechanisms for events are dynamic and consider country/IP in their cache keys.

By systematically checking these points, we can ensure the events carousel functions as intended with country-based filtering and geolocation.