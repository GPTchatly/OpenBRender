import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Layers3,
  Lock,
  Type,
  Unlock,
} from "lucide-react";
import { IconButton } from "../../components/ui/IconButton";
import type { LayerSnapshot } from "../../editor/FabricEditor";

interface LayersPanelProps {
  layers: LayerSnapshot[];
  onSelect: (id: string) => void;
  onToggle: (id: string, field: "visible" | "locked") => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

export function LayersPanel({
  layers,
  onSelect,
  onToggle,
  onMove,
}: LayersPanelProps) {
  if (!layers.length)
    return (
      <div className="empty-state compact">
        <Layers3 />
        <p>Add an object to create the first layer.</p>
      </div>
    );

  return (
    <div className="layer-panel-content">
      <div className="layer-list-heading">
        <span>{layers.length} layers</span>
        <small>Front to back</small>
      </div>
      <div className="layer-list">
        {layers.map((layer, index) => (
          <div
            className={`layer-row${layer.selected ? " is-selected" : ""}`}
            key={layer.id}
          >
            <button
              type="button"
              className="layer-main"
              onClick={() => onSelect(layer.id)}
            >
              <span className={`kind-dot kind-${layer.kind}`} aria-hidden="true">
                {layer.kind === "text" && <Type />}
              </span>
              <span>
                <strong>{layer.name}</strong>
                <small>{layer.kind}</small>
              </span>
            </button>
            <IconButton
              label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}
              onClick={() => onToggle(layer.id, "visible")}
            >
              {layer.visible ? <Eye /> : <EyeOff />}
            </IconButton>
            <IconButton
              label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`}
              onClick={() => onToggle(layer.id, "locked")}
            >
              {layer.locked ? <Lock /> : <Unlock />}
            </IconButton>
            <span className="layer-move">
              <IconButton
                label={`Move ${layer.name} up`}
                onClick={() => onMove(layer.id, "up")}
                disabled={index === 0}
              >
                <ArrowUp />
              </IconButton>
              <IconButton
                label={`Move ${layer.name} down`}
                onClick={() => onMove(layer.id, "down")}
                disabled={index === layers.length - 1}
              >
                <ArrowDown />
              </IconButton>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
