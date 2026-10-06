# DigitalOcean App Platform

Bindr runs as one Docker web service: FastAPI serves the buyer page, seller page
and API on port 8080. App Platform supplies an `ondigitalocean.app` HTTPS address.
No custom domain, droplet, nginx or separate frontend build is needed.

`.do/app.yaml` is a deployment template, not a complete production configuration.
It selects one shared CPU with 1 GiB RAM (the $10/month fixed plan as checked on
2026-10-06), NYC, and manual deployments from `main`. Supabase, S3 and Google
Vision remain external services. This creates a separate app; it does not archive
or remove any leftovers.gg resources.

## Before creating the app

1. Commit and push the Dockerfile, Docker ignore rules and app spec to GitHub.
2. Connect DigitalOcean to `dreadPir8Rbrts/bindr` if it cannot access the repository.
3. Add the following environment variables with **RUN_TIME** scope. Use encrypted
   **SECRET** values for credentials. Do not put them in the Dockerfile or Git.

| Variable | Value / handling |
|---|---|
| `BINDR_SUPABASE_CONNECTION` | Bindr's transaction pooler connection string, port 6543; SECRET. Copy the exact host and username from Supabase's Connect panel. |
| `SUPABASE_URL` | Bindr project's URL |
| `SUPABASE_PUBLISHABLE_KEY` | Bindr project's public publishable key |
| `AWS_ACCESS_KEY_ID` | Bindr S3 IAM credentials; SECRET |
| `AWS_SECRET_ACCESS_KEY` | Bindr S3 IAM credentials; SECRET |
| `GOOGLE_CREDENTIALS_BASE64` | Existing Vision service-account JSON, base64 encoded; SECRET. Alternatively use `GOOGLE_VISION_API_KEY`. |
| `AWS_REGION` | `us-east-2`, already in the template |
| `AWS_S3_BUCKET` | `bindr-photos`, already in the template |
| `S3_KEY_PREFIX` | `photos/`, already in the template |
| `S3_PUBLIC_BASE_URL` | Optional, only if a photo CDN is configured |

The local `.env` is excluded from the container. The application reads its settings
from runtime environment variables. Do not copy leftovers.gg's database settings;
Bindr uses its own project. No database migration runs automatically on deployment.

To authenticate the CLI, run `doctl auth init` interactively. Enter tokens only in
the terminal. Validate the template with:

```sh
doctl apps spec validate .do/app.yaml --schema-only
```

Use the App Platform create flow to select this Docker service and supply the
environment variables before deployment. If creating via CLI, render a private
spec outside the repository with those variables added, then pass it using
`doctl apps create --spec /path/to/private-spec.yaml`. Never use `--upsert` to create
Bindr: this must be a new app, not an update to leftovers.gg.

## Verify the deployed app

- `/` and `/seller.html` load successfully.
- `/api/v1/health` returns 200. This is only a liveness check; also verify
  `/api/v1/inventory` and `/api/v1/appearance` to exercise the database.
- `/api/v1/config` returns the public sign-in configuration.
- An unsigned request to `/api/v1/listings` returns 401.
- `/.env` and `/backend/app/config.py` return 404.
- Sign in as the seller and verify a photo upload and scan on an explicitly
  identified test listing. Seller writes affect the shared production database.

Add the exact new HTTPS origin to the S3 bucket's existing CORS allowed origins,
preserving the localhost entries. Photo uploads need POST; reading photos into
the scanner/framing canvas needs GET. Keep existing methods, allowed headers and
exposed headers when updating the rule. Do not use a wildcard origin.

Set Supabase Auth's Site URL to the new HTTPS origin and keep public sign-ups
disabled. The current email/password flow does not require an OAuth callback.

The database currently has no listings. An empty storefront is expected until
the Netlify inventory/photo migration is complete; deploying does not import it.

## Photo cleanup

The cleanup command is `python -m app.jobs.cleanup_photos` from `/app/backend`.
Before scheduling it, run it with `--dry-run` and review the pending uploads.
Current device-only drafts do not attach their uploaded photos to a server draft,
so cleanup can remove their photos after 24 hours. Resolve draft retention before
enabling a daily destructive cleanup schedule. No cleanup job is enabled by this
template.

## Local container check

With a running Docker engine:

```sh
docker build -t bindr .
docker run --rm -p 8080:8080 bindr
```

The pages and liveness endpoint work without credentials. Database and auth
endpoints require runtime configuration. The image runs as an unprivileged user.
Its forwarded-header trust is intended for App Platform's managed ingress;
reassess it before exposing the container directly on another host.

References: [App spec](https://docs.digitalocean.com/products/app-platform/reference/app-spec/),
[pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/).
