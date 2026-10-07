import { X } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { PendingSvg } from "../../app/types";
import type { ProjectAsset } from "../../domain/assets/schema";
import { FormField } from "../ui/FormField";
import { IconButton } from "../ui/IconButton";
import { useDialogBehavior } from "./useDialogBehavior";

interface SvgMetadataDialogProps {
  pending: PendingSvg;
  onClose: () => void;
  onImport: (asset: ProjectAsset) => void;
}

function isOptionalHttpsUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return value.length <= 2048 && url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function SvgMetadataDialog({
  pending,
  onClose,
  onImport,
}: SvgMetadataDialogProps) {
  const dialogRef = useRef<HTMLFormElement>(null);
  useDialogBehavior(dialogRef, onClose);
  const [title, setTitle] = useState(pending.fileName.replace(/\.svg$/i, ""));
  const [creator, setCreator] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [licenseId, setLicenseId] = useState("UNKNOWN");
  const [licenseName, setLicenseName] = useState("Unknown license");
  const [licenseUrl, setLicenseUrl] = useState("");
  const [attributionRequired, setAttributionRequired] = useState(false);
  const [attribution, setAttribution] = useState("");
  const [validationError, setValidationError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setValidationError("Asset title is required.");
      return;
    }
    if (!isOptionalHttpsUrl(sourceUrl) || !isOptionalHttpsUrl(licenseUrl)) {
      setValidationError("Source and license URLs must be HTTPS URLs without credentials.");
      return;
    }
    setValidationError("");
    onImport({
      id: `user-${globalThis.crypto.randomUUID()}`,
      title: title || "Imported SVG",
      description: "User-imported scientific SVG.",
      keywords: ["user import"],
      category: "User imports",
      source: {
        provider: "User import",
        sourceUrl: sourceUrl || null,
        assetUrl: sourceUrl || null,
        retrievedAt: new Date().toISOString().slice(0, 10),
      },
      creator: { name: creator || "Unknown creator", url: null },
      license: {
        id: licenseId || "UNKNOWN",
        name: licenseName || "Unknown license",
        url: licenseUrl || null,
        attributionRequired,
      },
      attribution: {
        text: attribution || "Attribution details not supplied",
        modified: pending.changed,
        modificationNotes: pending.changed
          ? "SVG serialization was normalized and inert comments were removed during import."
          : null,
      },
      svg: pending.svg,
      verified: false,
    });
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <form
        ref={dialogRef}
        className="dialog metadata-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="svg-metadata-title"
        onSubmit={submit}
        noValidate
      >
        <div className="dialog-header">
          <div>
            <h2 id="svg-metadata-title">Provenance metadata</h2>
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <p className="dialog-copy">
          License fields may be left unknown. OpenBRender will flag the asset
          as not publication-ready; it never guesses a license.
        </p>
        {pending.changed && (
          <p className="notice info">
            SVG serialization was normalized and inert comments were removed before import.
          </p>
        )}
        {validationError && (
          <p className="notice warning" role="alert">
            {validationError}
          </p>
        )}
        <div className="dialog-fields two-columns">
          <FormField label="Asset title">
            <input
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              aria-invalid={!title.trim()}
            />
          </FormField>
          <FormField label="Creator">
            <input
              value={creator}
              onChange={(event) => setCreator(event.currentTarget.value)}
              placeholder="Unknown if not supplied"
            />
          </FormField>
          <FormField label="Original source URL">
            <input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.currentTarget.value)}
              placeholder="https://…"
            />
          </FormField>
          <FormField label="License identifier">
            <input
              value={licenseId}
              onChange={(event) => setLicenseId(event.currentTarget.value)}
              placeholder="e.g. CC-BY-4.0"
            />
          </FormField>
          <FormField label="License name">
            <input
              value={licenseName}
              onChange={(event) => setLicenseName(event.currentTarget.value)}
            />
          </FormField>
          <FormField label="License URL">
            <input
              type="url"
              value={licenseUrl}
              onChange={(event) => setLicenseUrl(event.currentTarget.value)}
              placeholder="https://…"
            />
          </FormField>
        </div>
        <label className="check-field">
          <input
            type="checkbox"
            checked={attributionRequired}
            onChange={(event) =>
              setAttributionRequired(event.currentTarget.checked)
            }
          />{" "}
          Attribution is required
        </label>
        <FormField label="Attribution text">
          <textarea
            className="resize-none"
            rows={3}
            value={attribution}
            onChange={(event) => setAttribution(event.currentTarget.value)}
            placeholder="Exact credit text, if known"
          />
        </FormField>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            Import SVG
          </button>
        </div>
      </form>
    </div>
  );
}
