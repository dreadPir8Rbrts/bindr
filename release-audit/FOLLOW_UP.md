# Follow-up: fixes and phone emulation
September 18, 2026

Draft: https://6aadbb7f193c47a4f280fa22--pokemonhooperbinr.netlify.app/

## Changes
- Selected-card price changes now display old/new prices and a review notice in the lot.
- Editing a note clears copied-message confirmation, including edits while clipboard work is in progress. Lot re-renders already clear it when selections or inventory change.
- Failed detail photos display “Photo unavailable · Tap to retry”, with an accessible retry label. Tapping retries the original photo, without modifying the underlying image.

## Verification
- 18/18 browser audit scenarios passed on the new deployed draft.
- 48/48 local tests passed, build passed, 101 catalog-frame validation passed.
- Supplemental marketplace, report, authorization and conflict checks passed.
- iPhone SE, iPhone 13 and iPhone 13 Pro Max device profiles passed touch-based photo navigation, photo retry, add/review lot, note focus, rotation overflow checks and doubled root-font overflow checks.
- Visually inspected SE catalog/lot and iPhone 13 catalog screenshots.
- The main automated checks also cover six viewport widths, favorites/reload, lot undo, original photo zoom, sold-item reconciliation, blocked clipboard/storage and signed-out seller protection.

## Limits
These were Chrome touch/device emulation, NOT an actual iPhone or Safari engine. No native software keyboard appeared; a focus check is not a keyboard-occlusion test. Root-font scaling is not native iOS Dynamic Type. Native pinch gestures, VoiceOver, Safari chrome and Instagram app switching remain unverified. Prior local WebKit launch crashed before loading the site.
Price-change notices track changes observed during the current page session; this is not cross-session price-history storage.
Actual authenticated seller writes were not exercised. All browser tests blocked non-GET function requests, and simulated inventory updates were confined to browser interception.
Possible c84/c195 title/photo mismatches remain pending seller confirmation; no listing identities or prices were changed.
Production was not published.

Evidence: fixed-results.json, iphone-results.json, fixed-browser-audit.cjs, iphone-audit.cjs. Browser scripts use PREVIEW_URL and the machine’s installed Playwright runtime.

