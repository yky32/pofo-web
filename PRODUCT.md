# Pofo — Product Document

| | |
|--|--|
| **Product** | Pofo (`pofo-web`) |
| **Repo** | https://github.com/yky32/pofo-web |
| **Status** | MVP1 shipped in app · MVP2 defined |
| **Sources** | DESIGN archive (merged), MVP2 checklist PDF, README, setup docs |
| **Last updated** | 2026-07-24 (URL naming `/g` `/s` documented) |

This is the **single product source of truth**: vision, domain language, MVP1 shipped status, MVP2 scope, and engineering guardrails. Day-to-day setup stays in `README.md` / `supabase/SETUP.md`.

---

## Table of contents

1. [Vision & positioning](#1-vision--positioning)
2. [Core philosophy](#2-core-philosophy)
3. [Domain language](#3-domain-language)
4. [Personas & JTBD](#4-personas--jtbd)
5. [MVP1 — shipped](#5-mvp1--shipped)
6. [MVP2 — theme & success](#6-mvp2--theme--success)
7. [MVP2 checklist](#7-mvp2-checklist)
8. [RAW + preview pipeline](#8-raw--preview-pipeline)
9. [Proofing product rules](#9-proofing-product-rules)
10. [Notification product rules](#10-notification-product-rules)
11. [UX & visual direction](#11-ux--visual-direction)
12. [Architecture snapshot](#12-architecture-snapshot)
13. [Security (product view)](#13-security-product-view)
14. [Non-goals](#14-non-goals)
15. [Metrics & definition of done](#15-metrics--definition-of-done)
16. [Roadmap beyond MVP2](#16-roadmap-beyond-mvp2)
17. [Doc map](#17-doc-map)
18. [Glossary](#18-glossary)
19. [Open decisions (resolved)](#19-open-decisions-resolved)
20. [Domain fields (MVP summary)](#20-domain-fields-mvp-summary)

---

## 1. Vision & positioning

**Pofo** is the simplest, most beautiful, and most affordable **client delivery** tool for photographers.

Focused on **“job done → deliver”** — wedding and pre-wedding photographers who need a professional path after the shoot, without Google Drive chaos or bloated platforms.

**Goal:** The lightest, best client delivery experience for photographers.

| vs | Pofo difference |
|----|-----------------|
| Google Drive / Dropbox | Purpose-built delivery + proofing, not a file dump |
| Pixieset / ShootProof-class | Lighter, cheaper, faster setup |
| WeTransfer | Persistent private gallery + selection, not one-shot zip |

**Primary market (MVP)**

- Wedding & pre-wedding photographers (solo or small studio)
- High photo counts (often 100–500+ per job)
- Need: private share → client select → final deliver → optional portfolio

---

## 2. Core philosophy

| Principle | Meaning | Design implication |
|-----------|---------|-------------------|
| **Flexibility first** | Photographers define how photos are grouped | Containers are free-named concepts |
| **Simplicity** | Low friction after a shoot | Defaults + presets; power options secondary |
| **Beauty** | Client experience feels premium | Photo-first UI; calm studio aesthetic |
| **Reusability** | Personal → Team later | `owner_id` today; team-ready schema |

### Product rules of thumb

1. Prefer **one more Container** over one more product mode.
2. Prefer **short-lived signed URLs** over public buckets.
3. Prefer **photographer control** over client accounts (MVP: client is anonymous via token).
4. Prefer **premium empty states** over dense admin chrome.
5. **Never** stream multi-GB uploads through the Next.js server body — direct-to-storage only.

---

## 3. Domain language

```
Account (Photographer / Studio profile)
  └── Project              ← one job / wedding / event
        └── Container[]    ← flexible groups of photos
              └── Shot[]   ← individual photo (JPEG / RAW / paired / final)
        └── ShareLink[]    ← private access for clients
        └── PortfolioItem  ← optional public showcase
```

| Concept | Meaning |
|---------|---------|
| **Project** | One client job. Lifecycle: `draft → shared → proofing → final → archived` |
| **Container** | Named group of shots (e.g. Main Gallery, Raw Files, Final Delivery). Free-form, not a fixed enum |
| **Shot** | One logical photo. May carry JPEG + RAW + preview derivatives |
| **Share link** | Unguessable token URL; optional password, expiry, original/RAW download window |
| **Proofing** | Client hearts / selects favorites under a selection limit |
| **Portfolio** | Photographer-published shots on public studio page |

### Project status

| Status | Meaning |
|--------|---------|
| `draft` | Setup / uploading; not client-ready |
| `shared` | Link issued; waiting for engagement |
| `proofing` | Client is selecting |
| `final` | Delivery complete; selections locked (MVP2 rule) |
| `archived` | Hidden from default lists |

### Core end-to-end flow

```
Upload → Project → Share link
  → Client views + selects
  → Photographer exports selects / retouches
  → Final delivery + optional original download window
  → Portfolio (optional)
```

---

## 4. Personas & JTBD

### Photographer (primary)

| Job | Success looks like |
|-----|-------------------|
| Deliver a job set securely | Client opens one link; no Drive folders |
| Get selects without chat chaos | Hearts + clear count; export ZIP / list |
| Control originals | RAW/original only when enabled, time-limited |
| Reuse best work | Publish selects → portfolio |

### Client (secondary)

| Job | Success looks like |
|-----|-------------------|
| See photos beautifully | Full-bleed, fast, mobile-first |
| Choose favorites easily | Tap heart / bulk select; know remaining quota |
| Download when allowed | Clear buttons; no technical jargon |

### Studio teammate (future)

Shared Project access without sharing login passwords.

---

## 5. MVP1 — shipped

**Status:** App feature-complete for the core delivery loop. Runtime requires Supabase SQL applied (`schema` + `features-p1-p2` + `features-p3`).

| Area | Status | Notes |
|------|--------|--------|
| Auth (email + Google/Apple) | Done | Supabase Auth |
| Create project | Done | Dashboard |
| Batch upload (JPEG/PNG/WebP) | Done | Concurrent pool; Supabase Storage default; R2 switchable |
| Contact sheet | Done | Mosaic, bulk delete, studio notes/flags |
| Share links | Done | Create / revoke / password / expiry / one-time secret reveal |
| Email client link | Done | Resend optional; else `mailto:` |
| Client gallery | Done | Hearts, limit, watermark “PREVIEW”, bulk select |
| Photographer proofing tab | Done | Selected shots list |
| Download | Done | Full gallery ZIP **or** client finished proof ZIP |
| Status control | Done | Free status + color badges on cards |
| Delivery stepper | Done | Upload → Share → Proofing → Final |
| Share analytics | Done | View count / last viewed (SQL) |
| Original download window | Done | Share-link flag + client download of hearted photos |
| Portfolio publish | Done | From proofing → dashboard Portfolio → `/s/{slug}` |
| Project card covers | Done | First photo as cover |

### MVP1 gaps (known)

| Gap | Notes |
|-----|--------|
| True RAW pipeline | Accept/store/pair RAW; never render RAW as `<img>` — **MVP2** |
| Filename list export | Removed from UI (was confusing “List”); may return as secondary export under Download menu |
| SQL must be applied manually | See [Appendix C](#appendix-c--sql-apply-order-runtime) / `supabase/SETUP.md` |
| Background Sharp worker | Not required for MVP1 |

### Routes (as shipped)

| Route | Purpose |
|-------|---------|
| `/` | Marketing |
| `/login`, `/signup` | Auth |
| `/dashboard` | Overview |
| `/dashboard/galleries` | Project list (UI still says “Projects”) |
| `/dashboard/galleries/[id]` | Project hub |
| `/dashboard/portfolio` | Portfolio manager |
| `/dashboard/settings` | Studio profile / slug |
| `/g/[token]` | **G**allery — private client share (see below) |
| `/s/[slug]` | **S**tudio — public brand / portfolio (see below) |

### Public URL naming: `/g/` vs `/s/`

Short path prefixes keep share links clean and memorable. Letters are **product mnemonics**, not random.

| Prefix | Stands for | Who uses it | What the segment is |
|--------|------------|-------------|---------------------|
| **`/g/`** | **G**allery (client **g**allery / private **g**allery delivery) | **Client** (and photographer previewing the client view) | **`token`** — long unguessable share-link secret (not a brand name) |
| **`/s/`** | **S**tudio (public **s**tudio brand page) | **Anyone** (marketing / discovery) | **`slug`** — human-readable studio handle from `profiles.slug` or (later) `teams.slug` |

#### `/g/{token}` — private client gallery

```
https://app.example/g/xK9mQ2…   ← only people with this link (+ password if set)
```

- **Why `g`:** “Gallery” is the client-facing product surface — browse, proof, optional download. Keeps the URL short when pasted into WhatsApp / email.
- **Why a token, not a slug:** Access is **capability-based** (secret URL), not public SEO. Revoke / expire / password without changing brand identity.
- **Never** put human-readable project titles alone in this path (guessable / leaky).

#### `/s/{slug}` — public studio page

```
https://app.example/s/northlight   ← public brand presence
```

- **Why `s`:** “Studio” — the photographer’s (or company team’s) **public** face: name, portfolio grid, how clients find them.
- **Why a slug:** Readable, brandable, stable (`profiles.slug` personal; `teams.slug` company). Safe to print on cards / bio links.
- **Not** a private delivery channel — no proofing, no share-token secrets here.

#### Quick contrast

| | `/g/…` | `/s/…` |
|--|--------|--------|
| **Meaning** | Gallery (private job delivery) | Studio (public brand) |
| **Audience** | Specific client | Public / prospects |
| **Identifier** | Random **token** | Chosen **slug** |
| **Auth** | Token (+ optional password cookie) | None (published portfolio only) |
| **Example job** | “Here’s your wedding gallery” | “Visit our studio page” |

#### Related forms (same idea)

| Form | Meaning |
|------|---------|
| `{slug}.pofo.app` (subdomain) | Same public **studio** brand as `/s/{slug}` when root domain is configured |
| `/dashboard/*` | Photographer **app** (authenticated) — not public |

**Product rule:** Private delivery always goes through **`/g/`**. Public marketing / portfolio always through **`/s/`** (or studio subdomain). Do not conflate them in copy or support docs.

---

## 6. MVP2 — theme & success

**Theme:** Real files + real delivery + notifications + light branding.

**Goal:** Photographer can finish a **wedding delivery without Google Drive / WhatsApp file chaos**.

### Success criteria (one real job)

- [ ] Upload **JPEG + RAW** (hundreds of files)
- [ ] Create private link in minutes
- [ ] Client selects ~10–40 shots
- [ ] Photographer exports selected ZIP + filename list
- [ ] Upload / mark Final set
- [ ] Client **time-limited** download of originals/RAW
- [ ] Publish picks to portfolio
- [ ] No Drive required end-to-end

### Definition of done (MVP2)

- [ ] One internal test wedding (500+ files, mixed JPEG/RAW)
- [ ] Client proofing path tested on **mobile**
- [ ] Download path tested **after expiry** (must fail cleanly)
- [ ] README + this PRODUCT.md aligned
- [ ] Migration scripts documented under `supabase/`

---

## 7. MVP2 checklist

### P0 — Must ship

#### RAW + preview pipeline

- [ ] Accept RAW uploads (CR2, CR3, NEF, ARW, DNG, RAF, ORF, RW2, PEF, SRW, …)
- [ ] Raise size limit for RAW (e.g. **100MB**; JPEG stays ~30MB)
- [ ] Pair JPEG + RAW by basename → one logical Shot
- [ ] Store `storage_key` / `raw_key` / `preview_key` / `thumbnail_key`
- [ ] Client gallery **never** renders RAW directly
- [ ] Display priority: `thumbnail` → `preview` → JPEG original
- [ ] Download split: JPEG vs RAW (permission-gated)
- [ ] Share link: allow original download + expiry window (exists; extend for true RAW)
- [ ] Placeholder UI when preview pending
- [ ] SQL migration for new columns + indexes

#### Proofing made real

- [x] Selection limit enforced (project setting)
- [x] Client hearts + bulk select
- [x] Photographer selection list
- [x] Selection count badge
- [x] Export selected ZIP
- [ ] Export selected filename list (txt/csv) — restore as secondary action under Download
- [ ] “Client finished selecting” signal (manual submit and/or auto at limit)
- [ ] Lock selections when status = `final`

#### Upload reliability

- [x] Concurrent pool (4–6)
- [x] Per-file retry (2–3×)
- [x] Continue on failure
- [ ] Retry failed only (UI)
- [ ] Progress: `done / total · failed · speed`
- [x] Chunked DB register (50–100)
- [ ] `beforeunload` warning while uploading

#### Delivery status machine

- [x] `draft → shared → proofing → final → archived`
- [x] One-click status control
- [x] Status on project card
- [ ] Final **locks** client selection edits

### P1 — Should ship in MVP2

#### Notifications (email first)

- [x] Email client when gallery is shared (basic Resend / mailto)
- [ ] Email photographer when selections change / reach limit
- [ ] Email photographer when client opens link (optional, rate-limited 1/day/link)
- [ ] Solid email templates (brand + project title + CTA)

#### Light branding

- [x] Studio name on client gallery footer
- [ ] Optional logo on client gallery header
- [ ] Custom share message field (email / copy link)

#### Portfolio loop

- [x] From Final / selected shots → publish to portfolio
- [x] Public studio page with portfolio grid
- [ ] Ensure display URLs still work with new RAW/preview keys

### Nice if time

- Client-side embedded JPEG extract from RAW (best-effort)
- Background worker for pending previews
- Gallery virtualization for 1000+ shots
- Storage quota warning
- WhatsApp notify (later; email first)

### Explicitly NOT in MVP2

- Team accounts / roles  
- Contracts / invoices / deposits  
- Print store  
- Full CRM  
- AI culling  
- Full video delivery pipeline  
- Billing (design sketch only)

### Engineering guardrails (always)

- Direct upload to storage only (never through Next body)
- Private objects + short-lived signed URLs
- All downloads check share token + expiry + allow-original
- Idempotent SQL
- Keep personal-account schema team-ready (`owner_id` stays)

---

## 8. RAW + preview pipeline

### Goal

Photographers upload JPEG and/or RAW; clients always see web previews; original/RAW download is permission- and time-controlled.

### Design summary

- One logical **Shot** per photo
- Files: `storage_key` (primary), optional `raw_key`, `preview_key`, `thumbnail_key`
- `kind`: `jpeg | raw | paired | final | preview`
- `processing_status`: `ready | pending | failed`
- Gallery display **never** uses RAW bytes as `<img>`

### Preferred object key layout

```
{ownerId}/projects/{projectId}/{shotUuid}/original.{ext}
{ownerId}/projects/{projectId}/{shotUuid}/raw.{ext}
{ownerId}/projects/{projectId}/{shotUuid}/preview.jpg
{ownerId}/projects/{projectId}/{shotUuid}/thumb.jpg
```

Backward compatible with older flat keys.

### Implementation tickets (MVP2)

| # | Title | Outcome |
|---|--------|---------|
| 1 | Schema | `raw_key`, `preview_key`, `processing_status`, `processing_error`; types + docs |
| 2 | Storage key helpers | Derivative paths; delete shot cleans all keys best-effort |
| 3 | `prepareBatchUpload` + RAW | MIME/extension list; JPEG 30MB / RAW 100MB; `assetRole` |
| 4 | Client pairing | Group by basename; `paired` / jpeg-only / raw-only pending |
| 5 | `registerUploadedShots` | Write full key set + kind + status; chunk insert |
| 6 | Client-side previews | Canvas thumb/preview for browser-decodable types; optional RAW embed extract |
| 7 | `withDisplayUrls` priority | thumb → preview → jpeg storage; never RAW |
| 8 | Download permissions | Token + `allow_original_download` + expiry; JPEG and/or RAW by kind |
| 9 | Photographer UX copy | Upload guidance; paired/pending badges; empty preview |
| 10 | QA matrix | JPEG-only, RAW-only, paired, 300+ mixed, mobile, expiry fail, delete cleanup, legacy rows |

### Display URL priority

1. `thumbnail_key` → `thumb_url`  
2. `preview_key` → `display_url`  
3. JPEG/PNG `storage_key` → `display_url`  
4. **Never** RAW key as display  

### Download rules (share link)

Requires: active token + password unlock if needed + `allow_original_download` + window not expired.

| Shot kind | Download options |
|-----------|------------------|
| `paired` | JPEG and/or RAW |
| `raw` | RAW |
| `jpeg` | Original JPEG |
| Proof ZIP | Defaults to preview/JPEG; optional include RAW later |

### Out of scope for this ticket set

- Full server-side libraw worker  
- Billing storage quotas  
- Team shared uploads  
- Video  

---

## 9. Proofing product rules

### Definitions

| Term | Definition |
|------|------------|
| **Proofing** | Client marks favorites / selects shots in a shared gallery |
| **Selection** | A shot marked for retouch / keep |
| **Selection limit** | Max selections for a project (e.g. 10–40) |
| **Proof complete** | Client finished selecting (manual confirm and/or auto at limit) |

### 9.1 Who can select

- Valid, active share link only  
- Password gate must pass if enabled  
- Expired / revoked links cannot select  

### 9.2 What can be selected

- Only shots in the client gallery payload  
- Pending-preview shots selectable by default if the shot exists  
- Studio-only / non-visible shots never shown  

### 9.3 Selection limit

- Per project: `selection_limit` (default e.g. 20–40)  
- UI always shows `selected / limit`  
- At limit: block further selects; deselect frees slots  
- Photographer can change limit until status = `final` (policy: lock after final)

### 9.4 Interactions

- Heart / tap to toggle one shot  
- Bulk select mode (shipped MVP1)  
- Optimistic UI + rollback on failure  
- Debounce rapid taps where needed  

### 9.5 Photographer visibility

Dashboard must show:

- Total selected count  
- List of selected shots  
- Selected timestamps  
- Export actions  

### 9.6 Export (photographer)

1. **ZIP of selected previews/JPEG** — fast retouch handoff ✅  
2. **Filename list** `.txt` / `.csv` — Lightroom filter (restore under Download menu)  
3. Later: ZIP including RAW for selected paired shots  

### 9.7 Locking by status

| Project status | Client can change selections? |
|----------------|-------------------------------|
| `shared` | Yes |
| `proofing` | Yes |
| `final` | **No** (locked) |
| `archived` | No |

Photographer unlock: move status back (`final → proofing` allowed).

### 9.8 Proof complete signal

Support **either**:

- **Auto:** when selected count hits limit → set `proof_completed_at`  
- **Manual:** client button “I’m done selecting”  

**Recommendation:** show button always; auto-mark when limit reached; notify photographer on first completion; later changes as “updated”.

### Optional data fields

```text
projects.proof_completed_at timestamptz null
projects.proof_locked boolean default false
share_links.last_notified_selection_at timestamptz null
```

### Acceptance tests (proofing)

- [ ] Client cannot exceed selection limit  
- [ ] Deselect frees capacity  
- [ ] Photographer sees selections after refresh  
- [ ] Export ZIP matches selected IDs  
- [ ] Final status blocks client toggle  
- [ ] Share email arrives with working link  
- [ ] Selection-complete email fires once (not every tap)  
- [ ] Expired link cannot select or download  

---

## 10. Notification product rules

### Channels (MVP2)

- **Email only**  
- WhatsApp / SMS = later  

### Events

| Event | To | Trigger | Notes |
|-------|-----|---------|--------|
| **A. Gallery shared** | Client | Photographer emails link / notify | Studio name, title, CTA, password hint, expiry |
| **B. Client opened gallery** | Photographer | First view per link per day | Throttle max 1 email/day/link |
| **C. Selection updated** | Photographer | First select / hits limit / quiet period (~10 min debounce) | Count / limit + dashboard CTA |
| **D. Proof submitted** | Photographer | Submit button or auto-complete | High priority; export CTA |
| **E. Original window ending** | Client and/or photographer | 24h before `original_expires_at` | Optional |

### Do not email in MVP2

- Every heart tap  
- Every page scroll  
- Marketing digests  

### Identity & privacy

- Prefer photographer-provided client email on share form  
- Optional: client enters email only for receipt  
- No public exposure of personal photographer email beyond studio branding  

### Failure handling

- Email failure **must not** block share link creation  
- Log failure; soft UI warning  

---

## 11. UX & visual direction

### Principles

- **Photo-first** — imagery dominates; chrome stays quiet  
- **Simple & neat** — short labels, few primary actions  
- **Warm studio aesthetic** — paper/cream, stone ink, soft shadows  
- **Premium client feel** — full-bleed covers, mosaic, clear selection  
- **Easy** — wedding-workflow defaults  

### Tokens (product)

| Token | Direction |
|-------|-----------|
| Background | Warm paper / cream |
| Foreground | Soft charcoal ink |
| Primary CTA | Near-black pill (`rounded-full`) |
| Cards | Soft paper + light ring |
| Headings | Editorial serif |
| UI type | Clean sans |
| Brand | Aperture mark + “Pofo” |

### Key patterns

| Pattern | Use |
|---------|-----|
| Cover hero | Project & client entry |
| Gallery card | Project list + status chip (no outline ring) |
| Contact sheet | Photographer mosaic |
| Masonry | Client browse |
| Status badge | Color-coded solid pills |
| Liquid-glass dialogs | Confirms / share panel |

### Content tone

- Short, calm, non-technical  
- Avoid “bucket”, “object key”, “RLS” in UI  
- Use photographer language: Project, Share, Select, Final, Portfolio  

---

## 12. Architecture snapshot

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router |
| Mutations | Server Actions |
| Auth / DB | Supabase (Postgres + RLS + Auth) |
| Storage | Supabase Storage default; **Cloudflare R2** optional via env |
| Derivatives | Client canvas today; Sharp worker later |
| UI | Tailwind + shadcn |
| Deploy | Vercel + GitHub Actions |

### Upload architecture (scale)

```
Browser → concurrent PUT → private storage
       → chunked registerUploadedShots (50–100)
       → (later) async preview/thumb worker
```

Never pipe multi-GB through Next.js. See `docs/BATCH_UPLOAD.md`.

### Storage switch

| Backend | When |
|---------|------|
| Supabase Storage | Default MVP |
| R2 | Set `R2_*` env → automatic flip via `storage.ts` |

Always store **object keys**; mint **signed `display_url`** at read time.

---

## 13. Security (product view)

| Threat | Mitigation |
|--------|------------|
| Link guessing | Long random tokens |
| Over-sharing | Password + expiry + revoke |
| RAW leak | Separate flag + shorter window + never display RAW as image |
| Hotlinking | Signed URLs, short TTL |
| Photographer data leak | RLS by `owner_id` |
| Client abuse | Token-validated RPCs / service-role path; rate limits later |

**Roles**

| Role | Access |
|------|--------|
| Photographer | Own projects full CRUD |
| Client | Share token (+ password cookie); read gallery + write selections only |
| Public | Published portfolio on `/s/{slug}` |

Service role key is **server-only** (required for private client images).

---

## 14. Non-goals

### MVP1 / MVP2

- Full DAM / Lightroom replacement  
- Client messaging / chat product  
- Complex multi-brand white-label  
- Offline native apps  
- Real-time collaborative editing  
- Print store  
- Full CRM / contracts / invoices  
- AI culling as a blocker for delivery  

### Explicitly later (post-MVP2)

- Team accounts & multi-user studios  
- Custom domains for portfolio  
- Billing & storage tiers  
- Resumable multipart for huge RAWs (if needed)  
- Video delivery  
- WhatsApp / SMS notifications  

---

## 15. Metrics & definition of done

### Qualitative

- Photographer delivers a private set the **same day** after offline edit  
- Client selects favorites **without an account**  
- Experience feels more premium than Drive / WeTransfer  
- Schema does not block Team later  

### Quantitative (when analytics exist)

| Metric | Initial target |
|--------|----------------|
| Signup → first share link | < 15 minutes |
| Client open → first selection | < 2 minutes |
| Upload success rate | > 99% |
| Support: “can’t find files” | Low vs Drive baseline |

### MVP2 DoD (repeat)

One real 500+ mixed JPEG/RAW wedding · mobile client proof · download fails after expiry · docs updated · SQL migrations idempotent.

---

## 15b. Account opening / workspaces (foundation)

**One login, multiple workspaces** — personal (default) + optional studio team(s).

| Piece | Status |
|-------|--------|
| Personal signup (default) | ✅ unchanged |
| Team signup intent + create team | ✅ foundation |
| OAuth knows workspace type | ✅ via callback `?next=` (team → `/dashboard/onboarding/studio`); no cookie |
| `teams` / `team_members` + `projects.owner_type` | ✅ SQL `features-teams.sql` |
| Workspace switcher (sidebar) | ✅ minimal |
| Settings → create studio | ✅ |
| Project create uses current workspace | ✅ |
| Full invite/accept UI | ❌ later |
| Move personal project → team | ❌ later |

**Semantics**

- `owner_type=user` → `owner_id` = `profiles.id` (all existing rows)
- `owner_type=team` → `owner_id` = `teams.id`
- Personal projects never visible in a team workspace and vice versa
- `profiles.slug` = personal brand; `teams.slug` = company brand

Apply: `supabase/features-teams.sql`

---

## 16. Roadmap beyond MVP2

| Phase | Focus |
|-------|--------|
| **Team** | Invites, roles UI, shared projects polish |
| **Public brand** | Custom domain, OG images, SEO portfolio |
| **Smart assist** | Optional AI tags / face clusters — never block delivery |
| **Billing** | Free tier limits; Pro storage / seats |
| **Hardening** | Rate limits, cleanup jobs, E2E tests, monitoring |

---

## 17. Doc map

| Document | Role |
|----------|------|
| **`PRODUCT.md`** | **Canonical product + MVP1/MVP2** (this file) |
| `README.md` | Setup, stack, quick start |
| `supabase/SETUP.md` | Supabase env + full SQL apply order |
| `docs/BATCH_UPLOAD.md` | Large-batch upload / R2 switch engineering |
| `docs/CI.md` | GitHub Actions / Vercel secrets |
| `docs/design/` | Visual system version notes (Studio Paper v1) |

When product decisions change, **update PRODUCT.md first**, then implement.

---

## 18. Glossary

| Term | Definition |
|------|------------|
| **Project** | One job / event delivery unit |
| **Container** | Named group of Shots inside a Project |
| **Shot** | Logical photo (may have multiple file keys) |
| **Share link** | Private client URL + policy flags |
| **Proofing** | Client selection of favorites |
| **Paired shot** | JPEG + RAW same basename |
| **Portfolio** | Photographer public showcase |
| **Concept** | Free-form label for a Container’s purpose |
| **Owner** | Photographer profile controlling a Project (MVP) |
| **Team** | Future multi-user studio entity |

---

## 19. Open decisions (resolved)

| # | Question | Decision |
|---|----------|----------|
| 1 | Where does `selection_limit` live? | **Project** (MVP). Optional Container/link override later |
| 2 | Empty share-link container allow-list? | **All** containers with `is_client_visible_default` |
| 3 | JPEG + RAW rows? | **One logical Shot** with multiple keys (MVP2 pairing) |
| 4 | Client word for Container? | Show **name**; no forced “Album” product mode |
| 5 | Photographer auth? | Password + Google/Apple OAuth |
| 6 | HEIC at MVP? | Best-effort; convert offline preferred |
| 7 | Zip of selects? | **Shipped** (full + proof ZIP) |
| 8 | Status auto-transitions? | Soft: create link → `shared`; first select → `proofing` |
| 9 | Final locks client selects? | **Yes** (MVP2 rule) |
| 10 | Visual system | **Studio Paper v1** (see `docs/design/v1`) |

---

## 20. Domain fields (MVP summary)

### profiles
`id`, `display_name`, `studio_name`, `slug`, `avatar_url`, `providers[]`, timestamps

### projects
`id`, `owner_id`, `title`, `client_name`, `description`, `status`, `selection_limit`, timestamps  
*(optional later: `proof_completed_at`, `proof_locked`, `cover_shot_id`, `team_id`)*

### containers
`id`, `project_id`, `name`, `sort_order`, `is_client_visible_default`, timestamps  
*(optional later: free-form `concept`, `selection_limit`)*

### shots
`id`, `project_id`, `container_id`, `owner_id`, `kind`, `storage_key`, `preview_url`, `filename`, `mime_type`, `size_bytes`, `width`/`height`, `sort_order`, `studio_note`, `studio_flag`, `thumbnail_key`  
*(MVP2: `raw_key`, `preview_key`, `processing_status`, `processing_error`)*

### share_links
`id`, `project_id`, `token`, `password_hash`, `expires_at`, `is_active`, `view_count`, `last_viewed_at`, `last_email_to`/`at`, `allow_original_download`, `original_expires_at`

### shot_selections
`id`, `project_id`, `share_link_id`, `shot_id`, `created_at` — unique `(share_link_id, shot_id)`

### portfolio_items
`id`, `owner_id`, `shot_id`, `project_id`, `title`, `caption`, `is_published`, `sort_order`, `created_at`

### Project presets (optional UX sugar)

| Pack | Containers |
|------|------------|
| Wedding default | Main Gallery, (future) Raw Files, Final Delivery |
| Pre-wedding light | Main Gallery, Final Delivery |
| Blank | Single Main Gallery (current app default) |

---

## Appendix A — Happy path (photographer)

```
1. Sign up / log in
2. Create Project (title, client, selection limit)
3. Upload Shots (JPEG; MVP2: + RAW paired)
4. Create Share Link (password / expiry / original window)
5. Email or copy link → client
6. Monitor proofing; export ZIP (+ list)
7. Retouch offline; mark Final / upload finals
8. Optional: original download window for client
9. Publish best frames → Portfolio
```

## Appendix B — Happy path (client)

```
1. Open /g/{token}
2. Password if required
3. Browse mosaic (watermarked previews)
4. Heart favorites (bulk optional)
5. Optional: “I’m done” / auto at limit
6. Optional: download allowed originals before window ends
```

## Appendix C — SQL apply order (runtime)

1. `supabase/schema.sql`  
2. `supabase/storage.sql`  
3. `supabase/profiles-providers.sql`  
4. `supabase/share-gate.sql`  
5. `supabase/features-p1-p2.sql`  
6. `supabase/features-p3.sql`  
7. `supabase/features-teams.sql` (workspaces / teams)  
8. Optional: `supabase/slug.sql`  
9. **MVP2:** new RAW/preview migration (to be added)

Vercel must include `SUPABASE_SERVICE_ROLE_KEY` for private client images.

---

**Product status:** MVP1 complete in product surface · MVP2 is the next delivery milestone (real RAW + notifications + proof lock).

**Last updated:** 2026-07-24
