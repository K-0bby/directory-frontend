# PRD: Canonical Listing Creation Journey

**Product:** Mefie Directory  
**Status:** Implemented  
**Primary area:** Listing onboarding and creation  
**Backend impact:** None

## Objective

Mefie uses one maintainable listing-creation form for every manual-creation
entry point. Dashboard users can create directly, while vendor and
apply-to-be-listed calls to action start with an advisory search that helps a
user find and claim an existing listing.

Search never blocks manual creation. Businesses, events, and communities may
share a name while representing different organisations, owners, categories,
or locations.

## Journeys

### Dashboard direct creation

My Listings -> Add new listing opens:

`/dashboard/my-listing/create?type={business|event|community}`

No preliminary search is required.

### Search-first creation

Public vendor/application calls to action open `/claim`. Search is available
without authentication and shows the listing name, type, location, category,
image, and claim action.

Users may always select **Create a new listing manually**, whether search
returns no matches, similar matches, exact-name matches, claimed matches, or
unclaimed matches. The handoff uses:

`/dashboard/my-listing/create?type={type}&name={searchTerm}&source=claim`

Guests authenticate before claiming or creating. The complete destination is
encoded in the authentication redirect.

### Existing listing claim

Selecting Claim continues to `/claim/{listing}/verify`. Existing claim
eligibility, email verification, document evidence, ownership, and approval
contracts remain unchanged.

## Canonical form requirements

- The dashboard `ListingContent` orchestration is the only creation form.
- Business, event, and community retain their type-specific configured steps.
- Search-originated creation may prefill an editable name for a new draft.
- Prefill never overwrites an existing or resumed draft.
- Draft persistence, readiness, optional steps, media revisions, unsaved-change
  protection, and moderation submission remain intact.
- `/claim/manual` is compatibility-only and redirects valid `type`, `name`, and
  `slug` parameters to the canonical form.
- `/become-a-vendor` is compatibility-only and redirects to `/claim`.
- The former `/claim/manual/form-component` implementation is removed.

## Business rules

- A name match is advisory and is not proof of duplicate ownership.
- Existing backend uniqueness constraints remain authoritative.
- New listings are created as drafts and remain non-public until moderation.
- Existing user-to-vendor switching on listing creation remains unchanged.
- Media limits, response shapes, and claim/moderation policies are unchanged.

## Acceptance criteria

- All manual creation entry points render the dashboard canonical form.
- Public users can search for a listing before authentication.
- Manual creation remains visible and enabled in every search state.
- Claim and create destinations survive login, signup, and verification.
- Search name and selected type reach a new canonical form.
- Resumed drafts are not overwritten by URL prefill.
- Legacy routes redirect safely.
- No runtime import references the removed manual form components.
- Frontend lint, TypeScript, and production build checks pass.

## Regression scenarios

- Directly create each listing type from My Listings.
- Search with no result, an exact-name result, several same-name results in
  different locations, and a mix of claimed/unclaimed results.
- Claim the correct result or manually create a separate result in every case.
- Complete guest login/signup redirects for both claim and creation.
- Refresh and resume a draft; navigate steps; skip optional steps; upload
  media; save a draft; and submit it for moderation.
