import type { AssetMetadata } from "../domain/assets/schema";
import { InputError } from "../domain/security/input";
import pack from "./packs/library-manifest.json" with { type: "json" };
import { sanitizeSvg } from "../domain/assets/sanitize";
import { svgFingerprint } from "../domain/assets/svgFingerprint";

export const seedCatalog: AssetMetadata[] = pack.map(record => {
  const {fingerprint, verified, evidence, ...metadata} = record;
  void fingerprint; void verified; void evidence;
  return metadata;
});
export function getSeedAssetUrl(asset: AssetMetadata): string {
  const record = pack.find(candidate => candidate.id === asset.id);
  if (!record) throw new InputError("missing_asset", "This asset is not in the local pack.");
  return "/artwork/" + record.integrity.slice(7).toLowerCase() + ".svg";
}
export async function getSeedSvg(asset: AssetMetadata): Promise<string> {
  const record = pack.find(candidate => candidate.id === asset.id);
  if (!record) throw new InputError("missing_asset", "This asset is not in the local pack.");
  // The URL is derived exclusively from the application-owned manifest, never
  // from a document's source URL or caller-provided filename.
  const response = await fetch(getSeedAssetUrl(record), {signal: AbortSignal.timeout(60_000), redirect: "error"});
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/svg+xml"))
    throw new InputError("missing_asset", "The library drawing could not be loaded. Please retry.");
  if (Number(response.headers.get("content-length")) > 2_000_000)
    throw new InputError("asset_size", "The library drawing exceeds the supported size.");
  const raw = await response.text();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const integrity = "sha256-" + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,"0")).join("").toUpperCase();
  const safe = sanitizeSvg(raw);
  if (integrity !== record.integrity || svgFingerprint(safe.svg) !== record.fingerprint)
    throw new InputError("asset_integrity", "The library drawing failed its integrity check. Refresh the app and retry.");
  return safe.svg;
}
