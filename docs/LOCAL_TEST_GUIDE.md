# Local user test guide

## Start

1. Double-click OpenBRender.cmd in the project root, or run npm start.
2. Open http://127.0.0.1:4173 in Chrome or Edge. Keep the server window open.
3. If the address is already running, use that browser address directly. To stop a server you started, press Ctrl+C in its window.

The supplied build needs Node.js 24.11 or newer, but no npm installation and no internet connection. Do not open dist/index.html directly: a local HTTP origin is required. OPENRENDER_PORT can select another port; this creates a separate browser-storage origin.

## Create and edit

1. Choose New figure and a preset or custom dimensions. Alternatively open a starter template.
2. Add text, rectangle, ellipse and arrow from the toolbar. Double-click text on the canvas to edit its contents.
3. Drag and resize objects. Use the Style inspector for coordinates, rotation, colors, opacity and text font/size. Shift-click selects multiple objects.
4. Group/ungroup, duplicate, align and reorder selections. Use Layers to hide, lock or reorder individual objects.
5. Expand Scientific drawing for cells, membranes, DNA, panels, scale bars and editable bar/line charts. Chart components can be ungrouped and edited.
6. Browse 583 drawings across 33 categories, or search for incubator, DNA, pipette, chromatin, antibody, neuron, mouse, microscope, plants, mitochondria or cell. Use Browse topics, Filters and Show more. Add an illustration, adjust its size and optionally recolor it.
7. Check License for provenance and credit downloads. CC BY drawings require attribution: keep downloaded credits with PNG/PDF publications. SVG metadata and portable projects retain source/license/modification records. Imported private artwork is clearly unreviewed; entered license claims do not grant trusted status.

## Save, reopen and recover

Wait for Saved locally after an edit. Reload the page to check autosave. Home lists recent figures; Settings stores appearance and editor preferences locally.

Favorites and recent artwork use this browser's localStorage. Projects and recovery copies use IndexedDB. They are not stored on a server and do not sync across browsers or devices. Clearing browser site data removes these local records; keep portable project backups.

Download a portable project with Save project file. It includes its artwork and rights records. Open the downloaded .obf.json again, or open any of the five projects under examples:

- sample-processing: experimental workflow
- cell-signaling: signaling schematic
- cell-schematic: cell composition
- graphical-abstract: multi-panel abstract
- schematic-with-plot: scientific schematic with synthetic chart values

Portable backups are essential: browser storage can be cleared, denied or exhausted. A failed local save keeps the previous committed revision and leaves the current figure available for file download. The editor also recovers a damaged current revision from a valid previous revision.

To test on another computer without internet, copy the complete local distribution and portable project, install Node beforehand, start OpenBRender.cmd and open the project. The application folder is required as well as the project file.

## Import and export

Import SVG through the library import control. Supply creator/source/license/credit fields when known. Unknown rights remain visible. Unsupported or hostile SVG fails before insertion; the current figure is retained.

- **SVG:** downloads sanitized vector artwork with provenance metadata.
- **PNG:** select 1×, 2×, 3× or 4×. The dimensions are document pixels multiplied by that scale; editor selection handles are excluded.
- **PDF:** click PDF and choose Save as PDF in the browser print dialog. Use 100% scale, no margins and disable headers/footers. Chrome/Edge honor the document's page size at 96 px per inch. The local automated Chromium check confirms vector paths, embedded fonts and no PDF script/launch/attachment actions.

Publication checks help expose rights gaps; they do not certify scientific accuracy. Scale-bar labels, chart values and reference examples need author review. SVG live text can depend on installed fonts in external tools. Raster image import, arbitrary SVG effects and the larger curated publication library are outside this local release.

## Automated checks

The root README lists build/typecheck/security/browser commands. Browser tests run against the production build with actual CSP headers and exercise downloads, reference round trips, editing, private imports, failed saves, recovery and document network isolation. Reports identify the engine/version tested. Native print-dialog choices and scientific usability still need user testing.
