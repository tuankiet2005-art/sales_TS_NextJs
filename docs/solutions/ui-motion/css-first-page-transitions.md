---
title: CSS-first UI motion
date: 2026-08-20
tags: [ui, animation, tailwind, accessibility]
---

## Problem

The app felt static: only basic card hovers, no page transitions, and price changes snapped instantly.

## Approach

CSS-first motion — no new dependency:

- Tokens and keyframes in `app/globals.css` (`--ease-motion`, `motion-page`, `motion-enter`, …)
- Helpers in `lib/motion.ts` (`motionStagger`, `motionInteractive`, `motionCard`, `motionPress`)
- `PageMotion` in `AppShell` re-animates on pathname change
- Staggered catalog/history cards; quote sheet scales in after Recalculate; price pop on vehicle confirm when usage/offers change
- `prefers-reduced-motion: reduce` disables animations

## Rule

Prefer Tailwind + shared motion classes over animation libraries. Keep durations ~220–420ms with `cubic-bezier(0.22, 1, 0.36, 1)`.
