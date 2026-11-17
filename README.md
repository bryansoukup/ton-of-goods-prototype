# Ton of Goods: playable prototype

Klondike, 1897. Haul a ton (2,000 lb) of supplies over the Chilkoot Pass, 50 lb loads at a time, before winter. Your supplies are your cards, and whatever you leave behind is a cache exposed to thieves, avalanches, storms and rot.

Plain HTML, CSS and ES modules. No build step.

- `src/game.js`: pure game logic (seeded RNG), shared by the browser and the tests
- `src/ui.js`: mobile-first DOM UI
- `test/personas.mjs`: simulated persona bots (`node test/personas.mjs 400`)
- `test/e2e.mjs`: Playwright runs through the real UI (serve the folder on :8765 first)
- `FOCUS_GROUP.md`: design critique and simulated focus-group log

Run locally: `python3 -m http.server 8765`, then open http://localhost:8765/ (add `?seed=123` for a fixed seed).
