# Design Version 1.1 — Hazy Glass Studio

**Status:** Exploring (`design/v1.1-explore`)  
**Base:** V1 Studio Paper + V3 fonts (Space Grotesk / Manrope)

Fine-tuned to strengthen **photo-first** identity.

## Direction

| Pillar | Expression |
|--------|------------|
| **Hazy beauty** | Soft fog gradients, bloom veils, film grain, soft focus atmospheres behind content |
| **Liquid glass** | Frosted panels (`.glass`, `.glass-dark`, `.glass-soft`), backdrop-blur, translucent borders, specular edge light |
| **Immersive HD** | Full-viewport photo heroes, tall client covers, large photo stages (`.photo-stage`), higher-res Unsplash assets |

## What stayed from V1

- Warm paper palette
- Photo-first product tone
- Pill CTAs, aperture logo
- Space Grotesk + Manrope

## What V1.1 adds

- Immersive marketing hero (nearly full viewport)
- Glass header / sidebar / feature cards / stats
- Deeper client gallery cover (~58vh) with glass chrome
- Gallery detail immersive stage + glass meta card
- HD image URLs (`w=2000–2400`, `q=88–90`)

## CSS utilities

- `.glass` / `.glass-dark` / `.glass-soft`
- `.photo-stage` — immersive photo container with soft vignette
- `.haze-layer` — soft blur fog behind floating content
- `.film-grain` — subtle texture on big photos

## Run

```bash
git checkout design/v1.1-explore
bun dev
```
