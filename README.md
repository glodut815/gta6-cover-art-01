[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/glodut815/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/glodut815/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Bounty: https://make.fun/bounty/gta6-cover-art-01

# Neon Vice Cover Studio — make.fun entry

An offline web app that turns any photo and a caption into GTA 6-style
cover art: the multi-panel poster look with bold caption lettering and a
Vice City sunset or neon grade, exported as a PNG to share.

- **Any photo:** drop in your own photos (or use the two built-in
  samples), pick one per panel, drag to pan and scroll to zoom, crop by
  zooming. One photo can fill several panels with different crops.
- **The art:** four layouts (Hero + 3, Four grid, Full bleed, Nine
  grid), five colour grades (Vice Sunset, Neon Night, Golden Hour, Noir,
  Clean), Anton title lettering with a Pacifico script subtitle, white
  poster frame, film grain and vignette — all drawn on canvas.
- **Fast and easy:** photo in, cover out in a few clicks; export
  1080 × 1080, 1080 × 1350 or 1920 × 1080 PNGs, one at a time or all
  three at once.
- **Offline and private:** static files under `app/`, no network
  request, no upload — photos never leave the machine. Fonts are
  vendored (Anton & Pacifico, SIL Open Font License).

## Try it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

## Hand in

`main.ts` (Node 22, stdlib only) copies `app/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with the kit's vendored
`buildDossier` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`. Fonts under `app/fonts/` are under the SIL Open
Font License (see `app/fonts/OFL.txt`). Sample photos were made with an
image model for the make.fun kit and are free to use.
