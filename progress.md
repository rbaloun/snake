Original prompt: Build a classic Snake game in this repo. Scope & constraints: - Implement ONLY the classic Snake loop: grid movement, growing snake, food spawn, score, game-over, restart. - Reuse existing project tooling/frameworks; do NOT add new dependencies unless truly required. - Keep UI minimal and consistent with the repo’s existing styles (no new design systems, no extra animations). Implementation plan: 1) Inspect the repo to find the right place to add a small interactive game (existing pages/routes/components). 2) Implement game state (snake positions, direction, food, score, tick timer) with deterministic, testable logic. 3) Render: simple grid + snake + food; support keyboard controls (arrow keys/WASD) and on-screen controls if mobile is present in the repo. 4) Add basic tests for the core game logic (movement, collisions, growth, food placement) if the repo has a test runner. Deliverables: - A small set of files/changes with clear names. - Short run instructions (how to start dev server + where to navigate). - A brief checklist of what to manually verify (controls, pause/restart, boundaries). prosím ovládací prvky udělej v češtině. hadovi udělej černou hlavičku. po té co nasbírá 10 bodů tak otevři další level přidej historii dosažených score. možnost zapsat jméno u dosaženého score. v dalších levelech přidávej postupně různé zdi do prostoru aby to musel had objiždět.

## TODO
- [x] Vytvořit základ HTML/CSS/JS pro Snake.
- [x] Implementovat testovatelné jádro herní logiky.
- [x] Přidat české ovládací prvky + mobilní tlačítka.
- [x] Přidat levely, zdi a černou hlavu hada.
- [x] Přidat historii skóre a ukládání jména.
- [x] Přidat a spustit testy.
- [ ] Ověřit chování přes Playwright skript.

## Postup
- Přidány soubory: `index.html`, `src/game.js`, `src/snake-core.js`, `src/styles.css`, `test/snake-core.test.js`, `package.json`.
- Herní logika je oddělena v `src/snake-core.js` (tick, růst, kolize, spawn jídla, level-up, zdi).
- UI je česky, obsahuje klávesové i dotykové ovládání, restart/pauzu, historii skóre a zadání jména po game-over.
- Ověření: `npm test` -> 7/7 testů prošlo.

## Blokátory / poznámky
- Playwright e2e klient ze skillu se nespustil, protože v prostředí chybí balík `playwright` (`ERR_MODULE_NOT_FOUND` při spuštění `web_game_playwright_client.js`).
- Lokální server (`python3 -m http.server 4173`) funguje.

## TODO pro dalšího agenta
- Pokud bude dostupný `playwright`, spustit:
  - `node /Users/rbaloun/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js --url http://127.0.0.1:4173 --actions-file /Users/rbaloun/.codex/skills/develop-web-game/references/action_payloads.json --iterations 4 --pause-ms 200`
- Zkontrolovat screenshoty a případné konzolové chyby.
