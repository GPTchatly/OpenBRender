import { generateAttributions } from "../licensing/attribution";
import { parseProject, type OpenBioFigureProject } from "../project/schema";
import { sanitizeSvg } from "../assets/sanitize";
import { assertByteLimit, INPUT_LIMITS } from "../security/input";
import { normalizeFabricSvgIdentifiers } from "./fabricSvgIdentifiers";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export function safeFileStem(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "").slice(0, 80).replace(/-$/, "") || "openbiofigure"
  );
}

export function buildProjectJson(project: OpenBioFigureProject): string {
  const output = JSON.stringify(parseProject(project), null, 2) + "\n";
  assertByteLimit(output, INPUT_LIMITS.projectBytes);
  return output;
}

export function buildSvgExport(
  canvasSvg: string,
  project: OpenBioFigureProject,
): string {
  project = parseProject(project);
  // Remove only Fabric's fixed XML declaration, which includes an unnecessary standalone field.
  canvasSvg = canvasSvg.replace(/^<\?xml version="1.0" encoding="UTF-8" standalone="no" \?>\s*/, "");
  // Fabric emits this fixed external DTD. Local imports never receive this exception.
  canvasSvg = canvasSvg.replace(/<!DOCTYPE svg PUBLIC "-\/\/W3C\/\/DTD SVG 1\.1\/\/EN" "http:\/\/www\.w3\.org\/Graphics\/SVG\/1\.1\/DTD\/svg11\.dtd">\s*/, "");
  canvasSvg = sanitizeSvg(normalizeFabricSvgIdentifiers(canvasSvg)).svg;
  const attribution = generateAttributions(project);
  const metadata = escapeXml(
    JSON.stringify({
      generator: "OpenBRender 0.1.0 (OpenBioFigure 0.3.0 adaptation)",
      projectFormat: project.formatVersion,
      title: project.metadata.title,
      attributions: attribution.check.assets.map((asset) => ({
        id: asset.id,
        creator: asset.creator.name,
        license: asset.license.id,
        licenseUrl: asset.license.url,
        source: asset.source.sourceUrl,
        attribution: asset.attribution.text,
        modified: asset.attribution.modified,
        modificationNotes: asset.attribution.modificationNotes,
      })),
    }),
  );
  const output = canvasSvg.replace(
    /(<svg\b[^>]*>)/,
    (_match, root: string) => root + '<metadata id="openbiofigure-metadata">' + metadata + "</metadata>",
  );
  return sanitizeSvg(output).svg;
}

export function makeDownload(
  content: BlobPart,
  type: string,
  filename: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
