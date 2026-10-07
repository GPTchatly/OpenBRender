# Scientific drawing library

The local release contains **583 drawings across 33 categories**, up from 538: **296 CC0** and **287 CC BY 4.0**. Some drawings are variants; these counts do not represent 583 distinct scientific concepts.

The source is Bioicons revision `d29e766ea7580b8063c4f47b29e872db40a4d979`, acquired through the pinned OpenBioFigure snapshot `8f72679efc26c821737cc3adb2ddca033150f06e`. An additional 137 candidates were acquired directly from the same pinned Bioicons revision with matching per-icon license metadata and verified Git blob bytes. Each record retains its source URL, creator, license URL, attribution, original SHA-256, upstream Git blob and normalization notes. Servier artwork remains excluded.

All approved library SVGs are files under **app/public-browser/artwork**, Vite's configured public directory. The build copies them to dist/artwork and serves them as **/artwork/<sha256>.svg**. The application ships a metadata manifest rather than SVG bodies in its JavaScript bundle. Thumbnails load lazily; insertion fetches only an application-owned manifest path and verifies its byte hash and supported SVG structure. Private document artwork stays embedded locally and is never uploaded to this directory.

These immutable filenames receive one-year public cache headers. The shell revalidates, and errors must bypass CDN caching. See HOSTING.md for Cloudflare configuration and the live cache checks still required.

The acquisition contains 869 verified non-Servier candidates. Structural/provenance checks and actual browser renderer/export screening exclude 286. Three other candidates failed upstream Git blob verification and were rejected before ingestion. Maintainer normalization expands simple class and inline styles, local gradient templates and non-rendering authoring metadata; it preserves geometry and records changes. Unsupported filters, raster content, complex clipping, external resources and invalid/over-budget exports remain excluded. The runtime policy for private SVGs does not accept arbitrary source stylesheets or editor extensions.

Every shipped drawing is checked for native SVG rendering, actual Fabric grouping, non-empty pixels, and validated standalone SVG export in Chromium. This is compatibility and provenance evidence, not an independent scientific-curation verdict. Authors must check the biological meaning, labels and suitability of each illustration. Historical screening logs are excluded from the public package. The included unit tests recheck every shipped SVG and its provenance; the optional library browser test can reproduce renderer/export checks and writes a fresh reports/library-browser.json. Previous-release provenance bindings remain available for already saved portable projects.

CC BY artwork requires attribution. The License tab generates credits; keep them with publications, especially PNG and PDF exports. SVG metadata and portable project files include source, license and modification records. Full retained artwork credits are in the built /licenses/third-party.txt file.

Browse topics, category/license filters, favorites, recent artwork, and Show more support the larger library. Search terms include amino acid, antibody, neuron, mouse, DNA, microscope, plants, mitochondria, virus and cell.

The CC0 incubator by KeHan is a documented vector adaptation: three blurred gloss highlights become plain vector highlights, while equipment geometry is retained. Only the exact reviewed source hash is eligible for this conversion; private SVG imports still reject filters. The public manifest and docs/audit/artwork-inventory.json retain source, integrity and modification evidence; local acquisition logs are excluded.

The default Scientific drawing DNA tool now creates two connected opposing backbones with paired rungs, all native editable lines. Favorites and recent artwork are stored in browser localStorage; projects and recovery copies are in local IndexedDB. They are not sent to a server.
