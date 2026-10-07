import pack from "../../assets/packs/library-manifest.json" with { type: "json" };
import archived from "../../assets/packs/archived-approved.json" with { type: "json" };
import type { ProjectAsset } from "./schema";
import { svgFingerprint } from "./svgFingerprint";

// The application-owned manifest binds accepted structure and pinned provenance.
// A document's own reviewed flag is never an authority.
// Retain byte/provenance binding for previously saved release artwork, including
// drawings withdrawn from browsing after renderer/export screening.
const approved = new Map([...archived, ...pack].map(record => [record.id, record]));
export function matchesApprovedAsset(asset: ProjectAsset): boolean {
  const original = approved.get(asset.id);
  return Boolean(original && svgFingerprint(asset.svg) === original.fingerprint &&
    JSON.stringify(asset.source) === JSON.stringify(original.source) &&
    JSON.stringify(asset.creator) === JSON.stringify(original.creator) &&
    JSON.stringify(asset.license) === JSON.stringify(original.license) &&
    asset.attribution.text === original.attribution.text);
}
