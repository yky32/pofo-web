# Pofo design versions

Exploratory visual systems. Product/domain design lives in root [`DESIGN.md`](../../DESIGN.md).

| Version | Branch / tag | Status | Notes |
|---------|----------------|--------|--------|
| **v1 — Studio Paper** | `design/v1` · tag `design-v1` | Frozen baseline | Warm paper + photo-first UI. See [v1/README.md](./v1/README.md). Live: https://pofo-web.vercel.app |
| **v2+** | `design/v2-explore` (or next) | Exploring | Free to vibe; promote to `design/v2` when stable |

## Quick commands

```bash
# Run exactly Design v1
git checkout design/v1   # or: git checkout design-v1

# Explore freely (from latest main)
git checkout -b design/v2-explore
```

## Rules

1. **Never force-push** frozen `design/vN` branches after release.
2. When a new direction feels right, cut `design/vN` + tag `design-vN` and add a row here.
3. Domain model (Project / Container / Shot) is independent of visual version — keep `DESIGN.md` as product truth.
