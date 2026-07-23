# Design Version 3 — White Cube

**Status:** Exploring (`design/v2-explore`)  
**Contrast to:** [v1 Studio Paper](../v1/README.md) · [v2 Darkroom](../v2/README.md)

Contemporary museum wall — cool pure white, black type, maximum air, photos as art objects.

## Mood

- Infinite gallery white
- Monochrome (no cream, no amber)
- Huge whitespace, quiet chrome
- Geometry without decoration

## vs previous

| | V1 Studio Paper | V2 Darkroom | **V3 White Cube** |
|--|-----------------|-------------|-------------------|
| Base | Warm cream | Near black | **Cool pure white** |
| Accent | Stone | Safelight amber | **Black only** |
| Type | Cormorant + DM Sans | Syne + Inter | **Space Grotesk + Manrope** |
| Frames | Print mat | Edge + grain | **No mat — float** |
| Radius | Soft pills | Sharp | **0 (square)** |
| Feel | Warm studio | Cinema night | **Daylight museum** |

## Tokens

- Background: near-white cool (`oklch` blue-gray hue)
- Text: near-black
- Borders: light neutral hairlines
- CTA: solid black rectangles
- Radius: `0`

## Patterns

- Museum wall hero (type first, photos as exhibition)
- Clean 4-up image strip (no film sprockets)
- Gallery cards: image + caption under (label style)
- Client: bright white room + cover + masonry
- Stats as type on a rule, not cards

## Key files

```
src/app/globals.css
src/app/layout.tsx
src/app/(marketing)/page.tsx
src/components/photo/*
```
