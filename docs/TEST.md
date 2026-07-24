# Real-job QA checklist (professional-ready)

Use this for a wedding-scale dry run before production delivery.

For the first **3–5 photographers**, also follow [DESIGN_PARTNER.md](./DESIGN_PARTNER.md).

## Prerequisites

1. Apply SQL (idempotent): `./scripts/supabase-apply-schema.sh all`  
   Or paste newest files in Supabase SQL Editor, including:
   - `features-raw-pipeline.sql`
   - `features-project-memory.sql`
   - `features-project-tags.sql`
   - `features-proofing-complete.sql`
2. Env: Supabase URL + anon + **service role** (client originals + emails)
3. Optional: `RESEND_API_KEY` for photographer notifications
4. Optional: `CRON_SECRET` + Vercel cron → `GET /api/cron/process-previews`

## P0-1 — RAW delivery loop

| # | Case | Expect |
|---|------|--------|
| 1 | JPEG-only batch | Contact sheet shows previews; client hearts work |
| 2 | Paired `DSC_001.jpg` + `DSC_001.CR3` | One shot, JPEG+RAW badge, display never RAW |
| 3 | RAW-only | Placeholder “Preview pending”; no crash |
| 4 | Mixed 100+ | Pairing by basename; register succeeds in chunks |
| 5 | Client download (originals on) | ZIP has JPEG (+ RAW when paired); respects expiry |
| 6 | Originals off / expired | Download blocked with clear message |
| 7 | Photographer Download menu | Full / proof / RAW / JPEG+RAW variants |

## P0-2 — Upload reliability

| # | Case | Expect |
|---|------|--------|
| 1 | Progress | `done/total · failed · speed` while uploading |
| 2 | Force fail (offline mid-batch) | Failed listed; **Retry failed** re-uploads only those |
| 3 | beforeunload | Browser warns if navigating mid-upload |
| 4 | Storage limit | Upgrade modal; partial register safe |

## P0-3 — Preview worker

| # | Case | Expect |
|---|------|--------|
| 1 | JPEG without client derivatives | **Build previews** or cron → `preview_key` / `thumbnail_key` set, status ready |
| 2 | Pure RAW | Skipped / remains pending; gallery placeholder |
| 3 | Cron | `GET /api/cron/process-previews` with Bearer `CRON_SECRET` returns counts |

## P0-4 — Proofing completion

| # | Case | Expect |
|---|------|--------|
| 1 | Client **I’m done selecting** | Banner on project hub; Proofing tab “Client finished” |
| 2 | Hit selection limit | Auto-complete (`via=limit`) |
| 3 | Project **final** | Client cannot change hearts; RPC `locked` |
| 4 | Mobile client | Toolbar wraps; submit works |

## P0-5 — Photographer email

| # | Case | Expect |
|---|------|--------|
| 1 | Resend configured | Email on submit/complete with project link |
| 2 | Resend missing | Submit still succeeds; no crash |
| 3 | Share create | Still works if email path fails |

## P1 smoke

| # | Case | Expect |
|---|------|--------|
| 1 | Project tags | Create with Wedding; filter library `?tag=` |
| 2 | Free plan | 3 active projects still enforced |
| 3 | Personal workspace | No team-required errors |

## Acceptance (definition of done)

- [ ] 300–500 mixed JPEG/RAW upload completes
- [ ] Client mobile proofing + “I’m done”
- [ ] Photographer notified (or graceful no-email)
- [ ] RAW/JPEG download permission + expiry correct
- [ ] Pending previews don’t crash gallery
- [ ] Free-first personal accounts still work
