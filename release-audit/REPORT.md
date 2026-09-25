# Bindr release-readiness audit — September 18, 2026

## Recommendation
Hold production release for targeted reliability fixes and an actual iPhone Safari walkthrough. The approved layout does not need a redesign. This is an automated scenario-based audit, not a study with recruited buyers.

Preview tested: https://6aadb8f26013225013830ab3--pokemonhooperbinr.netlify.app/

No production deployment, real seller mutation, or Instagram message was performed. Browser tests block non-GET Netlify function requests; price/sold changes and Instagram destination were simulated locally.

## Results
- Chrome: 15 of 18 scenario checks passed; three reproducible UX failures.
- 48 local automated tests passed against current full-preview code. Older test fixtures were adapted to load current helpers and browser globals; assertions were preserved.
- Additional local checks passed: marketplace/report handling, cancelled orders, conflicts, field validation, authorization and link preservation.
- 101 photo-specific catalog frames validated, including bounds, sold exclusion and replacement-photo fallback.
- Inventory observed: 101 available and 169 sold cards.
- Six phone/landscape widths (320, 375, 390, 430, 667, 844 pixels) showed no horizontal page overflow.
- No uncaught page errors were recorded in the Chrome scenarios.

## Fix before release
### 1. Selected-card price changes are silent
Reproduction: add a card to a lot, simulate a refreshed inventory with a higher price, refresh live inventory.
Observed: the subtotal changes without an explicit price-change notice.
Risk: the buyer may copy or discuss a different total without understanding why.
Recommended change: show old/new prices for changed selected cards, invalidate copied-message confirmation, and ask the buyer to review before continuing.
Priority: high, buyer trust.

### 2. “Copied!” remains after editing the message
Reproduction: copy the lot message, then edit its note.
Observed: the message changes but the success confirmation remains.
Risk: the buyer pastes an older message, believing the updated version was copied.
Recommended change: reset the confirmation whenever the lot, note or selected-card prices change.
Priority: medium.

### 3. Detail photos lack an understandable failure state
Reproduction: open card details and force a photo request to return 404.
Observed: no clear failed-photo explanation in the dialog.
Risk: a condition-conscious buyer cannot tell whether the photo is absent, loading or broken.
Recommended change: display an accessible “Photo couldn’t load” state with retry; preserve navigation to remaining photos.
Priority: medium.

### 4. Confirm two possible listing/photo mismatches
During catalog framing review, the photos for c84 and c195 appeared to show Kangaskhan, while stored titles identify Nidoqueen (Reverse Holo) and Nidoqueen copy 2. Both records reference 6/112.
This needs seller confirmation of the exact physical cards, titles and corresponding photos before publication. Do not automatically rename or change prices based on this observation. Inventory was not altered.

## Buyer scenarios and interpretation
These are simulated perspectives, not actual participant feedback.

### First-time buyer
Tested searching, no-results recovery, filters, adding a lot and Instagram handoff.
The basic path works. Clipboard denial provides a manual-copy selection fallback. The Instagram destination was checked using a stand-in; actual app handoff and sending were not tested.

### Collector seeking a particular copy
Tested Magikarp search, exact-copy comparison, condition filtering and budget reset.
These checks passed. Accurate listing identity remains essential; review the possible mismatches above.

### Condition-conscious buyer
Tested original detail image source, zoom controls and browser Back.
Catalog cropping does not replace the original inspection image in the tested flow. Broken-image recovery needs improvement. Physical iPhone gestures remain unverified.

### Returning buyer building a lot
Tested favorites persistence, two-card lot removal/undo, note persistence, sold-item reconciliation and blocked-storage warning.
These passed. Price-change notices and stale copy confirmation are the main remaining trust issues.

## Seller coverage
Signed-out seller page showed authentication and hid the workspace.
Local tests cover authorization, owner setup safeguards, revision conflicts, deletion, save confirmation, failed saves, photo batch/retry handling, expired sessions and draft restoration.
These use controlled test data and mocks. They are not proof of end-to-end authenticated production uploads or actual camera/HEIC behavior on iPhone.

## Limits and remaining device acceptance
The local WebKit browser crashed before loading the site (Bus error). This is an audit-environment limitation, not a diagnosed site failure. Chrome mobile emulation does not establish iOS Safari compatibility.

Before release, use a physical iPhone to verify:
- Portrait/landscape, Safari address-bar changes and safe-area spacing.
- Keyboard focus and note editing without obscured controls.
- Pinch/zoom, photo swiping and back navigation.
- Copy/paste into Instagram and return without losing a lot.
- VoiceOver labels/order and larger accessibility text.
- Authenticated seller draft/retry and real camera photos using an explicitly isolated test listing.
- Slow/offline connection recovery and long-session authentication expiry.

No complete accessibility compliance, load/performance, security penetration test or third-party account workflow certification is claimed.

## Evidence
results.json contains individual browser outcomes. browser-audit.cjs contains the repeatable browser scenarios; it currently references this machine’s bundled Playwright installation.
Current local tests are in bindr-full-preview/tests.

