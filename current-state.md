# Bindr: current state

*Last updated: 2026-10-06. Implementation baseline: `fastapi-migration`, scanner commit `0591541`.*

Bindr is the online binder storefront for @pokemonhooper's Pokémon card singles. Buyers browse cards, inspect photos and build a "lot" to buy over Instagram DMs. The seller manages listings, photos and the binder's look from a private seller page. There is no checkout; payment and shipping are arranged in DMs.

The app is partway through a migration **from** Netlify (static site + one Netlify Function + Netlify Blobs storage) **to** FastAPI + Supabase (Postgres and Auth) + AWS S3, so that it runs locally with no Netlify dependency and can be hosted on DigitalOcean. Steps 0–6 of 9 are done.

---

## Migration status

| Step | What | Status |
|---|---|---|
| 0 | Git repository, Netlify snapshot committed (`4e4febf`) | ✅ Done |
| 1 | FastAPI skeleton; browser files moved to `frontend/` | ✅ Done |
| 2 | Database schema (Alembic): listings, photos, eBay links, settings | ✅ Done, applied to production |
| 3 | Seller sign-in with Supabase Auth | ✅ Done |
| 4 | Listings and appearance API on Postgres | ✅ Done |
| 5 | Photo uploads to S3 (presigned POST + confirm) | ✅ Done, live-checked against the bucket |
| 6 | Card scanner on FastAPI (leftovers.gg's Python code) | ✅ Done, live-checked with Google Vision; **not yet pushed or merged** |
| 7 | Data migration: 270 listings + photos from Netlify Blobs → Postgres + S3 | ⏳ Next |
| 8 | Camera-first "add a listing" flow on phones, with server-side drafts | ✅ Implemented locally; ready to deploy |
| 9 | Deploy to a new DigitalOcean App Platform app, schedule cleanup when draft retention is resolved, retire Netlify | ⏳ Deployment configuration prepared; app creation pending |

---

Draft rows in the storefront support swiping left to reveal Delete, or using the accessible Draft actions button. Deletion requires confirmation and uses the existing version-checked seller API; swiping alone never deletes a draft.

## Storefront Add listing

Add listing now opens catalog search inside the storefront using its existing authorized API client. Search by card name, number, or set (including combinations); selecting a result prefills the guided details form, followed by listing photos, preview, and publication. Manual entry remains available. The seller-only `GET /api/v1/catalog/search?q=...` reads the Pokémon catalog and returns up to 25 matches; it does not upload photos or create listings.

## Architecture

```
Browser: buyer page (index.html) and seller page (seller.html), plain JS/CSS
   │  supabase-js (vendored): seller sign-in only
   │  fetch /api/v1/...  with  Authorization: Bearer <Supabase access token>
   ▼
FastAPI (uvicorn, Python 3.12): serves /api/v1 and frontend/ on one origin (no CORS)
   ├── Supabase Postgres   listings, listing_photos, listing_ebay_links, binder_settings,
   │                       plus the card catalog copied from leftovers.gg
   ├── Supabase Auth       tokens verified against the project's JWKS; seller role check
   ├── AWS S3              listing photos + 480px thumbnails (browser uploads directly)
   └── Google Vision       OCR for the card scanner
```

The frontend is still the original plain JavaScript (no framework, no bundler). Only the API addresses, sign-in and photo upload code changed; the card JSON format the pages use is unchanged.

---

## Repository layout

```
bindr/
  frontend/                 buyer + seller pages, CSS, images/, assets/
    vendor/                 supabase-js 2.117.2 and heic-to 1.5.2 (with licenses)
  backend/
    app/
      main.py               FastAPI app: /api/v1 routes, static frontend, security headers
      config.py             settings from the repo-root .env
      auth.py               Supabase token verification, require_seller
      api/                  health, session, listings, photos, scan
      services/             listings, photos, storage (S3), scanner, ocr, catalog_match
      models/               SQLAlchemy models: catalog.py, listings.py
      db/                   Alembic env + versions/ (migrations)
      jobs/cleanup_photos.py  removes unused S3 uploads
    tests/                  pytest (unit + local-Postgres tests), fixtures/
    requirements*.txt       pinned dependencies
  tests/                    Node tests for the frontend scripts
  Makefile                  setup / dev / test / test-db-start / test-db-stop
  .env.example              every setting the app reads
  netlify/, netlify.toml, server/, check.mjs, scripts/build.mjs, deno.lock
                            Netlify-era code, kept until step 9
  inventory.json            270-card snapshot (seed for the step 7 migration)
```

---

## Storefront admin mode

- The storefront footer offers Seller sign in. The Buyer mode / Admin mode toggle is shown only after the seller-only `/api/v1/session` endpoint verifies access. A signed-in non-seller has the normal buyer view.
- Fresh sign-in defaults to Buyer mode; the selected mode is remembered in session storage for that tab and account. Signing out removes admin UI and clears the preference.
- Admin mode adds private server drafts and Edit listing on published cards. Mobile uses a fixed bottom bar: Add listing, centered Scan, Drafts. The bar remains accessible inside the editor and respects the device safe area; Buyer mode hides it and restores the buyer lot dock. Desktop retains toolbar actions.
- Scan opens a focused camera screen with Open Camera to Take Photo (native rear-camera capture). The photo preview offers Quick Scan and Retake Photo; capture alone does not invoke OCR. Quick Scan sends an approximately 800px JPEG directly to `/api/v1/scan` for OCR. It does not create a draft, upload to S3, or attach the scan image to a listing; the scan preview remains in browser memory until the editor closes. A match opens a confirmation screen with the catalog image (captured-photo fallback), name, set and card number, plus Create Listing and Retake photo. Create Listing opens prefilled editable details, condition, price and Add More Photos (at least one separately uploaded listing photo is required); Continue validates details and opens a separate listing preview before explicit publishing. Ambiguous matches can be selected for confirmation; no-match scans retain manual identification. Add listing retains the guided flow. Drafts opens a dedicated storefront view with refresh, resume and Back to binder, reusing the verified session without loading another page or repeating `/session`. The top draft section and Seller tools links have been removed from storefront admin mode; `/seller.html` remains directly accessible. Drafts never enter the public card grid.
- Scanning, new listings, draft resume and published-listing editing run directly in the storefront through the shared `guided-editor.js` component and `photo-transfer.js` helpers. They reuse the storefront’s verified session and API client, with no seller-page load or repeated startup session check. Every scan, upload and save still sends the current bearer token for backend authorization. A 401 prompts sign-in over the editor and preserves in-memory edits for retry. Published-listing editing opens the shared details/preview editor with explicit Save changes (no live autosave), availability controls, photo add/remove/cover selection, and version-checked deletion. Closing the editor refreshes public inventory and drafts. The storefront no longer embeds the seller page. `/seller.html` permits only same-origin framing; other pages keep `X-Frame-Options: DENY`.
- Storefront published-listing edits remain in memory until saved; closing asks before discarding changes. Legacy browser drafts remain accessible on `/seller.html`. Guided new-listing drafts are saved online.
- Browser regression: `tests/browser/storefront-admin.cjs` uses mocked APIs for visitor, non-admin, and admin sessions, session mode persistence, draft publication, existing listing editing, and sign-out. Run with Playwright installed (optional `PLAYWRIGHT_MODULE` and `CHROME_PATH`).

---

## Running locally

```bash
make setup            # once: Python 3.12 venv in backend/.venv, npm install
make dev              # http://localhost:8000 (buyer), /seller.html (seller)
make test-db-start    # throwaway local Postgres on 127.0.0.1:54329 for database tests
make test             # pytest + Node frontend tests
make test-db-stop
```

- **Node:** the frontend tests need Node 22. The Makefile uses nvm's Node 22 automatically, and `.nvmrc` pins 22 for `nvm use`.
- **Local runs use the production database and the production S3 bucket.** Anything you publish, edit or delete locally is real. Local uploads go under `dev/photos/` in the bucket, so they stay separate from production's `photos/`.
- **Migrations never run automatically.** From `backend/`: `.venv/bin/alembic upgrade head`, then `.venv/bin/alembic check`.
- **Tests never touch Supabase.** The database tests rebuild the local test database from the migrations and abort if pointed at a Supabase host. They're skipped when the local test database isn't running.

### Configuration (`.env` at the repo root, git-ignored)

| Variable | Used for |
|---|---|
| `BINDR_SUPABASE_CONNECTION` | Postgres connection string. Locally: the direct connection. On a server: the Transaction pooler (port 6543). |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Seller sign-in. Public values, served to the browser by `/api/v1/config`. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | IAM user `bindr-api`, limited to the bucket's photo folders |
| `AWS_REGION`, `AWS_S3_BUCKET` | `us-east-2`, `bindr-photos` |
| `S3_KEY_PREFIX` | `dev/photos/` locally, `photos/` in production |
| `S3_PUBLIC_BASE_URL` | Optional CDN in front of the bucket |
| `GOOGLE_CREDENTIALS_BASE64` or `GOOGLE_VISION_API_KEY` | Card scanner OCR (service account from the `cardops-prod` Google project) |
| `BINDER_SETUP_KEY`, `LEFTOVERS_SUPABASE_CONNECTION` | Netlify-era and one-off migration values; the FastAPI app ignores them |

---

## Backend

### API (`/api/v1`)

| Endpoint | Access | Purpose |
|---|---|---|
| `GET /health` | Public | Liveness check |
| `GET /config` | Public | Supabase URL + publishable key for supabase-js |
| `GET /inventory` | Public | Published listings + appearance, with a `revision` fingerprint the buyer page polls every 30 s |
| `GET /appearance` | Public | Binder colour, style, rings |
| `GET /session` | Seller | Confirms the token belongs to the seller |
| `GET /listings` | Seller | All listings, including drafts, with `status`, `version` and `catalogCardId` |
| `PUT /listings/{id}` | Seller | Create or update one listing (`{card}`); updates must carry the `version` they were edited from |
| `DELETE /listings/{id}?version=N` | Seller | Delete a listing, and its photos from S3 |
| `PUT /appearance` | Seller | Save the appearance (with a revision check) |
| `POST /photos/uploads` | Seller | Presigned S3 POSTs for a photo and its thumbnail |
| `POST /photos/confirm` | Seller | Verify the uploaded objects and record a pending photo |
| `POST /scan` | Seller | Identify a card from a JPEG |

Errors use FastAPI's `{"detail": "..."}` format, with the same human-readable messages the Netlify version used.

### Sign-in (`app/auth.py`)

- **Seller page:** signs in with supabase-js (email + password) and sends the access token on every request.
- **Token check:** verified against the project's JWKS (ES256). The server holds no auth secret. Rejected: expired tokens, other projects, wrong audience, anonymous users, and HS256 "algorithm confusion" tokens.
- **Seller role:** seller routes require `app_metadata.role = "seller"`, set directly in `auth.users`. `user_metadata`, which users can edit, is never trusted.
- **Accounts:** there is one seller account. Public sign-ups should be **disabled** in the Supabase dashboard. The read-only Auth settings check on 2026-10-06 confirmed they are still enabled (`disable_signup: false`). Seller login itself was not exercised during that check.

### Database (Supabase Postgres, Alembic)

| Migration | Contents |
|---|---|
| `0001` catalog baseline | `expansions_v2` (495), `cards_v2` (50,786), `scrydex_prices` (157), copied from leftovers.gg with `pg_dump`. Production records it via `alembic stamp`; fresh databases build it. |
| `0002` listings | `listings`, `listing_photos`, `listing_ebay_links`, `binder_settings` |

Key rules the database enforces:
- **Drafts and published listings:** a draft may be incomplete; `available` and `sold` require a name, a set and a price. Prices are stored in cents.
- **Versions:** each listing has its own `version`. A save from an out-of-date tab gets 409, and saving one listing never blocks another.
- **Photos:** at most 20, at most one front and one back, JPEG/PNG/WebP only. A photo is either pending (uploaded, not yet attached) or attached with a position. Positions are a deferrable unique constraint, so photos can be reordered inside one save.
- **eBay links:** each eBay item links to only one card.
- **Catalog link:** `listings.card_v2_id` links to the catalog card a scan identified, and is set to NULL if that card is ever removed.
- **Access:** row-level security is on, and Supabase's `anon` and `authenticated` roles have no access. Only the backend, which connects as the database owner, reads or writes these tables.

### Photos (`app/api/photos.py`, `app/services/storage.py`)

1. **Preparation:** the browser prepares the photo (≤3 MB, HEIC converted) plus a 480px JPEG thumbnail.
2. **Ticket:** `POST /photos/uploads` returns presigned POSTs. The S3 policy pins the exact key, content type and maximum size.
3. **Upload:** the browser uploads both files straight to S3, with a progress bar.
4. **Confirm:** `POST /photos/confirm` checks both objects' size, type and file signature, then records a pending photo.
5. **Attach:** saving a listing that uses the photo's URL attaches it. Photos removed from a listing, or whose listing is deleted, are deleted from S3 after the database commit.

Other details:
- **Keys:** `<S3_KEY_PREFIX><uuid>.<ext>`, plus `<uuid>_thumb.jpg`. They're public-read by bucket policy and unguessable.
- **Cleanup job:** `python -m app.jobs.cleanup_photos [--dry-run]`, run from `backend/`, removes unattached uploads and unreferenced objects older than 24 hours. It isn't scheduled yet (step 9).
- **Bundled photos:** the photos in `frontend/images/` (the Netlify-era inventory) are still served by FastAPI from there until step 7.

### Card scanner (`app/api/scan.py`, `app/services/scanner.py`)

- **Pipeline:** the seller page sends an 800px JPEG → Google Vision OCR → `ocr._parse_pokemon_card_text` → `catalog_match.match_card_v3` → Bindr listing fields (an English-first name, Japanese cards labelled, the literal `"None"` rarity hidden).
- **Copied code:** `ocr.py` (parsing) and `catalog_match.py` (matching) were **extracted verbatim** from leftovers.gg, commit `5e2159b`. `backend/tests/fixtures/scanner-python-reference.json` holds outputs from the leftovers.gg original. Change the logic in leftovers.gg first, then re-copy.
- **Catalog link:** choosing a scan result stores `catalogCardId` on the listing.
- **Live check (2026-09-25):** 4 of 6 real card photos matched immediately, in about 0.4–0.6 s each; the first call takes about 6 s cold. The 2 misses had no readable card number (see Known issues).

---

## Frontend changes so far

- **Location:** all browser files moved to `frontend/`, with history kept.
- **Addresses:** `/.netlify/functions/binder-api?resource=…` became `/api/v1/…`.
- **Sign-in:** `seller-auth.js` and the vendored supabase-js. The temporary-password and setup-key flow was removed.
- **Uploads:** `phone-photos.js` uploads to S3 through `uploadSellerPhoto` (ticket → S3 → confirm).
- **Images:** `helpers.js` no longer uses Netlify's image resizer. Grid views use the listing thumbnail.
- **Scanner:** `card-scanner.js` calls `/api/v1/scan` and records `catalogCardId`.
- **Code left untouched:** `cards.js` (a hardcoded inventory copy) is still loaded by both pages.

---

## Tests

| Suite | Count | Covers |
|---|---|---|
| Backend (pytest) | 159 | Auth (forged, expired, foreign and non-seller tokens), schema rules, the migration round trip and constraint names, the listings API, photo uploads and cleanup (in-memory S3 plus an offline boto3 policy check), scanner parsing parity and the endpoint |
| Frontend (Node) | 55 | Seller and buyer page behaviour, sign-in handling, save/delete requests, the upload sequence, drafts, dialogs |

Re-run during repository preparation on 2026-10-06: **159 backend tests and 55 Node tests passed, with no skips**, using the throwaway local Postgres database at `127.0.0.1:54329/bindr_test`. Database tests need `make test-db-start`; without a reachable local database, 101 backend tests are skipped.

---

## External services

| Service | State |
|---|---|
| **Supabase** (Bindr project) | **Restored and verified on 2026-10-06.** DNS, Postgres, Auth health and ES256 signing keys respond successfully. Migration `0002` is applied; 50,786 catalog cards, 495 expansions, one seller account and one binder settings row are present. Listings and listing photos are both empty, awaiting step 7. The app's public inventory, appearance and configuration routes return 200; unsigned seller requests return 401. Checks were read-only. Public sign-ups remain enabled. |
| **AWS S3** `bindr-photos` (us-east-2) | ACLs disabled, public-read only on `photos/*` and `dev/photos/*`. CORS allows `http://localhost:8000` and `http://127.0.0.1:8000` only. IAM user `bindr-api` can only put/get/delete/list in those folders. All live-checked. |
| **Google Cloud Vision** | Service account from the `cardops-prod` project (shared with leftovers.gg). Billed to that project after the free tier. |
| **GitHub** | `dreadPir8Rbrts/bindr`. `main` contains steps 0–5 (merged PR #1); `fastapi-migration` has the step 6 commit, not yet pushed. |
| **Netlify** | The live site `pokemonhooperbinr.netlify.app` still serves the last Netlify deploy, and the 270 live listings and uploaded photos are still in Netlify Blobs. ⚠️ **Don't redeploy to Netlify from `main`:** it now has the new layout, and a deploy would break the live site. The Netlify version is commit `4e4febf`. |

---

## Known issues and open decisions

1. **The scanner suggests digital-only cards.** When the card number isn't readable, `match_card_v3` includes 3,003 TCG Pocket cards (`expansions_v2.is_online_only`). Proposed fix: filter those out in leftovers.gg's `catalog_match.py`, then re-copy into Bindr, keeping both identical. Decision pending.
2. **A parser bug from leftovers.gg:** the "Evolves from …" skip rule only matches a line ending right after "from", so the reported name can be the "Evolves from X" line. Matching usually still succeeds through the card number.
3. **Listing data to check:**
   - c43 Magikarp is listed as 65/107, but the physical card is 64/107. The Netlify code patched this at read time; the step 7 migration should store the corrected number.
   - c65 Psyduck is listed as 54/110, but its photo scans as Psyduck δ 81/110.
   - c84 and c195 have possible listing/photo mismatches, noted in the Netlify handoff.
4. **Local writes are production writes**, because the database and bucket are shared.
5. **CORS** only allows localhost. Add the production domain in step 9.
6. **The photo cleanup job isn't scheduled.** It needs a daily run in production (step 9).
7. **`cards.js` and `inventory.json`** both duplicate the inventory. Remove `cards.js` once the pages no longer need a fallback, and keep `inventory.json` only as migration input.
8. **Netlify-era code** (`server/`, `netlify/`, `netlify.toml`, `check.mjs`, `scripts/build.mjs`, `deno.lock`, the `@netlify/blobs` package and the related Node tests) is still in the repo. It gets removed in step 9.

---

## Remaining work

**Repository preparation (2026-10-06).**
- Removed 430 staged files with ` 2` suffixes after checking that both their staged and working contents were byte-for-byte identical to the existing originals. Originals were preserved.
- Re-ran the complete local test suites successfully and added this handoff document to version control.
- Scanner commit `0591541` still needs publishing and a pull request into `main`. The GitHub connector confirms the remote `fastapi-migration` branch is at `dfd7829` and has no open pull request. GitHub recognizes the configured SSH key, but signing fails while it is locked; unlock it locally before pushing. Do not include the passphrase in chat or documentation.
- Before merging or deploying, preserve the existing Netlify storefront; the migration branch is not compatible with the old Netlify deployment pipeline.

**Step 7: data migration.**
- Read the live inventory and the 152 uploaded photos from Netlify Blobs (read-only, needs a Netlify access token once).
- Upload all photos to S3, including the 405 bundled `frontend/images/` photos.
- Insert the 270 listings with their photos, roles, crop frames and eBay links.
- Apply the known data fixes, link listings to catalog cards where the match is unambiguous, and compare counts.
- Then remove the bundled images from `frontend/`.

**Step 8: camera-first flow — implemented.**
- New listing opens Front photo → Identify → More photos → Details & publish. Preview and accept the front to upload, attach it to a private server draft, and automatically scan it. Choose a match or enter identity manually.
- Back photos are optional (Skip for now); close-ups are supported. Condition, price, description and preview precede explicit publication. Success offers View listing and Add another card.
- `guided-draft.js` serializes versioned autosaves and reconciles uncertain responses before retrying. Conflicting remote edits are never silently overwritten. Keep the tab open when a save or upload needs retrying.
- Server drafts appear separately in Continue a draft and resume after sign-in on any device. Drafts infer their resume step from saved content. Their attached photos survive unused-upload cleanup. Delete draft removes it and its photos.
- The standalone seller page retains its legacy editor and browser drafts; storefront listing editing uses the shared editor. Legacy browser-only draft photos still need the retention decision below. Download backup exports published inventory only.
- No migration or new environment variables. Deploy frontend files with the existing Docker build.
- Verified: 160 backend tests, 60 frontend tests, plus a mocked mobile Chrome flow covering scanning, optional back, reload/resume, a lost publication response, and existing-listing editing. Physical phone camera and production S3/OCR remain deployment smoke checks.

**Step 9: deploy and retire Netlify.**
- **Hosting decision updated 2026-10-06:** create a separate DigitalOcean App Platform app for Bindr, using its default HTTPS address with no custom domain. The owner will archive leftovers.gg separately; do not replace its droplet or app.
- `Dockerfile`, `.dockerignore` and `.do/app.yaml` are prepared; [deploy/README.md](deploy/README.md) describes the setup. The app spec passes `doctl` schema validation. A container build has not yet run because the local Docker engine is stopped.
- App creation is pending: the saved DigitalOcean CLI credentials returned 401 and need reauthentication with `doctl auth init`.
- Supply production runtime environment variables with the exact Supabase pooler connection string and `S3_KEY_PREFIX=photos/`. Credentials stay out of Git and the container image.
- Add the assigned HTTPS origin to S3 CORS. Before scheduling cleanup, resolve retention for device-only drafts, whose uploaded photos remain pending and can otherwise expire after 24 hours.
- Netlify code removed, the Netlify site switched off once the new one is verified.

---

## Change history (`fastapi-migration`)

| Commit | Summary |
|---|---|
| `4e4febf` | Initial commit: the Netlify binder with the card scanner (JavaScript port) |
| `143d019` | FastAPI skeleton; browser files moved to `frontend/`; Makefile |
| `a324904` | Database schema, Alembic, schema tests against a local Postgres |
| `8b2b135` | Seller sign-in switched to Supabase Auth |
| `cdea201` | Fix doubled check-constraint names in migration 0002 (production tables recreated) |
| `4080373` | Listings and appearance API on Postgres; frontend pointed at it |
| `dfd7829` | Photo uploads to S3; cleanup job; Netlify image resizer removed |
| `0591541` | Card scanner on FastAPI with leftovers.gg's Python code; JavaScript port removed |
