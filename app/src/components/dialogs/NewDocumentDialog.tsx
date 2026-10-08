import { File, LayoutTemplate, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  DOCUMENT_PRESETS,
  type DocumentPreset,
} from "../../domain/project/factory";
import {
  FIGURE_TEMPLATES,
  type FigureTemplateId,
} from "../../domain/templates/templates";
import { FormField } from "../ui/FormField";
import { IconButton } from "../ui/IconButton";
import { useDialogBehavior } from "./useDialogBehavior";

interface NewDocumentDialogProps {
  initialPreset: Exclude<DocumentPreset, "custom">;
  onClose: () => void;
  onCreate: (preset: DocumentPreset, width: number, height: number) => void;
  onCreateTemplate: (templateId: FigureTemplateId) => void;
}

export function NewDocumentDialog({
  initialPreset,
  onClose,
  onCreate,
  onCreateTemplate,
}: NewDocumentDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  useDialogBehavior(dialogRef, onClose);
  const [mode, setMode] = useState<"blank" | "template">("blank");
  const [preset, setPreset] = useState<DocumentPreset>(initialPreset);
  const [width, setWidth] = useState<number>(
    DOCUMENT_PRESETS[initialPreset].width,
  );
  const [height, setHeight] = useState<number>(
    DOCUMENT_PRESETS[initialPreset].height,
  );
  const presetOptions: {
    id: DocumentPreset;
    label: string;
    width: number;
    height: number;
  }[] = [
    { id: "square", ...DOCUMENT_PRESETS.square },
    { id: "widescreen", ...DOCUMENT_PRESETS.widescreen },
    { id: "a4-portrait", ...DOCUMENT_PRESETS["a4-portrait"] },
    { id: "a4-landscape", ...DOCUMENT_PRESETS["a4-landscape"] },
    { id: "journal", ...DOCUMENT_PRESETS.journal },
    { id: "custom", label: "Custom", width, height },
  ];

  // A click opens the chosen format or template at once; the second click of a
  // double-click is ignored so it cannot open a second figure.
  const updatePreset = (next: DocumentPreset, clicks: number) => {
    setPreset(next);
    if (next !== "custom") {
      setWidth(DOCUMENT_PRESETS[next].width);
      setHeight(DOCUMENT_PRESETS[next].height);
      if (clicks < 2)
        onCreate(next, DOCUMENT_PRESETS[next].width, DOCUMENT_PRESETS[next].height);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-document-title"
      >
        <div className="dialog-header">
          <div>
            <h2 id="new-document-title">Create a new figure</h2>
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div
          className="new-document-modes"
          role="tablist"
          aria-label="Figure starting point"
        >
          <button
            id="new-document-blank-tab"
            type="button"
            role="tab"
            aria-selected={mode === "blank"}
            aria-controls="new-document-blank-panel"
            onClick={() => setMode("blank")}
          >
            <File aria-hidden="true" />
            <span>
              <strong>Blank figure</strong>
              <small>Choose dimensions and begin freely</small>
            </span>
          </button>
          <button
            id="new-document-template-tab"
            type="button"
            role="tab"
            aria-selected={mode === "template"}
            aria-controls="new-document-template-panel"
            onClick={() => setMode("template")}
          >
            <LayoutTemplate aria-hidden="true" />
            <span>
              <strong>Use a template</strong>
              <small>Start with an editable composition</small>
            </span>
          </button>
        </div>

        {mode === "blank" ? (
          <div
            id="new-document-blank-panel"
            role="tabpanel"
            aria-labelledby="new-document-blank-tab"
            className="new-document-panel"
          >
            <div className="preset-grid">
              {presetOptions.map(({ id, ...item }) => (
                <button
                  type="button"
                  className={`preset-card${preset === id ? " is-selected" : ""}`}
                  onClick={(event) => updatePreset(id, event.detail)}
                  key={id}
                >
                  <span
                    className="preset-preview"
                    style={{ aspectRatio: `${item.width}/${item.height}` }}
                  />
                  <strong>{item.label}</strong>
                  <small>
                    {id === "custom"
                      ? "Set dimensions"
                      : `${item.width} × ${item.height} px`}
                  </small>
                </button>
              ))}
            </div>
            <div className="dialog-fields two-columns">
              <FormField label="Width (px)">
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={width}
                  onChange={(event) => {
                    setPreset("custom");
                    setWidth(event.currentTarget.valueAsNumber);
                  }}
                />
              </FormField>
              <FormField label="Height (px)">
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={height}
                  onChange={(event) => {
                    setPreset("custom");
                    setHeight(event.currentTarget.valueAsNumber);
                  }}
                />
              </FormField>
            </div>
          </div>
        ) : (
          <div
            id="new-document-template-panel"
            role="tabpanel"
            aria-labelledby="new-document-template-tab"
            className="new-document-panel template-choice-grid"
          >
            {FIGURE_TEMPLATES.map((template) => (
              <button
                type="button"
                className="template-choice"
                onClick={(event) => {
                  if (event.detail < 2) onCreateTemplate(template.id);
                }}
                key={template.id}
              >
                <span
                  className={`start-template-preview template-${template.preview}`}
                  style={{
                    aspectRatio: `${template.width}/${template.height}`,
                  }}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <strong>{template.title}</strong>
                  <small>{template.description}</small>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          {mode === "blank" && (
            <button
              type="button"
              className="button primary"
              onClick={() => onCreate(preset, width, height)}
              disabled={!width || !height}
            >
              Create figure
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
