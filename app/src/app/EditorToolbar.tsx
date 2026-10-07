import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  ArrowUpToLine,
  BoxSelect,
  Circle,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Group,
  Hand,
  ImageDown,
  Minus,
  MousePointer2,
  MoreHorizontal,
  Redo2,
  Save,
  Square,
  TextCursorInput,
  Trash2,
  Undo2,
  Ungroup,
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { IconButton } from "../components/ui/IconButton";
import type { FabricEditor, SelectionSnapshot } from "../editor/FabricEditor";

interface EditorToolbarProps {
  getEditor: () => FabricEditor | null;
  selection: SelectionSnapshot | null;
  canUndo: boolean;
  canRedo: boolean;
  panning: boolean;
  exportScale: number;
  onNew: () => void;
  onRequestOpenProject: () => void;
  onSaveProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPanningChange: (active: boolean) => void;
  onExportScaleChange: (scale: number) => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
}

function ToolbarCell({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`toolbar-cell ${className}`} role="group" aria-label={label}>
      <span className="cell-label" aria-hidden="true">
        {label}
      </span>
      <div className="toolbar-group">{children}</div>
    </div>
  );
}

function ToolButton({
  label,
  caption,
  icon,
  active,
  onClick,
  testId,
}: {
  label: string;
  caption: string;
  icon: ReactNode;
  active?: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      className={`toolbar-tool${active ? " is-active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
      <span>{caption}</span>
    </button>
  );
}

export function EditorToolbar({
  getEditor,
  selection,
  canUndo,
  canRedo,
  panning,
  exportScale,
  onNew,
  onRequestOpenProject,
  onSaveProject,
  onUndo,
  onRedo,
  onPanningChange,
  onExportScaleChange,
  onExportSvg,
  onExportPng,
  onExportPdf,
}: EditorToolbarProps) {
  const runMoreAction = (
    event: MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    action();
    event.currentTarget.closest("details")?.removeAttribute("open");
  };

  return (
    <header className="topbar">
      <ToolbarCell label="File" className="document-actions">
        <IconButton label="New document" onClick={onNew}>
          <FilePlus2 />
        </IconButton>
        <IconButton label="Open project" onClick={onRequestOpenProject}>
          <FolderOpen />
        </IconButton>
        <IconButton
          label="Save project file"
          onClick={onSaveProject}
          testId="save-project"
        >
          <Save />
        </IconButton>
      </ToolbarCell>
      <ToolbarCell label="Edit">
        <IconButton
          label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          testId="undo"
        >
          <Undo2 />
        </IconButton>
        <IconButton
          label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          testId="redo"
        >
          <Redo2 />
        </IconButton>
        <IconButton
          label="Duplicate selection"
          onClick={() => void getEditor()?.duplicate()}
          disabled={!selection}
        >
          <Copy />
        </IconButton>
        <IconButton
          label="Delete selection"
          onClick={() => getEditor()?.deleteSelection()}
          disabled={!selection}
        >
          <Trash2 />
        </IconButton>
      </ToolbarCell>
      <ToolbarCell label="Tool" className="mode-tools">
        <ToolButton
          label="Select tool"
          caption="Select"
          active={!panning}
          onClick={() => onPanningChange(false)}
          icon={<MousePointer2 />}
        />
        <ToolButton
          label="Pan tool"
          caption="Pan"
          active={panning}
          onClick={() => onPanningChange(!panning)}
          icon={<Hand />}
        />
      </ToolbarCell>
      <ToolbarCell label="Insert" className="object-tools">
        <ToolButton
          label="Add text"
          caption="Text"
          onClick={() => getEditor()?.addText()}
          testId="add-text"
          icon={<TextCursorInput />}
        />
        <ToolButton
          label="Add rectangle"
          caption="Rectangle"
          onClick={() => getEditor()?.addRect()}
          testId="add-rectangle"
          icon={<Square />}
        />
        <ToolButton
          label="Add ellipse"
          caption="Ellipse"
          onClick={() => getEditor()?.addEllipse()}
          icon={<Circle />}
        />
        <ToolButton
          label="Add arrow"
          caption="Arrow"
          onClick={() => getEditor()?.addArrow()}
          icon={<ArrowRight />}
        />
        <details className="toolbar-more">
          <summary
            role="button"
            aria-label="More drawing tools"
            title="More drawing tools"
          >
            <MoreHorizontal />
          </summary>
          <div className="toolbar-popover" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={(event) =>
                runMoreAction(event, () => getEditor()?.addLine())
              }
            >
              <Minus /> Add line
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(event) =>
                runMoreAction(event, () => getEditor()?.addLine("connector"))
              }
            >
              <BoxSelect /> Add connector
            </button>
          </div>
        </details>
      </ToolbarCell>
      <ToolbarCell label="Arrange" className="arrange-tools">
        <IconButton
          label="Group selection"
          onClick={() => getEditor()?.group()}
          disabled={!selection || selection.count < 2}
        >
          <Group />
        </IconButton>
        <IconButton
          label="Ungroup selection"
          onClick={() => getEditor()?.ungroup()}
          disabled={selection?.kind !== "group"}
        >
          <Ungroup />
        </IconButton>
        <IconButton
          label="Bring to front"
          onClick={() => getEditor()?.arrange("front")}
          disabled={!selection}
        >
          <ArrowUpToLine />
        </IconButton>
        <IconButton
          label="Bring forward"
          onClick={() => getEditor()?.arrange("forward")}
          disabled={!selection}
        >
          <ArrowUp />
        </IconButton>
        <IconButton
          label="Send backward"
          onClick={() => getEditor()?.arrange("backward")}
          disabled={!selection}
        >
          <ArrowDown />
        </IconButton>
        <IconButton
          label="Send to back"
          onClick={() => getEditor()?.arrange("back")}
          disabled={!selection}
        >
          <ArrowDownToLine />
        </IconButton>
      </ToolbarCell>
      <span className="toolbar-spacer" />
      <ToolbarCell label="Export" className="export-actions">
        <button
          type="button"
          className="button primary export-button"
          onClick={onExportSvg}
          data-testid="export-svg"
        >
          <Download /> SVG
        </button>
        <button
          type="button"
          className="button export-button"
          onClick={onExportPdf}
          data-testid="export-pdf"
        >
          PDF
        </button>
        <span className="export-png">
          <button
            type="button"
            className="button export-button"
            onClick={onExportPng}
            data-testid="export-png"
          >
            <ImageDown /> PNG {exportScale}×
          </button>
          <label className="export-scale">
            <span className="visually-hidden">PNG export scale</span>
            <select
              aria-label="PNG export scale"
              value={exportScale}
              onChange={(event) =>
                onExportScaleChange(Number(event.currentTarget.value))
              }
            >
              {[1, 2, 3, 4].map((scale) => (
                <option value={scale} key={scale}>
                  {scale}×
                </option>
              ))}
            </select>
          </label>
        </span>
      </ToolbarCell>
    </header>
  );
}
