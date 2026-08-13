# Design Review — UDAAN (senior graphic designer pass)

*Reviewed as an unbiased senior graphic designer, 2026-08-13. Verdict first, then fixes applied.*

## Verdict

The direction is right — a deep-space launch metaphor, one mascot, one gradient system, one voice. The 3D hero genuinely pans up on scroll (layered translateZ + rotateX + a rocket that flies away), which delivers the requested "3D design that pans up". Cards tilt, states glow, and Rokky's copy gives the product a personality most study apps lack.

But a launch-day review must be blunt. Issues found and fixed:

## Issues found → fixed

1. **Decorative chips blocked clicks.** Floating hero stat chips sat at z-index 6 with no `pointer-events: none` — they intercepted taps on small screens where they overlap CTA/scroll areas. → Fixed (pointer-events: none).
2. **Mobile chip clutter.** Four absolutely-positioned chips crowd a 360px viewport and collide with the title. → Hidden below 700px; the hero keeps clouds + rocket + title.
3. **No focus-visible styling.** Keyboard users (a real segment for exam takers) got no indication on tab. → Added `:focus-visible` outlines to buttons, nav, chips, options.
4. **Long content overflow.** AI-generated quiz options and flashcard backs can exceed their containers; text could clip on mobile. → `overflow-wrap: anywhere` on `.md`, options and flip faces; flip-face gets internal scrolling.
5. **Timer legibility on mobile.** The sticky quiz header packs title + timer + badges; timer could wrap below the fold on narrow screens. → Title truncation + tightened gaps on mobile.
6. **Low-contrast hints.** `--text-faint` (#6b7a99) on the darkest background is below comfortable contrast for `.hint` copy at 12px. → Bumped to #7c8bab and hints to 12.5px.
7. **Hero title glow could halo on light-projector screens.** Reduced text-shadow spread slightly; kept the gradient.
8. **Print layout.** Report cards print with browser chrome around the sidebar-less content; margins were tight. → Print block margin + page-break rules for sections.
9. **Scroll-jank guard.** The hero pan writes a CSS var on every scroll frame; added `will-change: transform` already present — plus passive listener. No further change needed after profiling the math (single rAF, one style write).
10. **Empty states without Rokky.** Several empty states used plain text. → Empty states now show the mascot (consistent brand moment).

## What I deliberately kept

- Dark theme only (a light theme would split the identity budget with no user demand yet).
- Emoji iconography (fast, cross-platform, zero asset weight; replaced by custom SVG if this ships as a product).
- Glassmorphism + glow restrained to interactive elements — the dashboard content area stays calm so the hero owns the spectacle.
