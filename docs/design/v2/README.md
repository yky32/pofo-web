# Design Version 2 — Darkroom

**Status:** Exploring (`design/v2-explore`)  
**Branch:** `design/v2-explore`  
**Contrast to:** [v1 Studio Paper](../v1/README.md)

Cinema darkroom aesthetic — high contrast, safelight amber, geometric type, edge-to-edge photos.

## Mood

- Near-black canvas + soft amber **safelight** accent
- Photo as projection, not print-on-paper
- Sharp, graphic, minimal chrome
- Mono labels (uppercase tracking)

## vs V1

| | V1 Studio Paper | V2 Darkroom |
|--|-----------------|-------------|
| Base | Warm cream paper | Near black |
| Accent | Soft stone ink | Safelight amber |
| Type | Cormorant + DM Sans | Syne + Inter |
| Frames | White mat / print | Hairline edge, no mat |
| Radius | Soft pills | Square / none |
| Client | Dark immersive | Black cinema (pushed further) |
| Feel | Warm studio | Night gallery / darkroom |

## Tokens

| Token | Direction |
|-------|-----------|
| Background | `oklch(0.12 …)` near black |
| Foreground | Off-white |
| Safelight | Warm amber accent (CTAs, labels, frame numbers) |
| Borders | `white/8–10%` hairlines |
| Radius | `0.25rem` / often `rounded-none` |

## Typography

- **Headings:** Syne (geometric display)
- **UI:** Inter
- **Meta:** Mono uppercase micro-labels

## Patterns

- Edge-to-edge photo blocks (`photo-edge`)
- Grid features with 1px gaps (not soft cards)
- Amber CTAs (square)
- Active nav: safelight left border
- Film strip with safelight frame numbers
- Heavier film grain on heroes

## Key files

```
src/app/globals.css
src/app/layout.tsx
src/app/(marketing)/page.tsx
src/components/photo/*
src/components/brand/logo.tsx
```

## Promote to frozen v2

When this direction stabilizes:

```bash
git checkout -b design/v2
git tag -a design-v2 -m "Design Version 2 — Darkroom"
# update docs/design/README.md
```
