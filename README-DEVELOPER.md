# Bindr developer handoff

> **Migration in progress (branch `fastapi-migration`):** moving from Netlify Functions + Blobs to FastAPI + Supabase (Postgres, Auth) + S3, runnable locally with no Netlify dependency. Browser files now live in `frontend/`; the API lives in `backend/`. Until the API port lands, pages served by FastAPI still call the old `/.netlify/functions/binder-api` URLs, so live inventory and seller saving do not work locally yet.
>
> Local development: `make setup` once, then `make dev` → http://localhost:8000 (seller page: `/seller.html`). `make test` runs pytest and the Node frontend tests. Local runs use the production Supabase database and S3 bucket, so treat local writes as live.
>
> Database: models in `backend/app/models/`, Alembic migrations in `backend/app/db/versions/` (`YYYYMMDD_NNNN_description.py`, each with a complete `downgrade()`). Migrations never run on startup; apply them by hand from `backend/` with `.venv/bin/alembic upgrade head`, and run `.venv/bin/alembic check` to confirm models and migrations agree. Revision 0001 is the catalog copied from leftovers.gg, which already exists in production: production records it with `alembic stamp 0001` rather than running it. Database tests use a throwaway local Postgres: `make test-db-start` before `make test` (they are skipped when it is not running, and refuse to run against Supabase).

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
Seller step 2 ("Identify your card") can scan the front photo, or another photo, to fill the name and "Set · number · rarity". Flow: `card-scanner.js` downsizes to an 800px JPEG → `binder-api?resource=scan` (seller sign-in required) → Google Vision OCR → `server/scan/` parse and match against the Supabase catalog (`cards_v2`, `expansions_v2`, `scrydex_prices`, copied from leftovers.gg).
`server/scan/ocr-parse.mjs` and `match.mjs` port leftovers.gg's `ocr.py` and `match_card_v3`; `tests/fixtures/scanner-python-reference.json` holds outputs generated by the Python original. Keep them in step when either side changes.
Environment variables (Netlify site settings, and `.env` for `netlify dev`):
- `BINDR_SUPABASE_CONNECTION` — Postgres URI for the Bindr Supabase project. On Netlify use the Transaction pooler URI (port 6543); the direct `db.<ref>.supabase.co` host is IPv6-only and unreachable from Netlify functions.
- `GOOGLE_CREDENTIALS_BASE64` (base64 service-account JSON with Cloud Vision access, same format as leftovers.gg) or `GOOGLE_VISION_API_KEY`.
Without them, scanning returns a "not set up" message and the rest of the seller page works normally.
