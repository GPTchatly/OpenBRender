import { AlertTriangle, Check } from "lucide-react";
import type { SaveState } from "./types";
import { BrandGlyph } from "./Brand";
import type { PublicationCheck } from "../domain/licensing/attribution";
import type { SelectionSnapshot } from "../editor/FabricEditor";

interface EditorStatusProps {
  saveState: SaveState;
  selection: SelectionSnapshot | null;
  publication: PublicationCheck;
  labels: {
    saving: string;
    saveFailed: string;
    savedLocally: string;
  };
  onOpenLicensing: () => void;
  onHome: () => void;
}

export function EditorStatus({
  saveState,
  selection,
  publication,
  labels,
  onOpenLicensing,
  onHome,
}: EditorStatusProps) {
  return (
    <>
      <footer className="statusbar">
        <span className="status-cell">
          <span className="cell-label" aria-hidden="true">
            Status
          </span>
          <span className={`save-status status-${saveState}`} role="status">
            {saveState === "saving"
              ? labels.saving
              : saveState === "error"
                ? labels.saveFailed
                : labels.savedLocally}
          </span>
        </span>
        <span className="status-cell status-center">
          <span className="cell-label" aria-hidden="true">
            Selection
          </span>
          <span className="status-value">
            {selection
              ? `${selection.count} selected · ${selection.name}`
              : "No selection"}
          </span>
        </span>
        <button
          type="button"
          onClick={onOpenLicensing}
          className={`status-cell ${
            publication.ready ? "publication-ready" : "publication-warning"
          }`}
        >
          <span className="cell-label" aria-hidden="true">
            Credits
          </span>
          {publication.ready ? <Check /> : <AlertTriangle />}
          <span>
            {publication.ready ? "Credits complete" : "Review licensing"}
          </span>
          <small>
            {publication.completeCount}/{publication.usedAssetCount} verified
          </small>
        </button>
      </footer>
      <div className="mobile-message">
        <BrandGlyph />
        <h1>OpenBRender</h1>
        <p>
          The editor needs a wider screen. Use a tablet or desktop to compose
          figures; saved projects remain local to this browser.
        </p>
        <button type="button" className="button primary large" onClick={onHome}>
          Back to home
        </button>
      </div>
    </>
  );
}
