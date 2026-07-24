# Design Version 1 — Studio Paper

**Status:** Production baseline  
**Branch:** `design/v1` / `main`  
**Tag:** `design-v1`  
**Live:** https://pofo-web.vercel.app  
**Product:** See root [`PRODUCT.md`](../../../PRODUCT.md)

Photo-first Studio Paper UI for Pofo — light surfaces, soft chrome, immersive client gallery.

## Mood

- Warm **studio paper** + soft ink, lightened toward nearly white
- Photo-first, sparse chrome, premium client feel
- Notebook Hand type: handwritten titles + clean UI sans

## Tokens

| Token | Direction |
|-------|-----------|
| Background | Nearly white paper (`oklch` ~ 0.995) |
| Foreground | Charcoal ink |
| Surfaces | Soft frosted white panels (subtle glass opacity) |
| CTA | Near-black pill (`rounded-full`) |
| Radius | **5px** containers |

## Typography

- **Headings:** Caveat (`--font-heading`) — Notebook Hand
- **UI:** Plus Jakarta Sans (`--font-sans`)
- **Brand mark:** Aperture SVG + “Pofo” wordmark

## Patterns

| Pattern | Where |
|---------|--------|
| Cover hero | Dashboard, project detail, client gallery |
| Mat / print frame | Marketing collage, portfolio |
| Film strip | Marketing accent band |
| Gallery card | Project lists |
| Contact sheet | Photographer shot grid |
| Masonry | Client `/g/[token]` browse |
| Sticky select bar | Client proofing |
| Full-bleed look section | Marketing “Client view” |

## Key files

```
src/app/globals.css
src/app/layout.tsx
src/app/(marketing)/page.tsx
src/app/dashboard/*
src/app/g/[token]/page.tsx
src/components/brand/logo.tsx
src/components/photo/*
src/lib/photos.ts
PRODUCT.md
```

## Domain language (product)

Project → Container → Shot  
(UI may still say “gallery” in places — see root `PRODUCT.md`.)

## Run

```bash
git checkout design/v1
# or main
bun install && bun dev
```
