# Pofo

**The simplest, most beautiful, and most affordable client delivery tool for photographers.**

Built for wedding and pre-wedding photographers who need a fast, professional way to deliver photos after a shoot — without the hassle of Google Drive or expensive complicated platforms.

## Core Features

- Upload photos (JPEG + RAW)
- Create beautiful private client galleries in minutes
- Generate secure shareable links with expiration and password protection
- Client proofing (mark favorites / select 10-40 shots)
- Time-limited RAW & original file downloads
- Version management (Draft → Final)
- Final selected photos can be added to your public Portfolio

## Workflow

1. Finish editing photos offline
2. Upload to Pofo and create a new Gallery
3. Share private link with client
4. Client views gallery and selects favorites
5. Retouch selected shots and upload final version
6. Client approves → selected photos can be added to your Portfolio

## Tech Stack

- **Next.js 15** (App Router + Server Actions)
- **Supabase** (Auth + Postgres Database)
- **Cloudflare R2** (Storage + Signed URLs)
- **Tailwind CSS + shadcn/ui**
- **Sharp** (Image processing)
- **Vercel** (Deployment)

## Getting started

```bash
# Install
bun install

# Env (optional for demo UI)
cp .env.example .env.local

# Dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Without Supabase env vars the app runs in **demo mode** with mock galleries so you can explore the UI.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Add keys to `.env.local`

### Cloudflare R2 setup

1. Create an R2 bucket
2. Create API tokens with object read/write
3. Add `R2_*` vars to `.env.local`

## Project structure

```
src/
  app/
    (marketing)/     # Landing page
    (auth)/          # Login / signup
    dashboard/       # Photographer app
    g/[token]/       # Client gallery (public link)
  components/        # UI + product components
  lib/
    supabase/        # Browser + server clients
    r2.ts            # Signed upload/download URLs
    mock-data.ts     # Demo galleries
  types/             # Domain types
supabase/
  schema.sql         # Postgres + RLS
```

## MVP roadmap

- [x] App scaffold (Next.js 15, Tailwind, shadcn)
- [x] Marketing site + dashboard shell
- [x] Client gallery preview route
- [x] Supabase schema + RLS
- [x] R2 signed URL helpers
- [ ] Real Supabase auth (email magic link / password)
- [ ] Create gallery Server Actions
- [ ] Multipart upload to R2 + Sharp thumbnails
- [ ] Share links (password, expiry, RAW window)
- [ ] Client proofing selections
- [ ] Draft → Final version switch
- [ ] Portfolio publish flow

## Goal

Create the lightest and best client delivery experience for photographers.

**Status**: MVP in active development

---

Built with ❤️ for photographers.
