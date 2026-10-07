import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowLeftRight,
  GripVertical,
  MousePointer2,
  PenTool,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { FormField } from "../../components/ui/FormField";
import { IconButton } from "../../components/ui/IconButton";
import type {
  FabricEditor,
  SelectionSnapshot,
} from "../../editor/FabricEditor";

interface PropertyInspectorProps {
  selection: SelectionSnapshot | null;
  onUpdate: (value: Partial<SelectionSnapshot>) => void;
  onAlign: (mode: Parameters<FabricEditor["align"]>[0]) => void;
  onDistribute: (axis: Parameters<FabricEditor["distribute"]>[0]) => void;
  onEditArtwork: () => void;
}

export function PropertyInspector({
  selection,
  onUpdate,
  onAlign,
  onDistribute,
  onEditArtwork,
}: PropertyInspectorProps) {
  if (!selection)
    return (
      <div className="empty-state compact">
        <span className="empty-state-icon">
          <MousePointer2 />
        </span>
        <strong>Nothing selected</strong>
        <p>Select an object on the canvas to edit its position and style.</p>
        <small>Shift-click to select multiple objects.</small>
      </div>
    );

  const numeric =
    (field: keyof SelectionSnapshot) =>
    (event: ChangeEvent<HTMLInputElement>) =>
      onUpdate({ [field]: event.currentTarget.valueAsNumber });

  return (
    <div className="inspector-content">
      <section className="inspector-section">
        <div className="section-title">
          <h3>Selection</h3>
          <span>{selection.kind}</span>
        </div>
        <FormField label="Layer name">
          <input
            value={selection.name}
            onChange={(event) => onUpdate({ name: event.currentTarget.value })}
          />
        </FormField>
        {selection.kind === "svg" && selection.count === 1 && <>
          <button type="button" className="button primary edit-artwork-entry" disabled={selection.locked} onClick={onEditArtwork}>
            <PenTool size={16} /> Edit artwork
          </button>
          <p className="artwork-hint">Edit individual parts, colors and geometry. You can also double-click the artwork.</p>
        </>}
      </section>
      <section className="inspector-section">
        <div className="section-title">
          <h3>Position</h3>
          <span>
            {selection.count > 1 ? `${selection.count} objects` : "px"}
          </span>
        </div>
        <div className="input-grid">
          <FormField label="X">
            <input type="number" value={selection.x} onChange={numeric("x")} />
          </FormField>
          <FormField label="Y">
            <input type="number" value={selection.y} onChange={numeric("y")} />
          </FormField>
          <FormField label="W">
            <input
              type="number"
              min="1"
              value={selection.width}
              disabled={selection.count > 1}
              onChange={numeric("width")}
            />
          </FormField>
          <FormField label="H">
            <input
              type="number"
              min="1"
              value={selection.height}
              disabled={selection.count > 1}
              onChange={numeric("height")}
            />
          </FormField>
          <FormField label="Rotation">
            <input
              type="number"
              value={selection.angle}
              onChange={numeric("angle")}
            />
          </FormField>
        </div>
      </section>
      <section className="inspector-section">
        <div className="section-title">
          <h3>Style</h3>
        </div>
        <div className="color-grid">
          <FormField label="Fill">
            <input
              type="color"
              value={selection.fill ?? "#ffffff"}
              onChange={(event) =>
                onUpdate({ fill: event.currentTarget.value })
              }
            />
          </FormField>
          <FormField label="Stroke">
            <input
              type="color"
              value={selection.stroke ?? "#263238"}
              onChange={(event) =>
                onUpdate({ stroke: event.currentTarget.value })
              }
            />
          </FormField>
        </div>
        <FormField label={`Opacity · ${Math.round(selection.opacity * 100)}%`}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={selection.opacity}
            onChange={numeric("opacity")}
          />
        </FormField>
        <FormField label="Stroke width">
          <input
            type="number"
            min="0"
            max="40"
            step="0.5"
            value={selection.strokeWidth}
            onChange={numeric("strokeWidth")}
          />
        </FormField>
        {selection.kind === "text" && (
          <>
            <FormField label="Font">
              <select
                value={selection.fontFamily}
                onChange={(event) =>
                  onUpdate({ fontFamily: event.currentTarget.value })
                }
              >
                <option value="IBM Plex Sans">
                  IBM Plex Sans
                </option>
                <option value="STIX Two Text">
                  STIX Two Text
                </option>
                <option value="IBM Plex Mono">IBM Plex Mono</option>
              </select>
            </FormField>
            <FormField label="Font size">
              <input
                type="number"
                min="6"
                max="240"
                value={selection.fontSize}
                onChange={numeric("fontSize")}
              />
            </FormField>
            <FormField label="Text alignment">
              <select
                value={selection.textAlign}
                onChange={(event) =>
                  onUpdate({
                    textAlign: event.currentTarget
                      .value as SelectionSnapshot["textAlign"],
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="justify">Justify</option>
              </select>
            </FormField>
          </>
        )}
      </section>
      <section className="inspector-section">
        <div className="section-title">
          <h3>Align & distribute</h3>
        </div>
        <div className="icon-grid six">
          <IconButton
            label="Align left"
            onClick={() => onAlign("left")}
            disabled={selection.count < 2}
          >
            <AlignStartVertical />
          </IconButton>
          <IconButton
            label="Align horizontal center"
            onClick={() => onAlign("center")}
            disabled={selection.count < 2}
          >
            <AlignCenterVertical />
          </IconButton>
          <IconButton
            label="Align right"
            onClick={() => onAlign("right")}
            disabled={selection.count < 2}
          >
            <AlignEndVertical />
          </IconButton>
          <IconButton
            label="Align top"
            onClick={() => onAlign("top")}
            disabled={selection.count < 2}
          >
            <AlignStartHorizontal />
          </IconButton>
          <IconButton
            label="Align vertical center"
            onClick={() => onAlign("middle")}
            disabled={selection.count < 2}
          >
            <AlignCenterHorizontal />
          </IconButton>
          <IconButton
            label="Align bottom"
            onClick={() => onAlign("bottom")}
            disabled={selection.count < 2}
          >
            <AlignEndHorizontal />
          </IconButton>
          <IconButton
            label="Distribute horizontally"
            onClick={() => onDistribute("horizontal")}
            disabled={selection.count < 3}
          >
            <ArrowLeftRight />
          </IconButton>
          <IconButton
            label="Distribute vertically"
            onClick={() => onDistribute("vertical")}
            disabled={selection.count < 3}
          >
            <GripVertical />
          </IconButton>
        </div>
      </section>
    </div>
  );
}
