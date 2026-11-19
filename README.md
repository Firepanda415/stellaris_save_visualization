# Stellaris Atlas

Open a Stellaris text-format `.sav` in your browser and drag across the map to count planets by size. Ctrl-click a system or Ctrl-drag another rectangle to toggle its membership. Scroll to zoom. Drag in Pan mode to move the map.

The world filters control both size labels and the size distribution. Toxic worlds have their own column and can be limited to terraforming candidates. **Include foreign territory** adds systems owned by other empires and systems of unknown ownership to the totals. Orbital yields use eligible deposits in the counted systems, regardless of the planet-size filter. Surface strategic deposits are counted as features because their production depends on jobs.

Player records show charted systems, surveyed bodies and known dig sites. Foreign ownership requires system intel and diplomatic contact. The full-save view also shows hidden deposits, precursor regions, destinations and ruined megastructures. Event tooltips describe possible rewards and the conditions for earning them.

## Run locally

Serve `web/` with a static HTTP server, for example `python -m http.server 4174 --bind 127.0.0.1 --directory web`. Open `http://127.0.0.1:4174/` and choose a save. The browser reads the file locally.

With Node.js 22, run `npm test` or build a single offline page with `node scripts/offline.mjs local/atlas.html`. An optional final argument embeds a map from a local save. That HTML contains the campaign data and can reopen another save.

The English and Simplified Chinese catalog uses Stellaris 4.5.4 game definitions. To rebuild it from an installation, run `python scripts/build_catalog.py "path/to/Stellaris"` with Python 3.12. The map reads the objects present in each save. Unmapped deposit keys appear in the selection summary.

