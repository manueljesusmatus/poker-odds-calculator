# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static poker preflop range viewer (UI text in Spanish). Plain HTML + CSS + vanilla JS — no build step, package manager, linter, or tests. To develop, open `index.html` in a browser (works from `file://`) or serve the folder (e.g. `python3 -m http.server`) and reload.

The app is **13×13** (tab title; there is no on-page header, to save space, and the favicon is an inline SVG mini range grid): `index.html` + `styles.css` + `app.js` + `ranges.js` (originally an "Evo30Visor" design), a dark 6-max 100bb viewer cloned from the PDF screenshots in `resource/EVO VISOR TABLAS/` (the source of truth for the ranges). The previous 9-max viewer (v1) was removed; it is still in git history.

## Structure

- `ranges.js` — data only: `RANGOS.rfi[pos]`, `RANGOS.vsRfi[hero][opener]`, `RANGOS.vs3bet[hero][threeBettor]`. Each chart is 13 strings of 13 letters, row/column order `AKQJT98765432` (above the diagonal = suited, below = offsuit). Letters: `g` open (RFI), `r` 3-bet, `b` call, `o` mixed, `p` 4-bet, `x` fold to the 3-bet (hand you opened), `.` fold.
- `app.js` — state `{pos, vista, rival}` mirrored in the URL hash (`#BTN/vs3bet/BB`). `construirMenu()` shows every chart at once (like v1): an "Apertura RFI" column plus one row per hero position in "VS RFI" and "VS 3-BET", all built from the keys in `RANGOS`, so adding a chart there makes its button appear. Layout by width: wide screens (>1240px) put the menu as a left column (`.app` is a 340px | 1fr grid) and both side columns start at the first grid row (`--cab` = fixed header height) and stretch to its last row (`#info` has a reserved `min-height` so hovering never resizes the side column and drags the menu); 761–1240px puts the three menu blocks in a row above the board; on phones (`max-width: 600px`) `.cuerpo` becomes `display: contents` so the board can be `position: sticky` above the menu, with a one-line `#resumen` instead of the side cards. `VISTAS` holds per-view menu titles, tone, chart titles and legend letters; `ACCIONES` maps each letter to its CSS class and texts.
- `styles.css` — design tokens on `:root` (colors sampled from the original screenshots); each action is a class `a-<name>` setting `--t/--f/--b` (text/fill/border). `.alto-contraste` on `body` (the ◐ contrast button next to the chart title, remembered in localStorage) overrides some tokens.
- Stats: "combos jugados" counts every letter except `.` and `x`; the percentage is over 1326 combos, except vs 3-bet, which is over the opening range (all non-`.` cells).
- The data was extracted from the PDFs by sampling cell colors; every chart's total matches the "COMBOS JUGADOS" shown in its screenshot, and each vs-3-bet chart's non-fold cells match that position's RFI chart.

## Deploy

- `Dockerfile` is `nginx:alpine` plus the 4 site files; `.dockerignore` whitelists only those, so `resource/`, `.git` and docs stay out of the image. A new site file must be added to both.
- `docker-compose.yaml` runs behind Traefik: no published ports, external network `proxy`, router `poker` (must be unique on the VPS), `Host(poker.${DOMAIN})` on the `websecure` entrypoint, container port 80. `DOMAIN` comes from the Stack's Environment in Komodo, never from the repo.
- Deployed as a Komodo Stack from this repo (`master`, file path `docker-compose.yaml`). A GitHub push webhook (content type `application/json`; the form-encoded default fails with "Failed to parse github request body") redeploys with Webhook Force Deploy on, because without it Komodo only redeploys when the compose file changes, not the site files.
