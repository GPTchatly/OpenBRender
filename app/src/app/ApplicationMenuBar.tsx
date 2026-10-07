import { Settings } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { FabricEditor, SelectionSnapshot } from "../editor/FabricEditor";
import { Brand } from "./Brand";

interface MenuActionProps {
  children: ReactNode;
  disabled?: boolean;
  shortcut?: string;
  onSelect: () => void;
}

function MenuAction({
  children,
  disabled,
  shortcut,
  onSelect,
}: MenuActionProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(event) => {
        onSelect();
        event.currentTarget.closest("details")?.removeAttribute("open");
      }}
    >
      <span>{children}</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
}

interface ApplicationMenuBarProps {
  getEditor: () => FabricEditor | null;
  selection: SelectionSnapshot | null;
  canUndo: boolean;
  canRedo: boolean;
  gridEnabled: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  onHome: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleGrid: () => void;
  onOpenAssets: () => void;
  onOpenLayers: () => void;
  onOpenLicensing: () => void;
  onQuickActions: () => void;
  onShortcuts: () => void;
  onSettings: () => void;
  onExit: () => void;
}

export function ApplicationMenuBar({
  getEditor,
  selection,
  canUndo,
  canRedo,
  gridEnabled,
  title,
  onTitleChange,
  onHome,
  onNew,
  onOpen,
  onSave,
  onExportSvg,
  onExportPng,
  onExportPdf,
  onUndo,
  onRedo,
  onFit,
  onZoomIn,
  onZoomOut,
  onToggleGrid,
  onOpenAssets,
  onOpenLayers,
  onOpenLicensing,
  onQuickActions,
  onShortcuts,
  onSettings,
  onExit,
}: ApplicationMenuBarProps) {
  const menuRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeMenus = () =>
      menuRef.current
        ?.querySelectorAll("details[open]")
        .forEach((menu) => menu.removeAttribute("open"));
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <nav
      ref={menuRef}
      className="application-menu-bar"
      aria-label="Application menu"
    >
      <button
        className="menu-brand"
        type="button"
        aria-label="OpenBRender Home"
        onClick={onHome}
      >
        <Brand compact />
      </button>
      <details className="app-menu" name="application-menu">
        <summary>File</summary>
        <div role="menu">
          <MenuAction shortcut="Ctrl+N" onSelect={onNew}>
            New figure
          </MenuAction>
          <MenuAction shortcut="Ctrl+O" onSelect={onOpen}>
            Open project…
          </MenuAction>
          <MenuAction shortcut="Ctrl+S" onSelect={onSave}>
            Save project
          </MenuAction>
          <span className="menu-divider" role="separator" />
          <MenuAction onSelect={onExportSvg}>Export SVG…</MenuAction>
          <MenuAction onSelect={onExportPng}>Export PNG…</MenuAction>
          <MenuAction onSelect={onExportPdf}>Export PDF…</MenuAction>
          <span className="menu-divider" role="separator" />
          <MenuAction onSelect={onHome}>Home</MenuAction>
          <MenuAction onSelect={onExit}>Exit</MenuAction>
        </div>
      </details>
      <details className="app-menu" name="application-menu">
        <summary>Edit</summary>
        <div role="menu">
          <MenuAction shortcut="Ctrl+Z" disabled={!canUndo} onSelect={onUndo}>
            Undo
          </MenuAction>
          <MenuAction shortcut="Ctrl+Y" disabled={!canRedo} onSelect={onRedo}>
            Redo
          </MenuAction>
          <span className="menu-divider" role="separator" />
          <MenuAction
            shortcut="Ctrl+X"
            disabled={!selection}
            onSelect={() => {
              getEditor()?.copy();
              getEditor()?.deleteSelection();
            }}
          >
            Cut
          </MenuAction>
          <MenuAction
            shortcut="Ctrl+C"
            disabled={!selection}
            onSelect={() => getEditor()?.copy()}
          >
            Copy
          </MenuAction>
          <MenuAction
            shortcut="Ctrl+V"
            onSelect={() => void getEditor()?.paste()}
          >
            Paste
          </MenuAction>
          <MenuAction
            shortcut="Ctrl+D"
            disabled={!selection}
            onSelect={() => void getEditor()?.duplicate()}
          >
            Duplicate
          </MenuAction>
          <MenuAction
            shortcut="Delete"
            disabled={!selection}
            onSelect={() => getEditor()?.deleteSelection()}
          >
            Delete
          </MenuAction>
        </div>
      </details>
      <details className="app-menu" name="application-menu">
        <summary>View</summary>
        <div role="menu">
          <MenuAction shortcut="0" onSelect={onFit}>
            Fit to screen
          </MenuAction>
          <MenuAction shortcut="Ctrl++" onSelect={onZoomIn}>
            Zoom in
          </MenuAction>
          <MenuAction shortcut="Ctrl+-" onSelect={onZoomOut}>
            Zoom out
          </MenuAction>
          <MenuAction onSelect={onToggleGrid}>
            {gridEnabled ? "Hide grid" : "Show grid"}
          </MenuAction>
          <span className="menu-divider" role="separator" />
          <MenuAction onSelect={onOpenAssets}>Assets panel</MenuAction>
          <MenuAction onSelect={onOpenLayers}>Layers panel</MenuAction>
          <MenuAction onSelect={onOpenLicensing}>Licensing panel</MenuAction>
        </div>
      </details>
      <details className="app-menu" name="application-menu">
        <summary>Help</summary>
        <div role="menu">
          <MenuAction shortcut="Ctrl+K" onSelect={onQuickActions}>
            Quick actions
          </MenuAction>
          <MenuAction shortcut="?" onSelect={onShortcuts}>
            Keyboard shortcuts
          </MenuAction>
          <a
            role="menuitem"
            href="/help.html"
            target="_blank"
            rel="noreferrer"
          >
            Documentation
          </a>
          <MenuAction onSelect={onSettings}>About OpenBRender</MenuAction>
        </div>
      </details>
      <label className="title-field">
        <span>Title</span>
        <input
          aria-label="Figure title"
          value={title}
          spellCheck={false}
          onChange={(event) => onTitleChange(event.currentTarget.value)}
        />
      </label>
      <button className="menu-settings" type="button" onClick={onSettings}>
        <Settings aria-hidden="true" />
        Settings
      </button>
    </nav>
  );
}
