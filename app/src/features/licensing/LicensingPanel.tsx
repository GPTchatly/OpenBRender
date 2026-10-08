import { FileCheck2, FileDown, Link2 } from "lucide-react";
import { useMemo } from "react";
import type { ProjectAsset } from "../../domain/assets/schema";
import { getUsedAssets } from "../../domain/licensing/attribution";
import type { OpenBioFigureProject } from "../../domain/project/schema";

interface LicensingPanelProps {
  project: OpenBioFigureProject;
  onDownload: (format: "markdown" | "text") => void;
}

function creditLine(asset: ProjectAsset) {
  if (asset.license.id === "UNKNOWN")
    return "License unknown: check the source's terms before publishing.";
  return asset.license.attributionRequired
    ? `Credit: ${asset.attribution.text}`
    : "No credit required.";
}

export function LicensingPanel({ project, onDownload }: LicensingPanelProps) {
  const assets = useMemo(() => getUsedAssets(project), [project]);
  if (!assets.length)
    return (
      <div className="empty-state compact">
        <FileCheck2 />
        <p>Place a drawing to see its license and credit.</p>
      </div>
    );

  return (
    <div className="licensing-panel">
      {assets.map((asset) => (
        <article className="credit-card" key={asset.id}>
          <div>
            <strong>{asset.title}</strong>
            <span>{asset.creator.name}</span>
          </div>
          <span className="license-pill">{asset.license.id}</span>
          <p>{creditLine(asset)}</p>
          {asset.source.sourceUrl && asset.verified ? (
            <a href={asset.source.sourceUrl} target="_blank" rel="noopener noreferrer">
              Original source <Link2 />
            </a>
          ) : <p>{asset.source.sourceUrl ?? "Source not supplied"} (self-declared)</p>}
        </article>
      ))}
      {assets.some((asset) => asset.license.attributionRequired) && (
        <div className="attribution-actions">
          <button
            type="button"
            className="button"
            onClick={() => onDownload("markdown")}
          >
            <FileDown /> ATTRIBUTIONS.md
          </button>
          <button
            type="button"
            className="button"
            onClick={() => onDownload("text")}
          >
            <FileDown /> Attribution.txt
          </button>
        </div>
      )}
    </div>
  );
}
