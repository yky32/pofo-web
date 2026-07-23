# Design Version 6 — Gallery Paper

**Status:** Exploring (`design/v6-explore`)  
**Branch:** `design/v6-explore`  
**Recipe:** Best of **V1 Studio Paper** + **V3 White Cube**

## Intent

> Space for the work. Warmth for the client.

Keep V3’s quiet air and hierarchy. Keep V1’s human warmth and editorial titles. Drop everything already rejected (dark cinema, rose soft, steel lab).

## Blend map

| From V3 White Cube | From V1 Studio Paper |
|--------------------|----------------------|
| Lots of air / whitespace | Slight warm paper tint |
| Clean hierarchy, type-first hero | Cormorant headings |
| Light client room | Soft photo shadow / light paper edge |
| Minimal chrome | Soft stone muted text |
| Stats as type on rules | Approachable product tone |

| Explicitly not included |
|-------------------------|
| Dark / safelight amber (V2) |
| Soft rose lifestyle (V4) |
| Steel-blue tool lab (V5) |
| Heavy white print mats or heavy film sprockets |
| Full square radius 0 or super-soft pills |

## Tokens

- Background: near-white with **warm** paper hue (not pure cool museum)
- Foreground: soft charcoal stone
- Primary: charcoal (CTAs)
- Radius: **0.5rem** (between V3 square and V4 soft)
- Accent: none — charcoal + photography only

## Type

- **Headings:** Cormorant Garamond (V1)
- **UI:** DM Sans (V1 UI family, V3-like clarity)

## Patterns

- Hero: V3 structure (big type + exhibition grid) with V1 serif warmth
- Photo frames: thin paper pad + soft shadow (not heavy mat)
- Gallery cards: image float + caption under (V3) with soft lift
- Client: **light** private room (V3), warm paper bg (V1)
- Workflow: V3 top-rule steps

## Run

```bash
git checkout design/v6-explore
bun dev
```
