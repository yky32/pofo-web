# Pofo Design Document

| | |
|--|--|
| **Product** | Pofo (`pofo-web`) |
| **Repo** | https://github.com/yky32/pofo-web |
| **Status** | Superseded for product scope by **[PRODUCT.md](./PRODUCT.md)** — this file is the deep design archive |
| **Last updated** | 2026-07-23 (archive); product wrap-up 2026-07-24 |

---

## Table of contents

1. [Product Vision](#1-product-vision)
2. [Core Philosophy](#2-core-philosophy)
3. [Key Concepts](#3-key-concepts)
4. [Personas & Jobs-to-be-Done](#4-personas--jobs-to-be-done)
5. [User Flows (MVP)](#5-user-flows-mvp)
6. [Information Architecture](#6-information-architecture)
7. [UX & Visual Design](#7-ux--visual-design)
8. [Domain Model (detailed)](#8-domain-model-detailed)
9. [Data Model & Schema](#9-data-model--schema)
10. [Security & Access Control](#10-security--access-control)
11. [Storage & Upload Pipeline](#11-storage--upload-pipeline)
12. [Share Links & Client Access](#12-share-links--client-access)
13. [Proofing & Selections](#13-proofing--selections)
14. [Portfolio](#14-portfolio)
15. [Application Architecture](#15-application-architecture)
16. [API Surface (Server Actions / Routes)](#16-api-surface-server-actions--routes)
17. [Feature Scope](#17-feature-scope)
18. [Migration from Current Scaffold](#18-migration-from-current-scaffold)
19. [Future Extensions](#19-future-extensions)
20. [Non-Goals](#20-non-goals)
21. [Success Criteria & Metrics](#21-success-criteria--metrics)
22. [Implementation Phases](#22-implementation-phases)
23. [Open Questions](#23-open-questions)
24. [Glossary](#24-glossary)
25. [Related Files](#25-related-files)

---

## 1. Product Vision

Pofo is the simplest, most beautiful, and most affordable client delivery tool for photographers.

Focused on **"Job 完即 deliver"** — helping wedding and pre-wedding photographers deliver photos professionally and efficiently after a shoot, without Google Drive chaos or bloated, expensive platforms.

**Goal:** Create the lightest and best client delivery experience for photographers.

### Positioning

| vs | Pofo difference |
|----|-----------------|
| Google Drive / Dropbox | Purpose-built delivery + proofing, not file dump |
| Pixieset / ShootProof-class | Lighter, cheaper, flexible Containers, faster setup |
| WeTransfer | Persistent private gallery + selection, not one-shot zip |

### Primary market (MVP)

- Wedding & pre-wedding photographers (solo or small studio)
- High photo counts (often 100–500+ per job)
- Need: private share → client select → final deliver → optional portfolio

---

## 2. Core Philosophy

| Principle | Meaning | Design implication |
|-----------|---------|-------------------|
| **Flexibility first** | Photographers define their own concepts for groups of photos | Container is free-named; no rigid forced types |
| **Simplicity** | Reduce friction after a shoot | Defaults + presets; advanced options secondary |
| **Beauty** | Client experience must feel premium | Photo-first UI; calm studio aesthetic |
| **Reusability** | Personal account → Team later | Ownership modeled so Team can own Project |

### Product rules of thumb

1. Prefer **one more Container** over one more product mode.
2. Prefer **short-lived signed URLs** over public buckets.
3. Prefer **photographer control** over client accounts (MVP: client is anonymous via token).
4. Prefer **premium empty states** over dense admin UI.

---

## 3. Key Concepts

Domain model (source of truth for product language):

```
Account (Photographer / Studio profile)
  └── Project              ← one job / wedding / event
        └── Container[]    ← flexible groups of photos
              └── Shot[]   ← individual photo (RAW + previews)
        └── ShareLink[]    ← private access for clients
        └── PortfolioItem  ← optional public showcase (via Shot)
```

### 3.1 Project

- Represents **one job / wedding / event**.
- Formal and **one-time** (tied to a client engagement).
- Owns Containers, share links, and overall delivery status.
- Future: owned by a **Team** (studio) with multiple members.

**Examples**

- “Alicia & James — Wedding 2026”
- “Sarah Pre-wedding · Discovery Bay”
- “Lin Family Portrait Session”

**Lifecycle (suggested)**

```
draft → shared → proofing → final → archived
```

| Status | Meaning |
|--------|---------|
| `draft` | Setup / uploading; not client-ready |
| `shared` | Link issued; waiting for engagement |
| `proofing` | Client is selecting |
| `final` | Finals delivered / job complete |
| `archived` | Hidden from default lists |

### 3.2 Container

- Flexible **container for photos**.
- Photographer names it freely and defines its **concept**.
- Naming system: `Container.name` + `Container.concept`.
- Concept is free-form text; UI may offer **presets** that fill both fields.

**Examples**

| Name | Concept | Typical role |
|------|---------|--------------|
| Main Gallery | Exhibition | Client-facing browse |
| Client Selects | Proofing | Mark favorites / select N shots |
| Raw Files | Originals | Time-limited RAW / original download |
| Final Delivery | Completed work | Retouched finals |
| My Collection | Personal | Photographer-only (not on share link) |

**Rules**

- Containers are **not** a fixed enum of types.
- A Project may have **zero or many** Containers.
- Share links can expose **all** or a **subset** of Containers (MVP: project-level link with optional container allow-list).
- Proofing limits (`selection_limit`) live on the Container that is used for selecting (or on the ShareLink — see [Open Questions](#23-open-questions)).

### 3.3 Shot

- Individual photo.
- Supports **RAW + generated previews** (JPEG/WebP via Sharp).
- Belongs to **one primary Container** (MVP).
- Carries metadata: dimensions, size, sort order, kind/version.

**Kinds (MVP)**

| Kind | Description |
|------|-------------|
| `preview` | Web-safe JPEG/WebP for browse |
| `jpeg` | Full-res or delivery JPEG |
| `raw` | Original RAW / large original |
| `final` | Retouched delivery file |

A single logical frame may be represented as **related files** (e.g. preview + raw) via `shot_group_id` (optional, phase 2) or separate Shots. MVP can keep one row per file for simplicity.

### 3.4 Share Link

- Private, unguessable token URL for clients.
- Optional password, expiry, RAW download window.
- No client login required for MVP.

### 3.5 Portfolio Item

- Photographer-published Shot for public showcase.
- Independent of client link lifecycle once published.

---

## 4. Personas & Jobs-to-be-Done

### Photographer (primary)

| JTBD | Success looks like |
|------|-------------------|
| Deliver a job set securely | Client opens one link; no Drive folders |
| Get selects without chat chaos | Client marks hearts; count is clear |
| Control originals | RAW only when/if I enable it, time-limited |
| Reuse best work | One click → Portfolio |

### Client (secondary)

| JTBD | Success looks like |
|------|-------------------|
| See photos beautifully | Full-bleed, fast, mobile-friendly |
| Choose favorites easily | Tap heart; know remaining quota |
| Download when allowed | Clear buttons; no technical jargon |

### Studio teammate (future)

| JTBD | Success looks like |
|------|-------------------|
| Help on same Project | Shared access without sharing password |

---

## 5. User Flows (MVP)

### 5.1 Photographer — create & deliver

```
1. Sign up / log in
2. Create Project (title, client name)
3. Create Container(s) — or accept preset pack
   e.g. Main Gallery + Raw Files
4. Upload Shots → Container
5. Set cover (optional)
6. Create Share Link (password / expiry / RAW flags)
7. Copy link → send to client (outside Pofo)
8. Monitor selections
9. Upload Final Delivery Container (or mark finals)
10. Optional: publish Shots to Portfolio
```

### 5.2 Client — view & select

```
1. Open /g/{token}
2. Enter password if required
3. Browse allowed Containers
4. Mark favorites (within selection_limit)
5. Optionally download when enabled
6. (No account)
```

### 5.3 End-to-end happy path

```
Upload → Project → Container(s) → Share link
    → Client views + selects
    → Photographer retouches / uploads Final
    → Client receives finals → Portfolio (optional)
```

### 5.4 Edge cases

| Case | Behavior |
|------|----------|
| Expired link | Clear “link expired” state; contact photographer |
| Wrong password | Retry; no enumeration of Project title if locked |
| Selection over limit | Block add; toast “Limit reached” |
| Empty Container | Premium empty state with upload CTA (owner only) |
| Large RAW upload | Progress UI; multipart / resumable (phase 2 if needed) |
| Photographer deletes Project | Cascade Containers/Shots; invalidate share links |

### 5.5 Preset packs (UX sugar)

On “New Project”, offer optional templates:

| Pack | Containers created |
|------|-------------------|
| **Wedding default** | Main Gallery (Exhibition), Client Selects (Proofing), Raw Files (Originals) |
| **Pre-wedding light** | Main Gallery, Final Delivery |
| **Blank** | None — photographer adds Containers |

Presets only write rows; they do not invent locked product modes.

---

## 6. Information Architecture

### 6.1 Public / marketing

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing |
| `/login` | Photographer auth |
| `/signup` | Photographer signup |
| `/g/[token]` | Client gallery (share link) |
| `/p/[studioSlug]` | Public portfolio (future) |

### 6.2 Photographer app (dashboard)

| Route | Purpose |
|-------|---------|
| `/dashboard` | Overview — recent Projects, stats |
| `/dashboard/projects` | Project list |
| `/dashboard/projects/new` | Create Project |
| `/dashboard/projects/[projectId]` | Project hub — Containers, links, status |
| `/dashboard/projects/[projectId]/containers/[containerId]` | Shot grid / upload / settings |
| `/dashboard/portfolio` | Published portfolio items |
| `/dashboard/settings` | Studio profile |

### 6.3 Route migration (from current scaffold)

| Current | Target |
|---------|--------|
| `/dashboard/galleries` | `/dashboard/projects` |
| `/dashboard/galleries/[id]` | `/dashboard/projects/[projectId]` (+ container views) |
| `/dashboard/galleries/new` | `/dashboard/projects/new` |
| `/g/[token]` | keep (behavior expands to Project/Containers) |

### 6.4 Navigation (dashboard)

- Overview  
- Projects  
- Portfolio  
- Settings  

Keep nav **≤ 4–5** items. No nested mega-menus in MVP.

---

## 7. UX & Visual Design

### 7.1 Principles

- **Photo-first** — imagery dominates; chrome stays quiet.
- **Simple & neat** — short labels, few primary actions, generous whitespace.
- **Warm studio aesthetic** — paper/cream, stone ink, soft shadows.
- **Premium client feel** — full-bleed covers, contact sheet / masonry, clear selection.
- **Easy** — wedding-workflow defaults; power options secondary.
- **More graphics, less UI chrome** — frames, film strip accents, contact sheets over tables.

### 7.2 Design tokens (product)

| Token | Direction |
|-------|-----------|
| Background | Warm paper / cream (`oklch` stone-warm) |
| Foreground | Soft ink / charcoal |
| Primary CTA | Near-black pill (`rounded-full`) |
| Cards | Soft white “paper” with light ring + shadow |
| Radius | Slightly tight for photo frames (`sm`); pills for actions |
| Type — headings | Editorial serif (Cormorant Garamond) |
| Type — UI | Clean sans (DM Sans) |
| Brand mark | Aperture motif + “Pofo” |

### 7.3 Key UI patterns

| Pattern | Use |
|---------|-----|
| **Cover hero** | Project & client entry — full-bleed photo + gradient + title |
| **Gallery card** | Project list — cover + title + status chip |
| **Contact sheet** | Photographer grid — equal tiles + frame numbers |
| **Masonry** | Client browse — varied aspect ratios |
| **Mat / print frame** | Marketing & portfolio — white border + shadow |
| **Film strip** | Marketing accent only |
| **Status badge** | Draft / Shared / Proofing / Final / Archived |

### 7.4 Interaction rules

- Primary action: **one** per screen (e.g. “New project”, “Upload”, “Share”).
- Destructive actions: confirm dialog.
- Upload: show thumbnails as soon as local preview exists.
- Selection: heart toggle; selected state always visible (filled heart + count in sticky bar).
- Mobile: client view is first-class; photographer dashboard usable but desktop-optimized.

### 7.5 Content tone

- Short, calm, non-technical.
- Avoid “bucket”, “object key”, “RLS” in UI.
- Use photographer language: Project, Gallery (as display label for Container if needed), Select, Final, Share.

**Display aliases (optional):** In UI copy, Container concept “Exhibition” may show as “Gallery” for clients — internal model remains Container.

---

## 8. Domain Model (detailed)

### 8.1 Entity relationship (logical)

```
profiles 1──* projects
projects 1──* containers
containers 1──* shots
projects 1──* share_links
share_links *──* containers   (visibility allow-list; optional join)
share_links 1──* shot_selections
shots 1──* shot_selections
profiles 1──* portfolio_items
shots 1──* portfolio_items
```

### 8.2 Field-level (MVP)

#### `profiles`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | = auth.users.id |
| display_name | text | |
| studio_name | text | |
| avatar_url | text | |
| studio_slug | text unique? | future public portfolio |
| created_at / updated_at | timestamptz | |

#### `projects`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| owner_id | uuid FK → profiles | MVP owner |
| team_id | uuid FK nullable | future |
| title | text | required |
| client_name | text | |
| description | text | |
| cover_shot_id | uuid FK nullable | |
| status | enum | draft/shared/proofing/final/archived |
| event_date | date nullable | optional |
| created_at / updated_at | timestamptz | |

#### `containers`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| project_id | uuid FK | cascade delete |
| name | text | free form |
| concept | text | free form; optional index |
| description | text | |
| cover_shot_id | uuid nullable | |
| sort_order | int | |
| selection_limit | int nullable | null = no limit / not a proofing container |
| is_client_visible_default | bool | default true; personal collection false |
| created_at / updated_at | timestamptz | |

#### `shots`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| project_id | uuid FK | denormalized for RLS/query |
| container_id | uuid FK | |
| owner_id | uuid FK | |
| kind | enum | preview/jpeg/raw/final |
| storage_key | text | R2 object key |
| thumbnail_key | text | derived |
| filename | text | original name |
| mime_type | text | |
| size_bytes | bigint | |
| width / height | int | |
| sort_order | int | |
| captured_at | timestamptz nullable | EXIF if available |
| created_at | timestamptz | |

#### `share_links`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| project_id | uuid FK | |
| token | text unique | unguessable (e.g. 24+ bytes base64url) |
| password_hash | text nullable | bcrypt/argon2 |
| expires_at | timestamptz nullable | |
| allow_download | bool | web previews / JPEG |
| allow_raw_download | bool | |
| raw_expires_at | timestamptz nullable | |
| is_active | bool | soft revoke |
| selection_limit_override | int nullable | optional override |
| created_at | timestamptz | |

#### `share_link_containers` (allow-list)

| Field | Type | Notes |
|-------|------|-------|
| share_link_id | uuid FK | |
| container_id | uuid FK | |
| PK | (share_link_id, container_id) | |

If **no rows**, interpret as “all client-visible Containers” (simpler MVP) **or** require explicit allow-list — decide in implementation (prefer: empty = all `is_client_visible_default` containers).

#### `shot_selections`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| project_id | uuid FK | denormalized |
| share_link_id | uuid FK | |
| shot_id | uuid FK | |
| client_label | text nullable | optional note |
| created_at | timestamptz | |
| UNIQUE | (share_link_id, shot_id) | |

#### `portfolio_items`

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | |
| owner_id | uuid FK | |
| shot_id | uuid FK | |
| project_id | uuid nullable | attribution |
| title | text | |
| is_published | bool | |
| sort_order | int | |
| created_at | timestamptz | |

---

## 9. Data Model & Schema

### 9.1 Technical stack (data plane)

| Layer | Choice |
|-------|--------|
| Auth + Postgres | Supabase |
| RLS | Enabled on all user data tables |
| Storage | Cloudflare R2 (S3 API) |
| Derivatives | Sharp on server / background job |

### 9.2 Indexes (minimum)

- `projects(owner_id, updated_at desc)`
- `containers(project_id, sort_order)`
- `shots(container_id, sort_order)`
- `shots(project_id)`
- `share_links(token)` unique
- `shot_selections(share_link_id)`
- `shot_selections(project_id)`
- `portfolio_items(owner_id, sort_order)` where published

### 9.3 Integrity rules

- Deleting Project cascades Containers, Shots metadata, ShareLinks, Selections.
- R2 objects: delete via background cleanup job (don’t block UI).
- Cover FKs: `ON DELETE SET NULL`.
- Token uniqueness global.

### 9.4 Suggested SQL shape (target — not yet applied)

```text
profiles, projects, containers, shots,
share_links, share_link_containers,
shot_selections, portfolio_items
+ enums: project_status, shot_kind
+ RLS policies (owner-based MVP)
+ trigger: handle_new_user → profiles
```

> Current `supabase/schema.sql` still uses `galleries` / `photos`. See [Migration](#18-migration-from-current-scaffold).

---

## 10. Security & Access Control

### 10.1 Threat model (MVP)

| Threat | Mitigation |
|--------|------------|
| Link guessing | Long random tokens |
| Link sharing beyond intent | Password + expiry + revoke |
| RAW leak | Separate flag + shorter signed URL TTL |
| Hotlinking | Signed URLs; short TTL |
| Photographer data leak | RLS by owner_id |
| Client writing arbitrary data | Service role path validates token + limits |

### 10.2 Roles (MVP)

| Role | Auth | Access |
|------|------|--------|
| Photographer | Supabase Auth | Own Projects full CRUD |
| Client | Share token (+ optional password cookie) | Read allowed Containers; write selections only |
| Public | None | Published portfolio only |

### 10.3 RLS principles

- **Authenticated photographer:** `owner_id = auth.uid()` (or future team membership).
- **Clients:** do **not** get broad anon RLS on shots; use:
  - Next.js route handlers with **service role** after validating token/password, **or**
  - Edge function that checks `share_links` then returns scoped data.
- Never ship service role key to the browser.

### 10.4 Password handling

- Store only **hash** of share password.
- On success, set httpOnly cookie scoped to `/g/[token]` session (short-lived).
- Rate-limit password attempts (middleware / edge).

### 10.5 Secrets

| Secret | Where |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `R2_*` | Server only |

---

## 11. Storage & Upload Pipeline

### 11.1 Object key layout

```
owners/{ownerId}/projects/{projectId}/containers/{containerId}/{shotId}/{filename}
owners/{ownerId}/projects/{projectId}/containers/{containerId}/{shotId}/thumb.webp
```

### 11.2 Upload flow (MVP)

```
1. Client requests signed PUT URL (Server Action)
2. Browser PUTs file directly to R2
3. Client notifies complete (Server Action)
4. Server creates Shot row
5. Server generates thumbnail (Sharp) — sync for small; queue later for large
6. UI refreshes contact sheet
```

### 11.3 File rules (initial)

| Type | Allowed | Notes |
|------|---------|-------|
| JPEG/PNG/WebP | Yes | Previews & delivery |
| HEIC | Optional phase 2 | Convert if needed |
| RAW (CR2/NEF/ARW/DNG/…) | Yes | No browser preview required; icon + filename |
| Max size | TBD (e.g. 100MB preview, higher RAW) | Enforce in signed URL policy if possible |

### 11.4 Derivatives

| Derivative | Spec |
|------------|------|
| Thumbnail | ~400–800px long edge, WebP/JPEG, quality ~75–80 |
| (Future) Display | ~2048px for client zoom |

### 11.5 Download

- Photographer: signed GET for original.
- Client: signed GET only if link flags + not expired.
- RAW TTL can be **shorter** than preview TTL.

---

## 12. Share Links & Client Access

### 12.1 URL

```
https://{app}/g/{token}
```

### 12.2 Capabilities (flags)

| Flag | Effect |
|------|--------|
| `is_active` | Revoke without deleting history |
| `expires_at` | Hard stop |
| `password_hash` | Gate entire experience |
| `allow_download` | JPEG/preview download |
| `allow_raw_download` + `raw_expires_at` | RAW window |

### 12.3 Client session

1. Resolve token → Project + Containers.
2. Password gate if needed.
3. Render client UI (cover, masonry, sticky select bar).
4. Mutations: toggle selection only (and download URL minting).

### 12.4 What client never sees

- Photographer email / other Projects
- Non-visible Containers (e.g. “My Collection”)
- Storage keys / internal IDs beyond need (minimize leakage; opaque shot ids OK)

---

## 13. Proofing & Selections

### 13.1 Behavior

- Client toggles favorite on a Shot.
- Enforce `selection_limit` (from Container or ShareLink override).
- Photographer sees selection count on Project hub and can filter “selected only”.
- Export: list of selected filenames / zip of previews (zip can be phase 2; list + download is MVP).

### 13.2 UX copy

- Sticky bar: `12 / 40 selected`
- Limit hit: “You’ve reached the selection limit. Deselect one to pick another.”

### 13.3 Rules

- Selecting does not move Shots between Containers.
- Final Delivery Container is separate from proofing selects.
- Photographer may “import selection” mentally (or later feature: copy selected into Final).

---

## 14. Portfolio

### 14.1 MVP

- Photographer marks Shot → Portfolio Item.
- `/dashboard/portfolio` grid of published items.
- Optional public page later (`/p/[slug]`).

### 14.2 Rules

- Only publish shots the owner controls.
- Unpublish anytime.
- Deleting source Shot: either block delete or cascade unpublish (prefer block if published).

---

## 15. Application Architecture

### 15.1 Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 App Router |
| Mutations | Server Actions (+ Route Handlers for webhooks/uploads callbacks if needed) |
| Auth / DB | Supabase |
| Storage | Cloudflare R2 + signed URLs |
| Images | Sharp |
| UI | Tailwind CSS + shadcn/ui |
| Deploy | Vercel |

### 15.2 Package layout (target)

```
src/
  app/
    (marketing)/
    (auth)/
    dashboard/          # photographer
    g/[token]/           # client
    api/                # optional route handlers
  components/
    brand/
    photo/              # frames, grids, film strip
    project/
    ui/
  lib/
    supabase/
    r2.ts
    shots/              # processing helpers
    share/              # token + password
  types/
  actions/              # server actions by domain
supabase/
  schema.sql
  migrations/           # future
```

### 15.3 Rendering strategy

| Surface | Strategy |
|---------|----------|
| Marketing | Static / SSG-friendly |
| Dashboard | Server Components + auth; client islands for upload/grid |
| Client gallery | Server resolve token; client island for selection toggles |
| Images | `next/image` for known remote (or signed URL loader later) |

### 15.4 Demo mode

- If Supabase env missing: mock data UI (current behavior).
- Never pretend uploads succeeded against real R2 without config.

---

## 16. API Surface (Server Actions / Routes)

Naming is indicative; implement under `src/actions/*`.

### Auth / profile

- `updateProfile({ displayName, studioName })`

### Projects

- `createProject({ title, clientName, preset? })`
- `updateProject(id, patch)`
- `archiveProject(id)`
- `listProjects()`
- `getProject(id)`

### Containers

- `createContainer(projectId, { name, concept, selectionLimit? })`
- `updateContainer(id, patch)`
- `reorderContainers(projectId, orderedIds)`
- `deleteContainer(id)` — only if empty or with confirm

### Shots

- `createUploadUrl({ projectId, containerId, filename, contentType, size })`
- `completeUpload({ …, storageKey, width?, height? })`
- `deleteShot(id)`
- `reorderShots(containerId, orderedIds)`
- `setCoverShot(projectId | containerId, shotId)`

### Share links

- `createShareLink(projectId, options)`
- `revokeShareLink(id)`
- `updateShareLink(id, options)`
- `mintClientDownloadUrl(token, shotId)` — validates rights

### Selections (client)

- `toggleSelection(token, shotId)` — validates limit
- `listSelections(token)`

### Portfolio

- `publishToPortfolio(shotId)`
- `unpublishPortfolioItem(id)`
- `reorderPortfolio(orderedIds)`

### Validation standards

- Zod (or equivalent) on all inputs.
- Auth check on photographer actions.
- Token + rate limit on client actions.

---

## 17. Feature Scope

### MVP (in scope)

- [ ] Photographer auth (email/password or magic link)
- [ ] Projects CRUD
- [ ] Containers CRUD + presets
- [ ] Shot upload (JPEG + RAW) + thumbnails
- [ ] Project cover + contact sheet
- [ ] Share links (token, password, expiry, revoke)
- [ ] Client view + proofing selections
- [ ] Timed download flags (JPEG / RAW)
- [ ] Final delivery Container workflow
- [ ] Portfolio publish (dashboard)
- [ ] Photography-driven UI (in progress)

### Explicitly later

- Team accounts & multi-user studios
- Advanced permission system
- Smart albums / AI tagging
- Public portfolio pages / custom domains
- Billing & storage tiers
- Zip export of selections
- Resumable multipart for huge RAWs
- Mobile native apps
- Client messaging

---

## 18. Migration from Current Scaffold

Early code used **Gallery / Photo** naming. Product standard is **Project / Container / Shot**.

| Design concept | Current scaffold | Target |
|----------------|------------------|--------|
| Project | implicit in gallery | `projects` |
| Container | `galleries` | `containers` |
| Shot | `photos` | `shots` |
| Share link | `share_links.gallery_id` | `share_links.project_id` + allow-list |
| Proofing | `photo_selections` | `shot_selections` |
| Portfolio | `portfolio_items.photo_id` | `portfolio_items.shot_id` |
| Routes | `/dashboard/galleries` | `/dashboard/projects` |
| Types | `src/types/database.ts` | update entity names |
| Mock data | `mockGalleries` | `mockProjects` + containers |

### Migration strategy

1. **Docs first** (this file) — language freeze.  
2. **Schema rewrite** in `supabase/schema.sql` (no production data yet → clean break OK).  
3. **Types + mocks** rename.  
4. **Dashboard routes** rename; keep redirects from `/galleries` → `/projects` if needed.  
5. **Wire Server Actions** against new schema.  
6. **Client share flow** against Project-level links.

Because the product is pre-production, **prefer clean rename over dual-write**.

---

## 19. Future Extensions

### 19.1 Team accounts

```
teams
  id, name, slug, …

team_members
  team_id, user_id, role (owner|admin|editor|viewer)

projects.team_id  → teams
projects.owner_id → still “created by”, or null when team-owned
```

- **Team owns Project**; members access via membership.
- Personal account = implicit team-of-one (no forced team UX in MVP).

### 19.2 Permissions

| Role | Create Project | Upload | Share | Delete |
|------|----------------|--------|-------|--------|
| owner | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ |
| editor | | ✓ | ✓ | |
| viewer | | | | |

Container-level ACLs can come later if needed.

### 19.3 Smart albums / AI

- Auto-grouping, face clusters, tag suggestions.
- Always optional; never block core delivery.
- Store tags in side tables; don’t couple to Container concept.

### 19.4 Portfolio public pages

- `profiles.studio_slug`
- `/p/[slug]` public grid
- SEO metadata, OG images from cover shots
- Custom domain (phase 3+)

### 19.5 Billing (sketch)

- Free tier: limited storage / Projects
- Pro: more storage, custom domain, team seats
- Enforce in upload URL minting

---

## 20. Non-Goals (MVP)

- Full DAM / Lightroom replacement  
- Client messaging / chat product  
- Complex multi-brand white-label  
- Offline native apps (responsive web first)  
- Real-time collaborative editing  
- Print store integration  

---

## 21. Success Criteria & Metrics

### Qualitative (MVP launch)

- Photographer can deliver a private set the **same day** after offline edit.
- Client can select favorites **without an account** or training.
- Experience feels more premium than Drive / WeTransfer.
- Schema doesn’t block Team later.

### Quantitative (when analytics exist)

| Metric | Target (initial) |
|--------|------------------|
| Time: signup → first share link | < 15 minutes |
| Client link open → first selection | < 2 minutes |
| Upload success rate | > 99% |
| Support tickets: “can’t find files” | low vs Drive baseline |

---

## 22. Implementation Phases

### Phase 0 — Foundation (done / in progress)

- Next.js app scaffold  
- Marketing + dashboard shell (photo-driven UI)  
- Client gallery shell  
- Supabase/R2 client stubs  
- Design doc (this file)  

### Phase 1 — Domain rename + schema

- Project / Container / Shot schema  
- Types, mocks, routes rename  
- Dashboard lists against mock new model  

### Phase 2 — Auth + Projects/Containers CRUD

- Supabase auth wired  
- Real create/list/update Projects & Containers  

### Phase 3 — Upload + contact sheet

- Signed R2 upload  
- Sharp thumbnails  
- Shot grid for photographer  

### Phase 4 — Share + client proofing

- Share link create/revoke  
- Client password + selection  
- Photographer selection review  

### Phase 5 — Finals + portfolio

- Final Delivery flow  
- Publish to portfolio  
- Polish empty states & mobile client  

### Phase 6 — Hardening

- Rate limits, cleanup jobs, monitoring  
- E2E tests for share + selection  

---

## 23. Open Questions

| # | Question | Options | Lean |
|---|----------|---------|------|
| 1 | Where does `selection_limit` live? | Container vs ShareLink vs both | Container + optional link override |
| 2 | Empty allow-list on share link? | All visible Containers vs must pick | All `is_client_visible_default` |
| 3 | One row per file vs shot group for RAW+JPEG? | Separate rows vs parent group | Separate rows MVP; group later |
| 4 | Client display word for Container? | “Gallery” vs “Album” vs name only | Show **name**; section by concept |
| 5 | Magic link vs password auth for photographers? | Supabase email magic / password | Password + magic both OK |
| 6 | HEIC support at MVP? | Yes / no | No — convert offline or phase 2 |
| 7 | Zip download of selects? | MVP / later | Later |
| 8 | Project status auto-transitions? | Manual only / auto on share & select | Auto soft: share→shared, first select→proofing |

Resolve these in implementation PRs; update this doc when decided.

---

## 24. Glossary

| Term | Definition |
|------|------------|
| **Project** | One job / event delivery unit |
| **Container** | Named, concept-tagged group of Shots inside a Project |
| **Shot** | Single photo file asset (preview/jpeg/raw/final) |
| **Share link** | Private client URL + policy |
| **Proofing** | Client selection of favorites |
| **Portfolio** | Photographer’s public (or studio) showcase of published Shots |
| **Concept** | Free-form label describing Container purpose |
| **Owner** | Photographer profile controlling a Project (MVP) |
| **Team** | Future multi-user studio entity that can own Projects |

---

## 25. Related Files

| File | Role |
|------|------|
| `README.md` | Product overview + setup |
| `DESIGN.md` | This document |
| `supabase/schema.sql` | DB scaffold (to align with Project model) |
| `.env.example` | Env vars |
| `src/lib/r2.ts` | Signed URL helpers |
| `src/lib/supabase/*` | Supabase clients |
| `src/types/database.ts` | TS domain types (to rename) |
| `src/components/photo/*` | Photo-first UI primitives |

---

## Appendix A — Example Project shape (JSON)

```json
{
  "project": {
    "title": "Alicia & James — Wedding",
    "client_name": "Alicia Chen",
    "status": "proofing"
  },
  "containers": [
    {
      "name": "Main Gallery",
      "concept": "Exhibition",
      "selection_limit": null,
      "shot_count": 286
    },
    {
      "name": "Client Selects",
      "concept": "Proofing",
      "selection_limit": 40,
      "shot_count": 0
    },
    {
      "name": "Raw Files",
      "concept": "Originals",
      "selection_limit": null,
      "shot_count": 286
    }
  ],
  "share_link": {
    "token": "…",
    "allow_raw_download": false,
    "expires_at": "2026-08-30"
  }
}
```

## Appendix B — Client UI wireframe (text)

```
┌─────────────────────────────────────────┐
│ [Cover photo full-bleed]                │
│  Private · Alicia & James               │
├─────────────────────────────────────────┤
│  Select up to 40          ♥ 12 / 40     │  ← sticky
├─────────────────────────────────────────┤
│  [masonry shots] [ ] [ ]                │
│  [ ] [ ] [ ] [ ]                        │
└─────────────────────────────────────────┘
```

## Appendix C — Photographer Project hub (text)

```
┌─────────────────────────────────────────┐
│ [Cover]  Title · Status · Client        │
│  [Upload] [Share] [Export selects]      │
├─────────────────────────────────────────┤
│ Containers: Main Gallery | Raw | Final  │
│ Contact sheet grid…                     │
└─────────────────────────────────────────┘
```

---

**Status:** MVP in active development  

**Last updated:** 2026-07-23
