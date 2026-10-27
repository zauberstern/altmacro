# Altmacro

France opens the screen. The chart shows the published 10-year yield, the German 10-year yield, and the spread in basis points. A scenario holds the decision-month yield and does not change earlier dates.

The history file is `public/data/panel.json`, built from Compustat Global indicators and WRDS country returns. Dates after 27 October 2026 are excluded. The last French yield on or before that date is 30 September 2026, 4.43 percent. The spread that day is 94.6 basis points.

Jordà–Schularick–Taylor data is not in this build. The long debt ratio is absent until that file is added. The monthly yields are the series on the chart.

```bash
npm test
npm run dev
npm run build
```

The site is published from `dist/` to GitHub Pages at `/altmacro/`.
