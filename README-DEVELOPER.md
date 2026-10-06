# Bindr developer handoff

For the current architecture, verified service status and remaining migration steps, see [current-state.md](current-state.md). The Netlify release and build instructions below the migration notes are historical; do not deploy the migration branch through that pipeline.

DigitalOcean App Platform deployment files are prepared in `Dockerfile` and `.do/app.yaml`; see [deployment setup](deploy/README.md) for runtime secrets, verification and remaining setup. The new app has not yet been created.

> **Migration in progress (branch `fastapi-migration`):** moving from Netlify Functions + Blobs to FastAPI + Supabase (Postgres, Auth) + S3, runnable locally with no Netlify dependency. Browser files now live in `frontend/`; the API lives in `backend/`. Listings, appearance, seller sign-in, photo uploads (S3) and the card scanner run on FastAPI; existing listings stay in Netlify Blobs until the data migration.
>
> Local development: `make setup` once, then `make dev` → http://localhost:8000 (seller page: `/seller.html`). `make test` runs pytest and the Node frontend tests. Local runs use the production Supabase database and S3 bucket, so treat local writes as live.
>
> Database: models in `backend/app/models/`, Alembic migrations in `backend/app/db/versions/` (`YYYYMMDD_NNNN_description.py`, each with a complete `downgrade()`). Migrations never run on startup; apply them by hand from `backend/` with `.venv/bin/alembic upgrade head`, and run `.venv/bin/alembic check` to confirm models and migrations agree. Revision 0001 is the catalog copied from leftovers.gg, which already exists in production: production records it with `alembic stamp 0001` rather than running it. Database tests use a throwaway local Postgres: `make test-db-start` before `make test` (they are skipped when it is not running, and refuse to run against Supabase).
>
> Seller sign-in: Supabase Auth. The seller page signs in with supabase-js (`frontend/seller-auth.js`, vendored in `frontend/vendor/`) and sends `Authorization: Bearer <access token>`; `backend/app/auth.py` verifies it against the project's JWKS (no auth secret on the server) and `require_seller` requires `app_metadata.role = "seller"`. To make an account the seller: `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "seller"}' where email = '...';` (takes effect at the next sign-in). Keep public sign-ups disabled in the Supabase dashboard.
>
> Listings API (`backend/app/api/listings.py`, logic in `app/services/listings.py`): public `GET /api/v1/inventory` (published listings + appearance, with a `revision` fingerprint the buyer page polls) and `GET /api/v1/appearance`; seller-only `GET /api/v1/listings` (includes drafts, `status` and `version`), `PUT /api/v1/listings/{id}` with `{card}` and `DELETE /api/v1/listings/{id}?version=N`, and `PUT /api/v1/appearance`. Each listing has its own `version`: a save or delete from an out-of-date tab gets 409, and saving one listing never blocks another. Cards keep the Netlify-era JSON shape the pages already use.
>
> Photos (`backend/app/api/photos.py`, `app/services/storage.py`): the seller page asks `POST /api/v1/photos/uploads` for presigned S3 POSTs (key, type and size pinned by the policy), uploads the photo and a 480px thumbnail straight to S3, then calls `POST /api/v1/photos/confirm`, which checks both objects' size, type and file signature and records a pending photo. Saving a listing that uses the photo URL attaches it; removed photos are deleted from S3 after the save commits. Keys are `<S3_KEY_PREFIX><uuid>.<ext>` (+ `_thumb.jpg`), public-read by bucket policy. `python -m app.jobs.cleanup_photos [--dry-run]` (from `backend/`) removes uploads never attached and unreferenced objects older than 24 hours; run it daily in production. Photos bundled in `frontend/images/` are still served from there until the data migration.

Approved release: September 18, 2026 — navy theme with clear-history fix. Navy is the default for buyer and seller pages and the API appearance fallback; explicitly saved seller themes still take precedence. Clearing recent history focuses non-editable catalog results rather than search, preventing an unwanted keyboard opening. All 49 local tests pass, including the new recent-history regression test.
Production: https://pokemonhooperbinr.netlify.app/
Approved preview: https://6aadbb7f193c47a4f280fa22--pokemonhooperbinr.netlify.app/

## Run and build
Requires Node.js 22 or later. Run `npm install`, `npm test`, then `npm run build`.
Netlify configuration is in netlify.toml. Publish directory: dist. Functions: netlify/functions.
Use Netlify development tooling for API-backed local previews; a static file server alone does not implement inventory or authentication.

## Contents and architecture
Vanilla browser JavaScript/CSS, Netlify function API, and Netlify Blobs persistence. Buyer entry: index.html. Seller entry: seller.html. API implementation: server/core.mjs.
inventory.json is a 270-card snapshot, not an export of all current remote account data. Build regenerates server/seed.mjs. Live inventory is fetched from the API. Some photos are in images/; uploaded photos referenced by API URLs remain in the existing site's Netlify Blobs. Those remote originals are NOT included in this ZIP. An independent deployment needs an authorized migration/export of that storage.
catalog-frames.js controls catalog-only cropping; original inspection photos are retained.

## Security and deployment
Credentials, local Netlify configuration, dependencies and compiled output are excluded. server/owner-bootstrap.mjs is intentionally replaced with `export default null`; this is not the private production bootstrap module.
For a NEW isolated site, configure a strong BINDER_SETUP_KEY of at least 16 characters in Netlify environment settings and complete seller setup. Do not commit or share the value.
Coordinate authentication configuration with the owner before deploying this sanitized package over production. Do not reset live accounts or overwrite live inventory. Draft deployments on the same Netlify site can share real storage; use an isolated site for destructive tests.

## Validation and remaining checks
48 local tests and 18 deployed browser scenarios passed. Phone touch emulation passed at iPhone SE, iPhone 13 and iPhone 13 Pro Max sizes. This does NOT certify real iOS Safari, native keyboard, VoiceOver or Instagram app switching.
See release-audit/FOLLOW_UP.md for current results; REPORT.md records the earlier audit before fixes. Audit browser scripts reference the original machine's Playwright installation and need adjustment on another computer.
Seller must verify possible listing/photo mismatches c84 and c195; those inventory records were not changed.
Recent fixes: visible selected-card price-change notice, stale copied-message reset, and detail photo retry. Price-change tracking is page-session scoped.

## Card scanner
Seller step 2 ("Identify your card") can scan the front photo, or another photo, to fill the name and "Set · number · rarity". `frontend/card-scanner.js` sends an 800px JPEG to `POST /api/v1/scan` (seller only) → Google Vision OCR → parsing → `match_card_v3` against the catalog (`cards_v2`, `expansions_v2`). Choosing a result also stores the catalog card on the listing (`catalogCardId` → `listings.card_v2_id`).
`backend/app/services/ocr.py` (parsing) and `catalog_match.py` (`match_card_v3`) are copied verbatim from leftovers.gg (commit 5e2159b); `backend/tests/fixtures/scanner-python-reference.json` holds outputs from the leftovers.gg original. Change the logic in leftovers.gg first, then re-copy, so both apps scan identically.
Needs `GOOGLE_CREDENTIALS_BASE64` (base64 service-account JSON, as in leftovers.gg) or `GOOGLE_VISION_API_KEY`; without them `/scan` returns a "not set up" message and the rest of the seller page works normally.
