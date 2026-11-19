# Stellaris Atlas

Open a Stellaris text-format `.sav` in your browser and drag across the map to count planets by size. Ctrl-click a system or Ctrl-drag another rectangle to toggle its membership. Scroll to zoom. Drag in Pan mode to move the map.

The world filters control both size labels and the size distribution. Toxic worlds have their own column and can be limited to terraforming candidates. The territory overlay colors player systems green, regular NPC systems blue and Fallen Empires orange, including awakened Fallen Empires. Under **Territory to count**, choose which owners to include in the selection totals. Unclaimed systems always count. Orbital yields use eligible deposits in the counted systems, regardless of the planet-size filter.

The resource key beside the map lets you highlight a single material or feature. Hover over a symbol to see which planet has it. Betharian Fields, Minor Artifacts deposits and possible relic rewards have separate symbols. The selection panel lists feature counts and fixed surface yields. Expand a feature to find its systems and planets. Job bonuses and event rewards are listed separately from fixed production.

Player records show charted systems, surveyed bodies and known dig sites. Foreign ownership requires system intel and diplomatic contact. The full-save view also shows hidden deposits, precursor regions, destinations and ruined megastructures. Hover over an event or dig site (✦) or a precursor home system (★) to see its name. Where a reward is known, the tooltip gives its conditions.

## Run locally

Serve `web/` with a static HTTP server, for example `python -m http.server 4174 --bind 127.0.0.1 --directory web`. Open `http://127.0.0.1:4174/` and choose a save. The browser reads the file locally.

With Node.js 22, run `npm test` or build a single offline page with `node scripts/offline.mjs local/atlas.html`. An optional final argument embeds a map from a local save. That HTML contains the campaign data and can reopen another save.

The English and Simplified Chinese catalog uses Stellaris 4.5.4 game definitions. To rebuild it from an installation, run `python scripts/build_catalog.py "path/to/Stellaris"` with Python 3.12. The map reads the objects present in each save. Unmapped deposit keys appear in the selection summary.

