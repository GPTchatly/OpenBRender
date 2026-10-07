import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  FileDown,
  Info,
  Link2,
} from "lucide-react";
import { useMemo } from "react";
import { generateAttributions } from "../../domain/licensing/attribution";
import type { OpenBioFigureProject } from "../../domain/project/schema";
import { checkPublicationReadiness } from "../../domain/publication/preflight";

interface LicensingPanelProps {
  project: OpenBioFigureProject;
  onDownload: (format: "markdown" | "text") => void;
  onDownloadReport: () => void;
}

export function LicensingPanel({
  project,
  onDownload,
  onDownloadReport,
}: LicensingPanelProps) {
  const result = useMemo(() => generateAttributions(project), [project]);
  const preflight = useMemo(
    () => checkPublicationReadiness(project),
    [project],
  );
  const check = result.check;
  const corrections = preflight.checks.filter(
    (item) => item.level === "warning" || item.level === "blocker",
  ).length;
  const ready = check.ready && corrections === 0;

  return (
    <div className="licensing-panel" data-testid="publication-check">
      <div
        className={`publication-score${ready ? " is-ready" : " has-warning"}`}
      >
        <span className="score-icon">
          {ready ? <Check /> : <AlertTriangle />}
        </span>
        <div>
          <strong>Publication check</strong>
          <span className="publication-state">
            {ready ? "Ready" : "Review"}
          </span>
          <small>
            {ready
              ? "Provenance complete"
              : check.ready
                ? `Provenance complete · ${corrections} ${corrections === 1 ? "item" : "items"} to correct`
                : "Review required"}
          </small>
        </div>
      </div>
      <ul className="check-list">
        <li>
          <Check /> {check.completeCount} of {check.usedAssetCount} used assets
          have complete provenance
        </li>
        {Object.entries(check.licenseCounts).map(([license, count]) => (
          <li key={license}>
            <Check /> {count} × {license}
          </li>
        ))}
        {check.warnings.map((warning) => (
          <li className="warning-row" key={warning}>
            <AlertTriangle /> {warning}
          </li>
        ))}
        {check.notes.map((note) => (
          <li key={note}>
            <Info /> {note}
          </li>
        ))}
        {!check.usedAssetCount && <li>No scientific asset is used yet.</li>}
      </ul>
      <section className="preflight-checks" aria-labelledby="preflight-title">
        <div className="section-title">
          <h3 id="preflight-title">Figure preflight</h3>
          <span>{corrections ? "Review" : "Ready"}</span>
        </div>
        <ul className="check-list">
          {preflight.checks.map((item) => (
            <li
              className={
                item.level === "pass" || item.level === "note"
                  ? undefined
                  : "warning-row"
              }
              key={item.message}
            >
              {item.level === "pass" ? (
                <Check />
              ) : item.level === "note" ? (
                <Info />
              ) : (
                <AlertTriangle />
              )}{" "}
              {item.message}
            </li>
          ))}
        </ul>
      </section>
      {check.assets.map((asset) => (
        <article className="credit-card" key={asset.id}>
          <div>
            <strong>{asset.title}</strong>
            <span>{asset.creator.name}</span>
          </div>
          <span className="license-pill">{asset.license.id}</span>
          <p>{asset.attribution.text}</p>
          {asset.source.sourceUrl && asset.verified ? (
            <a href={asset.source.sourceUrl} target="_blank" rel="noopener noreferrer">
              Original source <Link2 />
            </a>
          ) : <p>{asset.source.sourceUrl ?? "Source not supplied"} (self-declared)</p>}
        </article>
      ))}
      <div className="attribution-actions">
        <button
          type="button"
          className="button"
          onClick={onDownloadReport}
        >
          <ClipboardCheck /> Publication report
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onDownload("markdown")}
          disabled={!check.usedAssetCount}
        >
          <FileDown /> ATTRIBUTIONS.md
        </button>
        <button
          type="button"
          className="button"
          onClick={() => onDownload("text")}
          disabled={!check.usedAssetCount}
        >
          <FileDown /> Attribution.txt
        </button>
      </div>
      <p className="legal-note">
        OpenBRender helps track licensing metadata; it does not provide legal
        advice.
      </p>
    </div>
  );
}
