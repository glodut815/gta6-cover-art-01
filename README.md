# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/glodut815/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/glodut815/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080/app/index.html in desktop Chrome. Or open `app/index.html` directly from the files — the app works offline from its own static files.

---

<sub>Entered on [make.fun](https://make.fun/?ref=s9fbxxcj&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

## Neon Vice Cover Studio

Turn any photo and a caption into cover art in the style of GTA 6 posters: a multi-panel cover look, bold lettering, and a Vice City sunset or neon colour grade — exported as a PNG to share. It runs offline in a desktop browser from its own static files; the photos never leave the machine.

### What it does

- **Any photo**: upload your own, drag and drop it onto the cover, or try one of the two bundled samples (a beach at sunset, a city at dusk).
- **Multi-panel layouts**: Solo, Duo, Trio and Quad. Click a panel to select it, drag it to move the photo inside it, scroll to zoom, or use the sliders.
- **Colour grades**: Sunset, Neon, Vice and Noir — each a real grade over the photo, not a flat filter sticker.
- **Caption editing**: title, subtitle, two display letterings (Anton and Bebas Neue) and four ink colours. The title is drawn with a heavy outline and a drop shadow, GTA-poster style.
- **Fast export**: one click renders the cover at a common post size — 1080×1080, 1080×1350 or 1920×1080 — and downloads the PNG, with an on-screen preview first.

### How it is built

- `app/index.html` + `app/style.css` + `app/src/main.js` — the whole app, plain HTML/CSS/JS, no frameworks, no network calls.
- `app/fonts/` — Anton and Bebas Neue, both under the SIL Open Font License (see `app/fonts/OFL.txt`).
- `app/samples/` — beach at sunset (CC0, via Rawpixel) and a city at dusk (Picsum / Unsplash licence).
- `screenshots/` — the app with a photo loaded, and a cover it exported.
- `main.ts` — the entry program (Node 22, standard library only). It copies `app/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored dossier builder.
- `serve.ts` — a small static file server for local testing on port 8080.

No Rockstar Games logo, artwork or font is used anywhere.
