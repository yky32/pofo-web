# Design Version 1 — Studio Paper

**Status:** Frozen baseline (2026-07-23)  
**Branch:** `design/v1`  
**Tag:** `design-v1`  
**Live:** https://pofo-web.vercel.app

This is the first product UI system for Pofo. Keep it as a reference while exploring later directions on other branches.

## Mood

- Warm **studio paper** + soft ink
- Photo-first, sparse chrome, premium client feel
- Photo-first studio paper UI with modern geometric type (V3 fonts)

## Tokens

| Token | Direction |
|-------|-----------|
| Background | Warm cream paper (`oklch` ~ stone-warm) |
| Foreground | Charcoal ink |
| Surfaces | Soft white “paper” cards, light ring + shadow |
| CTA | Near-black pill (`rounded-full`) |
| Radius | Tight for photo mats; pills for actions |

## Typography

- **Headings:** Space Grotesk (`--font-heading`) — from V3 White Cube
- **UI:** Manrope (`--font-sans`) — from V3 White Cube
- **Brand mark:** Aperture SVG + “Pofo” wordmark

> Original V1 used Cormorant Garamond + DM Sans; fonts updated to V3 stack while keeping Studio Paper visuals.

## Patterns

| Pattern | Where |
|---------|--------|
| Cover hero | Dashboard, project detail, client gallery |
| Mat / print frame | Marketing collage, portfolio |
| Film strip | Marketing accent band |
| Gallery card | Project / gallery lists |
| Contact sheet | Photographer shot grid |
| Masonry | Client `/g/[token]` browse |
| Sticky select bar | Client proofing |

## Key files (snapshot)

```
src/app/globals.css
src/app/layout.tsx
src/app/(marketing)/page.tsx
src/app/dashboard/*
src/app/g/[token]/page.tsx
src/components/brand/logo.tsx
src/components/photo/*
src/lib/photos.ts
DESIGN.md                 # product / domain design (not only visual)
```

## Domain language (product)

Project → Container → Shot  
(UI may still say “gallery” in scaffold; design target is Project/Container/Shot — see root `DESIGN.md`.)

## How to use this version

```bash
# View or run exactly v1
git checkout design/v1
# or
git checkout design-v1

bun install && bun dev
```

## Exploring beyond v1

Work on `main` or a new branch (e.g. `design/v2-explore`). Do **not** rewrite history on `design/v1` — treat it as a museum branch.

When a new direction stabilizes, cut `design/v2` the same way.
