# OpenBRender 0.1.0

Open-source scientific figure editor adapted from OpenBioFigure. This dated
distribution includes the supported browser application's source, locked
dependencies, tests, licensed artwork, and a ready-to-run production build.

## Run

Install Node.js 24.11 or newer, extract this entire directory, and double-click
**OpenBRender.cmd** on Windows, or run `npm start` from this directory.
Open **http://127.0.0.1:4173** in Chrome or Edge and keep the server running.
Running the supplied build needs no dependency installation or internet access.
Documents stay in the browser's local storage; save portable project backups
before clearing browser data. Five synthetic example figures are in `examples/`.

Read [the user guide](docs/LOCAL_TEST_GUIDE.md) and
[artwork editing guide](docs/ARTWORK_EDITOR.md).

## Develop

From this directory:

```sh
npm ci --ignore-scripts
npm --prefix app ci --ignore-scripts
npm test
npm run typecheck:domain
npm run build
npm start
```

Dependencies are pinned in the two npm lockfiles. Initial installation requires
access to the public npm registry or a populated npm cache. The Fabric and
DOMPurify packages are vendored under `vendor/` and retain their licences.

Optional browser checks require Playwright's installed browser binaries:

```sh
npm --prefix app exec -- playwright install chromium
npm run test:browser
npm run test:artwork-browser
npm run test:library-browser
```

Run browser checks with the production app already served at the default address.
Generated test reports belong in `reports/` and are excluded from this release.

## Features and scope

Editable text, shapes, arrows, layers, groups, scientific drawing tools, editable
charts, an SVG artwork editor, autosave/recovery, portable project files, and
SVG/PNG/vector-PDF exports. The library includes 583 drawings across 33 categories
(296 CC0 and 287 CC BY 4.0), with per-item provenance and credits.

This is a local browser evaluation release. It includes no native installer and
claims no hosted deployment, scientific certification, broad external-tool export
review, or service-worker offline installation. PDF uses the browser print dialog.
Publication rights and scientific suitability require the figure author's review.

## Licensing and integrity

Code retains [Apache-2.0](LICENSE); [NOTICE](NOTICE) records upstream authorship and
changes. Artwork, fonts, Fabric, DOMPurify and bundled dependencies retain their
separate licences and public attribution. See `app/dist/licenses/third-party.txt`,
the other files under `app/dist/licenses/`, and
`app/src/assets/packs/library-manifest.json`. The public upstream revision is
recorded in `docs/upstream-source.lock.json`.

`RELEASE_NOTES.md` describes this snapshot.
