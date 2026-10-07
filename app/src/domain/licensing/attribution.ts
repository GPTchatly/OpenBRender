import type { ProjectAsset } from "../assets/schema";
import type { OpenBioFigureProject, ProjectObject } from "../project/schema";

export interface PublicationCheck {
  usedAssetCount: number;
  completeCount: number;
  incompleteCount: number;
  modifiedCount: number;
  licenseCounts: Record<string, number>;
  ready: boolean;
  warnings: string[];
  notes: string[];
  assets: ProjectAsset[];
}

function collectAssetIds(
  objects: ProjectObject[],
  ids = new Set<string>(),
): Set<string> {
  for (const object of objects) {
    if (object.kind === "svg") ids.add(object.assetId);
    if (object.kind === "group") collectAssetIds(object.children, ids);
  }
  return ids;
}

export function getUsedAssets(project: OpenBioFigureProject): ProjectAsset[] {
  const ids = collectAssetIds(project.objects);
  return [...ids]
    .map((id) => project.assets.find((asset) => asset.id === id))
    .filter((asset): asset is ProjectAsset => Boolean(asset));
}

export function hasCompleteProvenance(asset: ProjectAsset): boolean {
  return Boolean(
    asset.creator.name &&
    asset.source.provider &&
    asset.source.sourceUrl &&
    asset.license.id !== "UNKNOWN" &&
    asset.license.name &&
    asset.license.url &&
    (!asset.license.attributionRequired || asset.attribution.text),
  );
}

export function checkPublication(
  project: OpenBioFigureProject,
): PublicationCheck {
  const assets = getUsedAssets(project);
  const incomplete = assets.filter((asset) => !hasCompleteProvenance(asset));
  const modified = assets.filter((asset) => asset.attribution.modified);
  const licenseCounts: Record<string, number> = Object.create(null);
  for (const asset of assets)
    licenseCounts[asset.license.id] =
      (licenseCounts[asset.license.id] ?? 0) + 1;
  const warnings: string[] = [];
  const notes: string[] = [];
  const selfDeclared = assets.filter(asset => !asset.verified);
  if (selfDeclared.length)
    warnings.push(selfDeclared.length + " asset(s) have self-declared provenance; reviewed catalogue status has not been established.");
  if (incomplete.length)
    warnings.push(
      `${incomplete.length} asset(s) have incomplete provenance or unknown licensing.`,
    );
  if (modified.length)
    notes.push(
      `${modified.length} asset(s) were modified; the generated attribution files disclose the changes.`,
    );
  if (assets.some((asset) => asset.license.attributionRequired))
    notes.push(
      "Required attribution has been generated; keep it with the publication.",
    );
  return {
    usedAssetCount: assets.length,
    completeCount: assets.length - incomplete.length,
    incompleteCount: incomplete.length,
    modifiedCount: modified.length,
    licenseCounts,
    ready: incomplete.length === 0 && selfDeclared.length === 0,
    warnings,
    notes,
    assets,
  };
}

const uniqueCredits = (assets: ProjectAsset[]) => {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    const key = `${asset.attribution.text}|${asset.license.id}|${asset.source.sourceUrl ?? "unknown"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function generateAttributions(project: OpenBioFigureProject) {
  const check = checkPublication(project);
  const credits = uniqueCredits(check.assets);
  const required = credits.filter((asset) => asset.license.attributionRequired);
  const details = credits.map((asset) => {
    const modified = asset.attribution.modified
      ? ` Modified: ${asset.attribution.modificationNotes ?? "yes (details not supplied)"}.`
      : "";
    return `${asset.attribution.text} Source: ${asset.source.sourceUrl ?? "not supplied"} License: ${asset.license.url ?? "not supplied"}.${modified}`;
  });
  const markdown = [
    `# Attributions for ${project.metadata.title}`,
    "",
    "> Generated from project metadata. OpenBRender helps track licensing metadata; it does not provide legal advice.",
    "",
    "## Required attribution",
    "",
    ...(required.length
      ? required.map((asset) => `- ${asset.attribution.text}`)
      : ["No bundled asset in this figure requires attribution."]),
    "",
    "## Provenance ledger",
    "",
    ...(details.length
      ? details.map((line) => `- ${line}`)
      : ["No scientific assets are used in this figure."]),
    "",
  ].join("\n");
  const text = [
    `Attributions for ${project.metadata.title}`,
    "OpenBRender tracks metadata and does not provide legal advice.",
    "",
    ...(required.length
      ? required.map((asset) => asset.attribution.text)
      : ["No bundled asset in this figure requires attribution."]),
    "",
    ...details,
  ].join("\n");
  const legend = required.length
    ? `Assets: ${required.map((asset) => asset.attribution.text).join(" ")}`
    : "No attribution-required bundled assets are used in this figure.";
  return { markdown, text, legend, check };
}
