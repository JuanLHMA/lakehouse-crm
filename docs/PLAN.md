# Lakehouse CRM — Project Plan

> Status: living document. Last updated 2026-05-12.

## 1. Vision

A staff-facing CRM for **Lakehouse Music Academy** that moves prospective and existing students through Bryan Coleman's **8 A's customer journey** — *Assess, Admit, Affirm, Activate, Acclimate, Accomplish, Adopt, Advocate*. The CRM ingests leads from Opus1 (the academy's studio-management platform), keeps the staff team aligned on next actions, and runs phase-appropriate email sequences automatically.

The single product question the CRM has to answer at a glance: **"Who needs us to do something for them today?"**

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 | Pre-release Next — see `AGENTS.md`. Treat training-data knowledge as suspect; read `node_modules/next/dist/docs/` before writing route code. |
| Language | TypeScript 5 | Strict mode via `tsconfig.json`. |
| Styling | Tailwind v4 | Brand color crimson `#DC143C` on black. Anton display font. |
| Storage | Upstash Redis (REST) | Single keys `crm:leads`, `crm:activities`, `crm:sequences`, `crm:staff` — each holds a JSON array. |
| Email | SendGrid | `welcome@lakehousemusicacademy.com` is the default `From`. |
| Hosting | Vercel | Project `lakehouse-crm` under team `juan-ogradys-projects` (account `juan-9998`, email `juan@lakehousemusicacademy.com`). Production domain `lhcrm.site`. Preview deploys per branch. Migrated 2026-05-12 from former team `juans-projects-0894c3ff` — old project pending decommission after 48h rollback window. |
| Drag & drop | `@dnd-kit/*` | Powers the pipeline Kanban. |
| Charts | Recharts | Analytics page. |

## 3. Current state — what's built

### Pages (`app/`)
- `/` — Login (single hardcoded password, see §6 Risks)
- `/dashboard` — Landing page after login
- `/contacts` and `/contacts/[id]` — Lead list and detail
- `/pipeline` — Kanban board, one column per phase
- `/sequences` — Manage email sequences
- `/analytics` — Aggregate counts and charts
- `/settings` — Staff management UI

### API routes (`app/api/`)
- `leads` (+ `[id]`) — CRUD
- `activities` — Append-only timeline events per lead
- `sequences` (+ `[id]`) — CRUD on email sequences
- `staff` (+ `[id]`) — CRUD on team members
- `analytics` — Aggregates over leads
- `admin/clear` — Wipes leads + activities (preserves sequences & staff)
- `email/send` — One-off SendGrid send
- `email/sequence` — Triggers a sequence for a lead (**only sends step 0 today**)
- `webhook/opus1` — Inbound webhook from Opus1 `client_create` / `client_update` events

### Seeded content
- 8 email sequences hardcoded in `lib/data.ts` (`SEED_SEQUENCES`), one per Coleman phase, fully written with `{{firstName}}`, `{{assignedTo}}`, `{{instrument}}` interpolation tokens.
- No seed leads, activities, or staff — every install starts empty.

### Auxiliary
- `scripts/import-orchestra.mjs` — one-off CSV importer that wrote Orchestra "Active Members" export into Redis as leads.

## 4. Data model

Defined in `lib/types.ts`:

- **`Lead`** — `{ id, name, email, phone, status, phase, source, instrument, age, notes, createdAt, updatedAt, assignedTo, tags[], lastContactDate, nextActionDate }`
- **`Activity`** — `{ id, leadId, type, content, createdAt, createdBy, metadata }` where `type ∈ { call, email, note, phase_change, task }`
- **`Sequence`** — `{ id, phase, name, steps: SequenceStep[] }`, `SequenceStep = { day, subject, body }`
- **`StaffMember`** — `{ id, name, email, role, createdAt }`

Enums:
- **Phases** — `assess | admit | affirm | activate | acclimate | accomplish | adopt | advocate`
- **Sources** — `opus1 | website | referral | walk-in | social`
- **Instruments** — `guitar | drums | bass | vocals | keys | violin | ukulele`

## 5. Architecture

```
Opus1 → POST /api/webhook/opus1 → createLead() ──┐
Website form / manual entry ─────────────────────┤
                                                 ▼
                                          Upstash Redis
                                          (crm:leads,
                                           crm:activities,
                                           crm:sequences,
                                           crm:staff)
                                                 ▲
Staff UI (Next.js pages) ◄── /api/leads, /api/activities, …
                                                 │
                          /api/email/sequence ───┘
                                  │
                                  ▼
                              SendGrid → Lead's inbox
```

A single Redis key holds the whole array for each entity. Every write reads the array, mutates, and writes it back (`setArray`). Fine at academy scale; would not survive multi-tenant or 100k+ leads without restructuring.

## 6. Known gaps & risks

Ordered by severity.

### Security (must fix before any public link is shared)
1. **Plaintext password auth, actively shared across multiple staff.** `app/page.tsx:27` compares against literal `"lakehouse2026"` shipped in client JS. The "auth" flag lives in localStorage. There is no per-user identity, no audit trail, no session expiry, no rate limiting on the login. The owner plus multiple Lakehouse Music Academy team members are using this password today — every day it remains live widens the leak surface (shoulder-surf, Slack, email, sticky notes). This is now the **top M1 priority, ahead of the sequence engine**. **Action**: replace with real auth (NextAuth/Auth.js with email magic links is the lowest-friction option; Vercel's middleware can gate routes server-side). Target: M1.
2. ~~**Live Upstash credentials committed in `scripts/import-orchestra.mjs`.**~~ **CLOSED 2026-05-12.** Script now reads from env vars (M0 commit). Verified the leaked token was already invalidated server-side at the time of investigation — REST API returns `WRONGPASS` for the old credential. No active breach.
3. **No webhook auth on `/api/webhook/opus1`.** Any caller can POST a lead. **Action**: add a shared-secret header check (`x-opus1-signature` or similar) and reject without it. Target: M1.
4. **Admin clear endpoint (`/api/admin/clear`) has no auth gate** beyond client-side login. **Action**: server-side check before any destructive op. Target: M1.
5. **The current Upstash token has been transmitted through chat.** Lower urgency than the leaked-in-repo version (chat is private), but rotate it once the user is back in the Upstash UI as cleanup. Not blocking anything.

### Functional
6. **Sequence scheduler is missing.** Only step 0 fires. Steps with `day: 2`, `day: 5`, etc. are never sent. **Action**: add a queue (Upstash QStash or Vercel Cron + a `scheduled_sends` Redis key) that fires due steps and writes an `Activity` per send. Target: M2.
7. **No unsubscribe / suppression list.** SendGrid will eventually punish this. **Action**: include an unsubscribe link in every send and honor it via a `crm:suppressed` set. Target: M2.
8. **Phone number captured but unused.** No SMS or call logging. Twilio integration is a natural next step if voice/SMS matters to the academy. Target: M3.
9. **No outbound write-back to Opus1.** Phase changes and activities in the CRM don't propagate. One-way ingest only. Decide whether this is intentional or a gap. Target: M3 or out-of-scope.
10. **No booking integration.** Trial-lesson scheduling happens elsewhere. Calendly / Cal.com embed or direct Google Calendar integration would close the loop. Target: M3.

### Operational
11. ~~**No tests.**~~ **CLOSED M0** — Playwright smoke tests live in `e2e/`. Coverage still thin (3 smoke tests); expand in later milestones.
12. ~~**No CI.**~~ **CLOSED M0** — `.github/workflows/ci.yml` runs lint + build on PRs and pushes.
13. **No backup/export.** A Redis fat-finger wipes everything. **Action**: daily JSON export to Vercel Blob or S3. Target: M2.
14. **No structured logging or error tracking.** Add Sentry or Vercel Log Drains. Target: M2.

### UX polish
15. Dashboard is a landing page rather than an actionable "today" view. The product question in §1 — "who needs us today?" — isn't answered yet on `/dashboard`.
16. No filtering on the pipeline beyond phase columns.
17. No bulk actions (assign multiple leads, bulk-tag, bulk-archive).

### Recently fixed (2026-05-12)
- **Kanban drag corruption.** Dropping a card onto another card overwrote `phase` with the target's UUID. Lead vanished from the pipeline view but stayed in `/contacts`. Fixed in [app/pipeline/page.tsx](../app/pipeline/page.tsx) by resolving `over.id` to a real phase whether it's a column or a card. Added a 400-rejection in [app/api/leads/[id]/route.ts](../app/api/leads/%5Bid%5D/route.ts) as defense in depth. Repaired the 2 corrupted leads (Ryan Coccovizzo, Larry Iannaccone) back to `activate`.
- **Empty-column drops not registering.** `closestCorners` collision detection got confused when one column (Activate, 689 cards) dominated screen geometry. Replaced with a `pointerWithin` → `rectIntersection` strategy and moved the column droppable to wrap the whole container including the header.
- **Vercel account migrated.** Production moved from `juans-projects-0894c3ff` (under `juanjulio2-2046`) to `juan-ogradys-projects` (under `juan-9998`). Domain `lhcrm.site` transferred. Old project pending decommission after the 48-hour rollback window.

## 7. Roadmap

### Milestone 0 — Harden the basics (DONE 2026-05-12)
- [x] Removed hardcoded Upstash credentials from `scripts/import-orchestra.mjs` (reads env vars now). Verified old token already invalidated server-side — no real breach.
- [x] Documented env vars in `docs/ENV.md` and linked from `README.md`.
- [x] Added `.github/workflows/ci.yml` — `npm ci && npm run lint && npm run build` on PRs and pushes to main. Build uses env-var stubs.
- [x] Added Playwright smoke tests in `e2e/smoke.spec.ts` (login renders, unauth redirect, auth bypass). `npm run test:e2e`.
- [x] Downgraded two React 19 lint rules (`react-hooks/set-state-in-effect`, `react-hooks/static-components`) to warnings in `eslint.config.mjs` so CI doesn't trip on pre-existing perf debt in `Sidebar.tsx` / `ProtectedLayout.tsx`. Fixing those properly is a follow-up.

### Milestone 1 — Real auth + RBAC + split lead endpoints (next 2–3 weeks) — TOP PRIORITY
Multiple staff are using the shared password today. Every day of delay grows the leak surface. Do this before the sequence engine.

**Auth & RBAC**
- [ ] Replace localStorage auth with Auth.js + email magic links
- [ ] Role model with **three** roles stored on `StaffMember.role`:
  - `admin` — settings, staff mgmt, sequence approval, destructive ops
  - `staff` — create/edit leads, log activities, trigger manual sequences
  - `viewer` — read-only: dashboard, contacts list/detail, analytics. No edits, no sends, no settings.
- [ ] Server-side middleware to gate `/dashboard`, `/contacts`, `/pipeline`, `/sequences`, `/settings`, `/analytics`
- [ ] Server-side role check on every API route (not just session check). Mutating routes reject `viewer`. `/api/admin/*` and `/api/staff/*` require `admin`. Sequence approval requires `admin`.
- [ ] Per-user identity wired into `Activity.createdBy` (replace string "System") — surfaces who did what on the lead timeline
- [ ] Show "last updated by X at Y" on lead detail (multi-user editing is now a real concern)

**Lead-source endpoint split**
- [ ] `/api/webhook/opus1` — keep, but verify `x-opus1-signature` shared secret; reject without it; accept only the Opus1 payload shape (remove the CRM-native fallback)
- [ ] New `/api/leads/public` — accepts the website form submission; rate-limit by IP via Upstash; honeypot field; log every submission to `crm:public_submissions` for audit

**Bug**
- [ ] Fix `leads.filter` call in `app/pipeline/page.tsx` — crashes when `/api/leads` returns non-array (e.g. an error object). Guard with `Array.isArray(data) ? data : []` in `loadLeads`. Surfaced by the M0 Playwright run; unrelated to the drag-corruption bug fixed 2026-05-12.

### Milestone 2 — Sequence engine, shipped in DRAFT (2–4 weeks)
**Build the full engine, but every sequence starts in `approved: false` and the engine refuses to send.** This lets us ship the rails before the email copy is reviewed. Approving a sequence later = flipping a flag in the UI, not a code change.

- [ ] Scheduler: Upstash QStash *or* Vercel Cron + `crm:scheduled_sends` queue
- [ ] Worker route `/api/cron/process-sends` fires due steps and writes activities
- [ ] Unsubscribe link + `crm:suppressed` set, honored on every send
- [ ] Sequence start logs *all* future sends as `scheduled` activities, not just step 0
- [ ] **Hybrid trigger model**: add `autoStart: boolean` to `Sequence`. Phase transition fires the matching sequence automatically when `autoStart === true`; otherwise staff member sees a "Start sequence" button on the lead. Default: `true` for `assess` + `admit`, `false` for the other six.
- [ ] **DRAFT gate**: add `approved: boolean` (default `false`) to `Sequence`. The send worker must check this before every SendGrid call. When `approved === false`, log the would-be send as an Activity (`type: "email"`, `metadata.skipped: "sequence in draft"`) and **do not** call SendGrid. Only an admin can flip `approved` to true.
- [ ] **Copy-review notifications**: when a lead enters a phase whose sequence is in draft, push an entry to `crm:copy_review_queue` and show a dashboard banner ("N leads entered draft-sequence phases this week — review copy"). Fires for both auto and manual phases.
- [ ] `/sequences` UI shows clear "DRAFT — not sending" badge per sequence + "Approve and enable sending" button (admin-only)
- [ ] Daily backup of all Redis keys to Vercel Blob

### Milestone 3 — Close the loop (month 2)
- [ ] Two-way Opus1 sync (decide: phase changes, activities, both, neither)
- [ ] Booking integration (Calendly or Cal.com embed) on contact detail
- [ ] Twilio SMS sends + inbound logging
- [ ] **Dashboard rebuild around "who needs us today?"** — explicit buckets:
  - **Urgent** — `createdAt` < 24h ago AND no `Activity` yet (24h SLA clock is running)
  - **SLA missed** — `createdAt` > 24h ago AND no `Activity` yet (overdue first contact — escalate)
  - **Due today** — `nextActionDate` ≤ today AND status === `active`
  - **Stuck** — same `phase` for > 14 days with no recent activity
  - **New this week** — created in the last 7 days
  - Do **not** rely on `nextActionDate` alone for the SLA buckets; the importer sets it to +30d which would hide a missed first contact.
- [ ] Bulk actions on the contacts list

### Milestone 4 — Insights (month 3)
- [ ] Funnel velocity: avg days from `assess` → `activate`, etc.
- [ ] Source attribution: conversion rate by `LeadSource`
- [ ] Assignee performance: leads converted per staff member
- [ ] Cohort retention: % of `activate` leads still active at 30/60/90 days

## 8. Out of scope (for now)

- Multi-tenancy (other academies) — would require restructuring Redis keys and adding org-scoping everywhere
- Payments / billing — Opus1 owns this
- Student-facing portal — Canvas LMS owns this
- iOS/Android app

## 9. Open questions

| # | Question | Answer | Decision date |
|---|---|---|---|
| 1 | Who else uses the CRM today besides the original developer? | Owner + multiple Lakehouse team members are active users today. | 2026-05-12 |
| 1a | Are roles flat or distinguished? | Distinguished. Three roles: **Admin**, **Staff**, **Viewer** (read-only). | 2026-05-12 |
| 2 | Is the Opus1 webhook the only lead source, or will the public website form post too? | **Both.** Two endpoints: `/api/webhook/opus1` (HMAC-verified, Opus1 only) and `/api/leads/public` (rate-limited, website form). | 2026-05-12 |
| 3 | Should phase transitions trigger sequences automatically, or always require staff confirmation? | **Hybrid.** Auto-fire on `assess` + `admit`. Manual confirm on the other 6. Per-sequence `autoStart` flag. | 2026-05-12 |
| 3a | Exact auto/manual split? | Auto: `assess`, `admit`. Manual: `affirm`, `activate`, `acclimate`, `accomplish`, `adopt`, `advocate`. | 2026-05-12 |
| 4 | Is there a defined SLA for first contact after a new lead arrives? | **24 hours, faster is better.** Drives dashboard "urgent" vs "SLA missed" buckets. | 2026-05-12 |
| 5 | Are the seeded sequence email bodies the final approved copy or placeholders? | **Placeholders.** Engine ships in DRAFT — every sequence has `approved: false` and the worker refuses to call SendGrid until an admin approves. The user will be prompted (banner + queue) when leads enter draft-sequence phases so copy can be reviewed phase by phase. | 2026-05-12 |
| 6 | Is a read-only role needed in addition to Admin/Staff? | **Yes** — `viewer` role added. Read-only across dashboard, contacts, analytics. | 2026-05-12 |
