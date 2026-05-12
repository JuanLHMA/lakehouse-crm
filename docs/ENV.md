# Environment variables

The CRM reads these at runtime. Production values live in Vercel project settings; pull them locally with `vercel env pull .env.development.local`.

| Variable | Scope | Used by | Required for |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | server | [lib/data.ts:7](../lib/data.ts#L7), [scripts/import-orchestra.mjs](../scripts/import-orchestra.mjs) | All API routes (every read/write hits Redis) |
| `UPSTASH_REDIS_REST_TOKEN` | server | [lib/data.ts:8](../lib/data.ts#L8), [scripts/import-orchestra.mjs](../scripts/import-orchestra.mjs) | Same as above |
| `SENDGRID_API_KEY` | server | [app/api/email/send/route.ts](../app/api/email/send/route.ts), [app/api/email/sequence/route.ts](../app/api/email/sequence/route.ts) | Outbound email |
| `SENDGRID_FROM_EMAIL` | server | [app/api/email/sequence/route.ts:8](../app/api/email/sequence/route.ts#L8) | Outbound email; defaults to `welcome@lakehousemusicacademy.com` |
| `ADMIN_SECRET` | server | `app/api/admin/clear/route.ts` (planned auth gate) | Guarding destructive admin endpoints (M1) |
| `CSV_PATH` | local script only | [scripts/import-orchestra.mjs](../scripts/import-orchestra.mjs) | One-time bulk import only |

## Local setup

```bash
cd lakehouse-crm
vercel link                                  # one-time
vercel env pull .env.development.local       # pulls all server env vars from Vercel
```

`.env.development.local` is gitignored (see `.gitignore` line 34 — `.env*`).

## Running the importer

```bash
CSV_PATH=/abs/path/to/people_export.csv \
  node --env-file=.env.development.local scripts/import-orchestra.mjs
```

## What to never commit

- Anything matching `.env*`
- The Upstash URL or token (they grant full database access)
- The SendGrid API key
- Any Vercel OIDC tokens (these expire but still shouldn't be in git)

If a secret leaks, **rotate first, audit second**.
