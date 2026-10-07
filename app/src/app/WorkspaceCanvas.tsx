import { ZoomIn, ZoomOut } from "lucide-react";
import type {
  CSSProperties,
  DragEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { IconButton } from "../components/ui/IconButton";
import type { OpenBioFigureProject } from "../domain/project/schema";

interface WorkspaceCanvasProps {
  project: OpenBioFigureProject;
  zoom: number;
  panning: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  workspaceRef: RefObject<HTMLDivElement | null>;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onPanStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPanMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPanEnd: () => void;
  onBackgroundChange: (color: string) => void;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
}

export function WorkspaceCanvas({
  project,
  zoom,
  panning,
  canvasRef,
  workspaceRef,
  onDrop,
  onPanStart,
  onPanMove,
  onPanEnd,
  onBackgroundChange,
  onZoomChange,
  onFitToScreen,
}: WorkspaceCanvasProps) {
  return (
    <main className="workspace-column">
      <div className="workspace-ribbon">
        <span className="ribbon-cell">
          <span className="cell-label">Sheet</span>
          <span className="ribbon-value">
            {project.document.width} × {project.document.height} px
          </span>
        </span>
        <span className="ribbon-cell">
          <span className="cell-label">Preset</span>
          <span className="ribbon-value ribbon-preset">
            {project.document.preset}
          </span>
        </span>
        <label className="ribbon-cell background-control">
          <span className="cell-label">Background</span>
          <input
            aria-label="Document background"
            type="color"
            value={project.document.background}
            onChange={(event) => onBackgroundChange(event.currentTarget.value)}
          />
        </label>
        <div className="zoom-controls">
          <span className="cell-label">Scale</span>
          <IconButton
            label="Zoom out"
            onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
          >
            <ZoomOut />
          </IconButton>
          <button
            type="button"
            className="zoom-value"
            onClick={onFitToScreen}
            title="Fit to screen"
            aria-label={`Zoom ${Math.round(zoom * 100)}%. Fit to screen`}
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconButton
            label="Zoom in"
            onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}
          >
            <ZoomIn />
          </IconButton>
        </div>
      </div>
      <div
        className={`workspace${panning ? " is-panning" : ""}`}
        ref={workspaceRef}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={onDrop}
        onPointerDown={onPanStart}
        onPointerMove={onPanMove}
        onPointerUp={onPanEnd}
        data-testid="workspace"
      >
        <div
          className="canvas-scale-shell"
          style={{
            width: project.document.width * zoom,
            height: project.document.height * zoom,
          }}
        >
          <span className="sheet-dimension is-width" aria-hidden="true">
            <span>{project.document.width} px</span>
          </span>
          <span className="sheet-dimension is-height" aria-hidden="true">
            <span>{project.document.height} px</span>
          </span>
          <span className="sheet-trim" aria-hidden="true" />
          <div
            className={`canvas-transform${project.settings.grid.enabled ? " has-grid" : ""}`}
            style={{
              transform: `scale(${zoom})`,
              width: project.document.width,
              height: project.document.height,
              ...(project.settings.grid.enabled
                ? ({
                    "--grid-size": `${project.settings.grid.size}px`,
                  } as CSSProperties)
                : {}),
            }}
          >
            <canvas
              ref={canvasRef}
              aria-label="OpenBRender editable canvas"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
