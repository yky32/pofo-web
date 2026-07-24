# Pofo

**The simplest, most beautiful, and most affordable client delivery tool for photographers.**

Built for wedding and pre-wedding photographers who need a fast, professional way to deliver photos after a shoot — without the hassle of Google Drive or expensive complicated platforms.

## Core Features (MVP1)

- Upload photos (batch JPEG/PNG/WebP)
- Private client galleries with secure share links
- Password protection, link expiry, revoke
- Client proofing (hearts + bulk select, limit enforced)
- Photographer ZIP: full gallery or client’s finished proof
- Studio notes/flags on photos
- Share analytics (views / last open)
- Original download window for clients
- Publish finals to public portfolio (`/s/{slug}`)
- Free status control (draft → shared → proofing → final → archived)

## Workflow

1. Finish editing photos offline  
2. Create a project and upload  
3. Share a private link (optional password + original download window)  
4. Client proofs favorites (and optionally downloads their picks)  
5. You download the proof ZIP, retouch offline if needed  
6. Publish picks to portfolio and mark **Final**

## Tech Stack

- **Next.js 15** (App Router + Server Actions)
- **Supabase** (Auth + Postgres + Storage)
- **Cloudflare R2** (optional scale-up storage)
- **Tailwind CSS + shadcn/ui**
- **Vercel** (Deployment)

## Getting started

```bash
bun install
cp .env.example .env.local
# fill Supabase keys — see supabase/SETUP.md
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars the app runs in **demo mode**.

### Database (required for full MVP)

In Supabase **SQL Editor**, run in order:

1. `supabase/schema.sql`
2. `supabase/storage.sql`
3. `supabase/profiles-providers.sql`
4. `supabase/share-gate.sql`
5. `supabase/features-p1-p2.sql`
6. `supabase/features-p3.sql`
7. Optional: `supabase/slug.sql`

Service role key is required on Vercel so client galleries can mint signed image URLs.

### CI / deploy

```bash
bun run verify   # repo checks
bun run ci       # lint + typecheck + build
```

Push to `main` → GitHub Actions verify + Vercel deploy. See [docs/CI.md](docs/CI.md).

## MVP1 roadmap

- [x] App scaffold (Next.js 15, Tailwind, shadcn)
- [x] Marketing site + dashboard shell
- [x] Supabase auth (email + Google/Apple)
- [x] Create project + upload batch
- [x] Contact sheet (mosaic, bulk delete, notes/flags)
- [x] Share links (password, expiry, revoke, email)
- [x] Client gallery + proofing + bulk select
- [x] Watermarked previews
- [x] Download full / proof ZIPs
- [x] Status control + delivery stepper
- [x] Portfolio publish + public studio page
- [x] Original download window
- [x] Share analytics
- [x] R2 switchable storage (optional)
- [ ] True RAW asset pipeline (separate files)
- [ ] Background Sharp thumbnails worker
- [ ] Billing

## Product docs

| Doc | Use |
|-----|-----|
| **[PRODUCT.md](./PRODUCT.md)** | **Canonical product + MVP1/MVP2 scope** |
| [DESIGN.md](./DESIGN.md) | Deep design archive |
| [supabase/SETUP.md](./supabase/SETUP.md) | Database setup |

## Goal

Create the lightest and best client delivery experience for photographers.

**Status**: MVP1 feature-complete in app — apply SQL migrations on your Supabase project for full runtime. See PRODUCT.md for MVP2.

---

Built with ❤️ for photographers.
