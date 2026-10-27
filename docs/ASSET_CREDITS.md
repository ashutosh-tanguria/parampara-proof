# Asset credits

## Illustrations (AI-generated)
All images shown on the site (hero, art form cards, galleries, samples, community and learning pictures) are **AI-generated illustrations supplied by the team**. They are **not photographs of real artworks or artists**, and the people shown do not exist. They were generated outside this repository; the tool and prompts are not recorded. The original files are in `design-source/pictures/` (not shipped); `scripts/build_images.py` produces the optimised copies in `frontend/public/assets/`.

| Site slug | Original file |
|---|---|
| `home-hero` | `WhatsApp Image 2026-10-26 at 10.23.15 AM3.jpeg` |
| `madhubani` | `... 10.23.10 AM.jpeg` |
| `warli` | `... 10.23.10 AM (1).jpeg` |
| `warli-brushes` | `... 10.23.14 AM11.jpeg` |
| `warli-village` | `... 10.23.18 AM7.jpeg` |
| `warli-dance` | `... 10.23.19 AM8.jpeg` |
| `madhubani-woman-peacock` | `... 10.23.18 AM555.jpeg` |
| `gond` | `gond-tree-of-life.jpg` (origin not documented) |
| `kalamkari` | `... 10.23.11 AM.jpeg` |
| `pottery` | `... 10.23.11 AM1.jpeg` |
| `painting-together` | `... 10.23.15 AM1111111111.jpeg` |

Not shipped: `UI_1.jpeg`, `UI_2.jpeg` (design mockups, reference only), the asset contact sheet, and two illustrations with baked-in text and score (`... 10.23.17 AM4.jpeg`, `... 10.23.17 AM44.jpeg`), and the video thumbnail with baked-in title and a fake duration (`... 10.23.18 AM6.jpeg`).

**Licence of the illustrations:** not yet stated by the team. They are used with the team's permission for this prototype. Confirm the licence (and the terms of the generator) before redistributing them separately.

## Wikimedia Commons images (model training data only)
Not shipped. The list of 179 images with title, author and licence is `backend/image_credits.csv` and is shown on the app's **Credits** page (`/credits`). Licences: CC BY-SA 4.0 (106), CC BY 2.0 (23), CC0 (16), Public domain (13), CC BY-SA 3.0 (10), CC BY 4.0 (4), CC BY-SA 2.0 (2), CC BY-SA 2.5 (2), Free Art License (2), CC BY 3.0 (1). CC BY and CC BY-SA require attribution; the Credits page provides it.

## Logo and icons
`frontend/public/favicon.svg` was drawn for this project. Icons come from lucide-react (ISC).

## Fonts
Playfair Display and Plus Jakarta Sans, via the `@fontsource` packages (SIL Open Font License 1.1), self-hosted.
