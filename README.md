# Altmacro

France opens the screen on 30 September 2026. The chart is the 10-year yield. The OAT Bund spread, 94.5 basis points, stays in the rail. A card played on an earlier month moves today's yield. The published line stays.

The history file is `public/data/panel.json`, built from Compustat Global indicators and WRDS country returns. Dates after 27 October 2026 are excluded. October daily prints are not in this monthly file.

Jorda, Schularick, and Taylor data is not in this build. The long debt ratio is absent until that file is added.

```bash
npm test
npm run dev
npm run build
```

The site is published from `dist/` to GitHub Pages at `/altmacro/`.
