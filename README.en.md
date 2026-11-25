# 🔗 Ieum

[한국어](README.md) · **English**

A puzzle about linking matching colored dots with lines that never cross. Build your own board, then link everything before time runs out.

▶ **Play: https://ieum.lunchtime.workers.dev**

<p>
  <img src="docs/screens/home-en.png" width="250" alt="Home">
  <img src="docs/screens/build-en.png" width="250" alt="Build: place dots, draw, holes, erase">
  <img src="docs/screens/solve-en.png" width="250" alt="Solve: link matching dots in time">
</p>

## About

- **✏️ Build a board**: place dots in 26 colors (A–Z, 2 per color) on a 10-wide × 11-tall board.
  - **● Place** · **〰 Draw** (pre-link dots) · **🕳 Hole** (knock a cell out of the board) · **🧽 Erase** (one dot, line or hole at a time)
  - "🎲 Random map" scatters holes for you.
  - Pick a time limit (1, 2, 3 or 5 min) and start solving. Pre-drawn lines and holes carry over.
- **⚔️ Two-player match** (one device): two people take turns placing pieces.
  - 14 colors (A–N, 28 pieces) or 26 colors (A–Z, 52 pieces) · 1, 2 or 3 minutes per turn
  - **🎲 Random map**: every round gets a new hole layout (point-symmetric for fairness; the open cells always stay connected). An empty board is also available.
  - Round 1's first player is decided by a coin toss; after that the previous loser chooses.
  - The first player opens with 1 piece; every turn after that places **2 pieces of different colors**. You can take back this turn's pieces and sketch lines while you think.
  - **⚡ Challenge**: on your turn, claim "it can't be linked anymore" — your opponent must link every completed pair within the time limit. If they do, they win; if not, the challenger wins.
  - Run out of time on your turn and you lose. Once every piece is down, the next player challenges or accepts a draw.
- **🎲 Random challenge**: always-solvable boards; each stage adds colors and tightens the clock.
- Korean and English, phones and desktops. Runs entirely in the browser — no server.

## Rules

- Link the two dots of each color. A line counts only if it spans **at least 6 cells, including both dots**; shorter ones show as a faint dashed line.
- Lines can't cross — drawing over another line cuts it. Holes block both dots and lines.
- Link every color in time to win. Run out of time or give up and you lose.

## Run

```sh
npm install
npm run dev        # http://localhost:8802
npm test           # puzzle generation, drawing, building and match rules
npm run deploy     # build and deploy to Cloudflare
```

## Code map

| Path | What's there |
|---|---|
| `src/game` | UI-free rules: cells (`grid`) · drawing state (`board`) · building state (`editor`) · match turns (`versus`) · random maps (`map`) · random boards (`puzzle`) · stages (`stages`) · the 6-cell rule (`rules`) |
| `src/ui` | Screens: SVG board (`board-view`) · build screen · solve screen · match screen · dialogs · i18n · best record |
| `src/main.ts` | Navigation between screens |
| `test` | Vitest tests |
| `docs/og-image.html` | Source of the link preview image (`public/og.png`) |
