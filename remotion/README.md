# WeddingApp Remotion compositions

Isolated Remotion 4.x project for rendering landing-page videos. Lives
alongside the main app but has its own `package.json` so deps don't bloat
the landing bundle.

## Workflow

```bash
cd remotion
pnpm install

# Dev (Remotion Studio UI — runs on port 3000; may pick 3001 if occupied)
pnpm dev

# Render MP4 (H.264 CRF 23)
pnpm render:hero

# Render WebM (VP9 CRF 30)
pnpm render:hero:webm

# Render first-frame poster JPG
pnpm render:poster
```

All three render commands write to `../public/videos/` which is served
by Next.js as static assets. The middleware exempts `/videos/*` from
locale redirect so the files resolve directly.

## Compositions

| Id | Duration | Dimensions | Purpose |
|---|---|---|---|
| `HeroGuestFlow` | 11s @ 30fps | 600×1200 | Landing hero — guest login → upload → success |

## Theme

`src/theme.ts` mirrors landing CSS custom properties from
`../styles/themes/wedding-theme.css` (HSL → hex). Keep in sync manually;
there's no build-time link.

## Fonts

Playfair Display (display/headline) + Inter (body/ui) loaded via
`@remotion/google-fonts`. Matches landing typography.

## Version pinning

All `@remotion/*` packages + `remotion` pinned to a single version via
`pnpm.overrides` in `package.json` to avoid cross-module drift warnings
in Remotion Studio. When bumping Remotion, update the override block
and all 7 direct deps in lockstep.
