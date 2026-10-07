# Static hosting contract

The Vercel project root is app. app/vercel.json defines the static build and response headers. No Vercel Function, backend identity cookie, remote conversion or application upload endpoint exists.

## Browser policy

Script policy permits only bundled same-origin scripts and disallows inline handlers/evaluation. The narrow style-src-attr 'unsafe-inline' exception supports inherited React/Fabric element layout and controls. It does not permit inline scripts or stylesheet blocks. Imported arbitrary CSS is rejected by the SVG structural policy; model paints are bounded colors. The real-browser suite exercises this policy on the local production build. Trusted Types and public-provider integration remain further release work.

Fingerprinted Vite /assets/ resources and approved /artwork/<sha256>.svg files receive Cache-Control: public, max-age=31536000, immutable. Library SVGs live in app/public-browser/artwork, Vite's configured public directory, and are copied unchanged to dist/artwork. They are served as files, loaded on demand, and excluded from JavaScript bundles. Each insertion checks the manifest's byte hash and revalidates SVG structure. The shell and non-fingerprinted resources revalidate. Local 404 responses use no-store. No blanket SPA rewrite sends HTML for unknown assets or provider verification paths. The browser build excludes the inherited service worker and desktop bridge, and does not advertise offline installation yet.

For Cloudflare in front of Vercel, respect the origin cache headers for successful /artwork/*.svg responses and bypass errors and mutable resources. SVG is a default cacheable extension, but directory placement alone does not prove edge caching. After deployment, probe Content-Type, Cache-Control, absence of Set-Cookie, and cold/warm CF-Cache-Status. A changed drawing receives a new SHA-256 URL; retain old URLs for existing release tabs rather than overwrite immutable files. See [Cloudflare default caching](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) and [cache control](https://developers.cloudflare.com/cache/concepts/cache-control/). Live Cloudflare HIT behavior has not been verified locally.

## Provider controls for a public deployment

Before a public deployment, configure and verify: canonical hostname, Cloudflare Full (strict), a zone-overwritten 256-bit origin credential, Vercel WAF host/credential rejection across all static paths, protected previews/generated/old deployments, narrowly scoped provider verification routes, rotation, and cold/warm cache and MIME probes.

No origin credential belongs in source, Vite variables or response headers. Cloudflare must bypass mutable shell/worker/catalogue pointers and errors and disable unneeded injected scripts/content transformations. Host/SNI direct-origin rejection and final public headers require live evidence.

No deployment or provider protection is claimed by this configuration file.
