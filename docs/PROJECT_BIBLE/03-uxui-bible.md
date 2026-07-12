# PROJECT_BIBLE — Chapter 3: UX/UI Bible

**Version:** 1.0 · **Status:** Foundation · **Implemented in code:** `src/design/tokens.ts` + `tailwind.config.ts` + `src/app/globals.css`

> This chapter is the **design constitution**. Neither humans nor AI may break it.
> The source of truth is `src/design/tokens.ts`. This document explains the intent;
> the code enforces it.

## 0. Prime Directive — No Magic Numbers

Every size, space, radius, color, shadow, duration and easing MUST come from a token.
If a needed value doesn't exist, **add it to `tokens.ts` first**, then use it. Arbitrary
values (`p-[13px]`, `#3b82f6`, `duration-[190ms]`) are forbidden in components.

## 1. Spacing — 8pt Grid

Base unit = **8px**. A **4px** half-step exists for fine control; **2px** is a hairline only.
Scale (token → px): `1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 12=48, 16=64, 20=80, 24=96, 32=128`.
All layout gaps, paddings and margins use this scale.

## 2. Radius

`sm=6, md=10, lg=14, xl=20, 2xl=28, full=9999`. Default for cards/buttons = `lg`.
Pills and avatars = `full`.

## 3. Typography — SF Pro

Stack: system SF Pro (`-apple-system`) with Inter/system-ui fallback. Mono = SF Mono.
Modular scale (size / line-height / tracking):

| Token | Size | Use |
|-------|------|-----|
| display | 44 | Hero |
| title1 | 32 | Page title |
| title2 | 24 | Section |
| title3 | 20 | Subsection |
| callout | 16 | Primary UI text |
| body | 15 | Paragraphs |
| footnote | 13 | Secondary |
| caption | 12 | Labels |

Weights: regular 400 · medium 500 · semibold 600 · bold 700. Hierarchy is carried by
**weight + size + color**, never by decoration.

## 4. Color — Semantic Tokens Only

Components reference **semantic** names (`bg-surface`, `text-primary`, `brand`, `danger`…),
never raw hex. Raw palette lives in `tokens.ts` and is private. Light + dark are both
first-class; theme toggles via `[data-theme]` on `<html>` with system fallback.

Feedback colors: `success` (green), `warning` (amber), `danger` (red), `info` (blue).
Brand = calm indigo/blue. Neutrals = cool gray ramp.

## 5. Elevation

Soft, low-contrast shadows (`sm → xl`). Elevation communicates layering, not decoration.
Use sparingly; whitespace is the primary depth cue.

## 6. Effects — Glassmorphism & Progressive Blur

`.glass` utility = translucent bg + 20px backdrop blur + saturate. Reserved for
**floating navigation** and elevated overlays. Never on dense content areas.

## 7. Motion

Purposeful only. Durations: `instant 80 · fast 140 · base 220 · slow 320`.
Easing: `standard` (enter/exit default), `emphasized` (accent), `exit`.
Motion clarifies state change; it never entertains.

## 8. Layout & Responsiveness

Breakpoints: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Mobile-first.
Content max-width for reading ≈ 960px. z-index is tokenized (`dropdown → tooltip`).

## 9. Prohibitions (hard rules)

- ❌ Magic numbers (arbitrary px/hex/ms).
- ❌ Raw hex in components.
- ❌ New radius/spacing values outside the scale.
- ❌ Decorative motion or shadow.
- ❌ Hardcoded user-facing text (must be localizable — RU/EN).

## 10. Accessibility floor (ties into Ch.4)

- Text contrast ≥ WCAG AA (4.5:1 body, 3:1 large).
- Interactive targets ≥ 44×44px.
- Focus states always visible.
- Never rely on color alone to convey meaning.

---

**Live reference:** run `npm run dev` and open `/` to see every token rendered.
