# UI specification

Source of truth for layout and style: `design-source/pictures/UI_1.jpeg` (desktop and mobile sheet) and `UI_2.jpeg` (second variant). We copy layout, spacing and styling. We do **not** copy claims: the mockups show a quality gauge, "Expert Lessons 100+", "expert guidance", "Expert Tips", "Checking with expert knowledge", a named account "Ananya S.", fake video durations and a play-button player. All of these are replaced (see "Truthful wording").

## Design tokens
Sampled from the mockups by pixel (approximate: JPEG, anti-aliasing) and reconciled with the existing `frontend/tailwind.config.js`.

| Token | Value | Where it appears in the mockups |
|---|---|---|
| `parchment` (page background) | `#FAF7F2` (mockup sample `#FCF4E9`) | page and card backgrounds |
| `parchment-200` (surface) | `#F5EFE6` | cards, dropzone, input fills |
| `forest` | `#153828` (hover `#0E281C`) | nav "Sign in", splash screen, primary actions on dark, stepper done |
| `terracotta` | `#C44D34` (hover `#B03D25`) | primary buttons, active tab, "Empowering" headline accent |
| `ochre` | `#D4A373` / `#E9C46A` | stat accents, tips panel, borders |
| `ink` (text) | `#292524`; headings `#1C1917` | body text and headings |
| `muted` | `#6B5E55` (must keep 4.5:1 on parchment) | secondary text |

Contrast checks are done in the component tests/Lighthouse. Terracotta `#C44D34` on parchment is about 4.6:1 for normal text; use terracotta-dark `#8C301D` for small text if a check fails.

Typography: headings in **Playfair Display** (serif, 600/700); body in **Plus Jakarta Sans** (400/500/600/700). Self-hosted via `@fontsource`, `font-display: swap`. Type scale: display 40/48 (mobile 32/40), h2 28/36, h3 20/28, body 16/26, small 14/20, caption 12/16.
Spacing: 4 px grid. Radii: cards 16 px, buttons and chips 12 px / pill, images 16 px. Shadows: the two existing `warm` shadows. Touch targets at least 44 px.

## Layout (all breakpoints: 360, 390, 768, 1024, 1280, 1536, 1920; no horizontal scroll)
Content max width 1200 px (1280 for the hero), 16 px side gutters on phones.

## Screens
1. **Splash (mobile, first visit)**: forest green full-screen, Warli-style pattern from a real illustration at low opacity, logo, name, "Learn, Create, Preserve", terracotta/cream "Get Started". Shown once (localStorage; falls back to skipped if storage fails).
2. **Home**: top nav; left column headline (serif, two-tone, "Empowering" in terracotta), sub-copy, two buttons (filled terracotta, outlined); right: hero photo (`15 AM3`) fading into the parchment background. Stats row (truthful): "6 art forms", "4 with style analysis", "Free to use", "Open source". Then how it works (Learn, Analyse, Improve), featured art forms, Learn teaser, Community teaser, footer.
3. **Explore**: title, search field, chips (All, Painting, Tribal Art, Textile, Pottery), 3-column card grid (1 column on phones, 2 at tablet) with image, name, one-line description, arrow, badge ("Style analysis" or "Knowledge archive"), final CTA card.
4. **Art form detail**: breadcrumb, title, subtitle, tabs (Overview, History, Techniques, Common Mistakes, Gallery, Learn); Overview = big image left, "Key characteristics" list right (icon, title, one-line tip), quote strip, "Analyse my artwork" button.
5. **Learn and Improve**: tabs (Video Lessons, Common Mistakes, Practice Exercises, Tips); featured area and lesson list as "Lesson outline" cards with a "Coming soon" badge; no player.
6. **Analyse**: 4-step stepper (Upload, Select Art Form, Analysis, Results) with numbered circles; step 1 dropzone left plus preview right, sample thumbnails, optional note; step 2 art form chips with thumbnails; step 3 progress (Uploading, Analysing, Preparing feedback) with cancel; step 4 results.
7. **Results**: uploaded artwork card; "Style similarity" ring (percentage for the chosen style, no "/100"); probability bars for all four styles; "looks most like" statement; feature checks with chips (Present / Weak / Unable to assess); strengths; areas to improve; reference example; next exercise; disclaimer card; Share and Download report buttons.
8. **Chat**: left sidebar (New Chat, recent chats, local), message list with user bubbles in terracotta/forest, assistant in cream, suggestion chips, composer with microphone (only if supported) and send.
9. **Community**: tabs Latest/Popular, art form filter, masonry-like grid of cards with "Sample" tag, like button, share modal.
10. **Portfolio**: guest header, tabs (All, Analysed, Saved), grid, empty state with CTA.
11. **Credits, About, 404**: simple text pages on parchment with the same header and footer.

Mobile: bottom tab bar (Home, Explore, Analyse centre, Chat, Community, Profile) with a raised centre button; top bar has logo and search/menu.

## States
Every data view has loading (skeleton), empty (illustration or pattern + CTA), error (message + retry), and offline states. Focus rings: 2 px forest outline with 2 px offset. Motion respects `prefers-reduced-motion`.

## Truthful wording
| Mockup text | Replacement |
|---|---|
| "AI-powered platform ... with expert guidance" | "A free learning aid for traditional Indian art, with curated guidance and a style-similarity checker." |
| "100+ Expert Lessons" | removed; real counts only ("6 art forms") |
| "Expert Tips", "expert knowledge" | "Tips"; "Comparing with reference features" |
| "Overall Assessment 78/100", "Good attempt!" | "Style similarity NN%" with a disclaimer; no verdict wording |
| "AI Model Calibrated" | "Style analysis" |
| "Authentic Mastercraft" | "Madhubani, Kachni technique" |
| "Ananya S." and other profiles | "Guest"; seeded posts tagged "Sample" |
| lesson durations, play button | "Lesson outline, coming soon" |
