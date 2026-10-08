import {
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { EditorStatus } from "./app/EditorStatus";
import { EditorToolbar } from "./app/EditorToolbar";
import { InspectorSidebar } from "./app/InspectorSidebar";
import { ApplicationMenuBar } from "./app/ApplicationMenuBar";
import { SettingsScreen } from "./app/SettingsScreen";
import { StartScreen } from "./app/StartScreen";
import { WorkspaceCanvas } from "./app/WorkspaceCanvas";
import type { InspectorTab, PendingSvg, SaveState } from "./app/types";
import { seedProvider } from "./assets/provider";
import { NewDocumentDialog } from "./components/dialogs/NewDocumentDialog";
import { ChartDialog } from "./components/dialogs/ChartDialog";
import {
  CommandPalette,
  type CommandAction,
} from "./components/dialogs/CommandPalette";
import { KeyboardShortcutsDialog } from "./components/dialogs/KeyboardShortcutsDialog";
import { SvgMetadataDialog } from "./components/dialogs/SvgMetadataDialog";
import { sanitizeSvg } from "./domain/assets/sanitize";
import { preparePdfPrint, openPdfPrintDialog } from "./domain/export/printPdf";
import type { AssetMetadata } from "./domain/assets/schema";
import { createChartObject } from "./domain/charts/chart";
import {
  assetLibraryChangeEvent,
  loadAssetLibraryState,
  recordRecentAsset,
  saveAssetLibraryState,
} from "./domain/assets/libraryState";
import {
  buildProjectJson,
  buildSvgExport,
  makeDownload,
  safeFileStem,
} from "./domain/export/exporters";
import {
  checkPublication,
  generateAttributions,
} from "./domain/licensing/attribution";
import { createProject } from "./domain/project/factory";
import { ProjectHistory } from "./domain/project/history";
import { migrateProject } from "./domain/project/migrations";
import { assertFileSize, InputError, INPUT_LIMITS, parseBoundedJson } from "./domain/security/input";
import { parseProject, type OpenBioFigureProject } from "./domain/project/schema";
import {
  applyAppearancePreferences,
  loadPreferences,
  savePreferences,
  type AppPreferences,
} from "./domain/preferences/preferences";
import { createTemplateProject } from "./domain/templates/templates";
import {
  IndexedDbProjectStorage,
  type RecentProject,
} from "./domain/storage/projectStorage";
import {
  FabricEditor,
  type LayerSnapshot,
  type SelectionSnapshot,
  type ArtworkTarget,
} from "./editor/FabricEditor";
import { ArtworkEditor } from "./features/artwork/ArtworkEditor";
import { DEFAULT_ASSET_FILTERS } from "./features/assets/filters";
import { messages, type Locale } from "./i18n/messages";
import {
  dataUrlToBytes,
  isDesktopRuntime,
  openDesktopTextFile,
  saveDesktopBinaryFile,
  saveDesktopTextFile,
} from "./platform/desktopFiles";

const storage = new IndexedDbProjectStorage();
const ACTIVE_SESSION_KEY = "openbiofigure:active-editor";
const AssetsPanel = lazy(async () => ({
  default: (await import("./features/assets/AssetsPanel")).AssetsPanel,
}));

type AppView = "home" | "editor" | "settings";

function rememberAssetUse(assetId: string) {
  try {
    const state = loadAssetLibraryState(window.localStorage);
    saveAssetLibraryState(
      window.localStorage,
      recordRecentAsset(state, assetId),
    );
    window.dispatchEvent(new Event(assetLibraryChangeEvent));
  } catch {
    // Asset placement must not depend on local-storage availability.
  }
}

export function App() {
  const [project, setProject] = useState(() => createProject("journal"));
  const [view, setView] = useState<AppView>("home");
  const [settingsReturnView, setSettingsReturnView] = useState<
    "home" | "editor"
  >("home");
  const [autosaveProject, setAutosaveProject] =
    useState<OpenBioFigureProject | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [preferences, setPreferences] = useState(() =>
    loadPreferences(window.localStorage),
  );
  const [selection, setSelection] = useState<SelectionSnapshot | null>(null);
  const [layers, setLayers] = useState<LayerSnapshot[]>([]);
  const [filters, setFilters] = useState(DEFAULT_ASSET_FILTERS);
  const [tab, setTab] = useState<InspectorTab>("properties");
  const [zoom, setZoom] = useState(0.72);
  const [panning, setPanning] = useState(false);
  const [newDialog, setNewDialog] = useState(false);
  const [pendingSvg, setPendingSvg] = useState<PendingSvg | null>(null);
  const [shortcutsDialog, setShortcutsDialog] = useState(false);
  const [chartDialog, setChartDialog] = useState(false);
  const [artworkTarget, setArtworkTarget] = useState<ArtworkTarget | null>(null);
  const [commandPalette, setCommandPalette] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [editorReady, setEditorReady] = useState(false);
  const [exportScale, setExportScale] = useState(preferences.pngExportScale);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<FabricEditor | null>(null);
  const historyRef = useRef(new ProjectHistory(project));
  const initialProjectRef = useRef(project);
  const initialPreferencesRef = useRef(preferences);
  const applyingHistory = useRef(false);
  const autosaveTimer = useRef<number | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const pendingSave = useRef<OpenBioFigureProject | null>(null);
  const openProjectRef = useRef<HTMLInputElement>(null);
  const panStart = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  const refreshRecent = useCallback(async () => {
    setRecentProjects(await storage.listRecent());
  }, []);

  const showNotice = useCallback((text: string) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000);
  }, []);

  const handleSnapshot = useCallback(
    (snapshot: {
      project: OpenBioFigureProject;
      selection: SelectionSnapshot | null;
      layers: LayerSnapshot[];
    }) => {
      setProject(snapshot.project);
      setSelection(snapshot.selection);
      setLayers(snapshot.layers);
      if (applyingHistory.current) return;
      if (JSON.stringify(snapshot.project) === JSON.stringify(historyRef.current.current)) return;
      historyRef.current.push(snapshot.project);
      pendingSave.current = snapshot.project;
      setSaveState("saving");
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => {
        autosaveTimer.current = null;
        void storage
          .save(snapshot.project)
          .then(async () => {
            await refreshRecent();
            if (pendingSave.current === snapshot.project) {
              pendingSave.current = null;
              setAutosaveProject(snapshot.project);
              setSaveState("saved");
            }
          })
          .catch(() => {
            if (pendingSave.current === snapshot.project) setSaveState("error");
          });
      }, 450);
    },
    [refreshRecent],
  );

  useEffect(() => {
    let active = true;
    void storage
      .load()
      .then(async (saved) => {
        if (!active) return;
        const restored = saved ?? initialProjectRef.current;
        initialProjectRef.current = restored;
        setProject(restored);
        setAutosaveProject(saved);
        if (storage.recoveredPreviousRevision) showNotice("Recovered the previous valid saved revision. Export a backup before continuing.");
        setRecentProjects(await storage.listRecent());
        historyRef.current = new ProjectHistory(restored);
        if (
          saved &&
          (window.sessionStorage.getItem(ACTIVE_SESSION_KEY) ||
            initialPreferencesRef.current.startup === "reopen")
        ) {
          setView("editor");
        }
        setReady(true);
      })
      .catch(() => {
        if (active) {
          setSaveState("error");
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [showNotice]);

  useEffect(() => {
    if (!ready || view !== "editor" || !canvasRef.current || editorRef.current)
      return;
    const editor = new FabricEditor(
      canvasRef.current,
      initialProjectRef.current,
      handleSnapshot,
    );
    editorRef.current = editor;
    let active = true;
    void editor.ready.then(() => {
      if (active) setEditorReady(true);
    }).catch(() => {
      if (active) {
        setEditorReady(true);
        showNotice("The figure could not be rendered. The saved project has been preserved.");
      }
    });
    return () => {
      active = false;
      setEditorReady(false);
      editor.dispose();
      editorRef.current = null;
    };
  }, [ready, view, handleSnapshot, showNotice]);

  useEffect(() => {
    savePreferences(window.localStorage, preferences);
    applyAppearancePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    setExportScale(preferences.pngExportScale);
  }, [preferences.pngExportScale]);

  useEffect(() => {
    const protectUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (saveState !== "saving" && saveState !== "error") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", protectUnsavedChanges);
  }, [saveState]);

  const persistPending = useCallback(async () => {
    const next = pendingSave.current;
    if (!next) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = null;
    try {
      await storage.save(next);
      if (pendingSave.current === next) {
        pendingSave.current = null;
        setAutosaveProject(next);
        setSaveState("saved");
      }
      await refreshRecent();
    } catch {
      setSaveState("error");
      throw new InputError("save_failed", "Your current edits could not be saved locally. Download a project backup before switching figures.");
    }
  }, [refreshRecent]);

  const activateProject = useCallback(
    async (next: OpenBioFigureProject) => {
      next = parseProject(next);
      await persistPending();
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      initialProjectRef.current = next;
      setProject(next);
      setSelection(null);
      setLayers([]);
      historyRef.current = new ProjectHistory(next);
      window.sessionStorage.setItem(ACTIVE_SESSION_KEY, "true");
      setView("editor");
      setSaveState("saving");
      try {
        await storage.save(next);
        setAutosaveProject(next);
        await refreshRecent();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [refreshRecent, persistPending],
  );

  const replaceProject = useCallback(
    async (next: OpenBioFigureProject, resetHistory = true) => {
      if (!editorRef.current) return;
      await persistPending();
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
      applyingHistory.current = true;
      setEditorReady(false);
      try {
        await editorRef.current.load(next);
        next = editorRef.current.getProject();
        setProject(next);
        setSelection(null);
        setLayers(editorRef.current.getLayers());
        if (resetHistory) historyRef.current = new ProjectHistory(next);
        else historyRef.current.replace(next);
      } finally {
        applyingHistory.current = false;
        setEditorReady(true);
      }
      await storage.save(next);
      setAutosaveProject(next);
      await refreshRecent();
      setSaveState("saved");
    },
    [refreshRecent, persistPending],
  );

  const openOrReplaceProject = useCallback(
    async (next: OpenBioFigureProject) => {
      if (editorRef.current) await replaceProject(next);
      else await activateProject(next);
    },
    [activateProject, replaceProject],
  );

  const undo = useCallback(async () => {
    const previous = historyRef.current.undo();
    if (previous) {
      await replaceProject(previous, false);
      showNotice("Undo");
    }
  }, [replaceProject, showNotice]);
  const redo = useCallback(async () => {
    const next = historyRef.current.redo();
    if (next) {
      await replaceProject(next, false);
      showNotice("Redo");
    }
  }, [replaceProject, showNotice]);

  const fitToScreen = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const next = Math.min(
      (workspace.clientWidth - 80) / project.document.width,
      (workspace.clientHeight - 80) / project.document.height,
      1.5,
    );
    setZoom(Math.max(0.1, next));
    window.requestAnimationFrame(() => {
      workspace.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    });
  }, [project.document.height, project.document.width]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (artworkTarget) return;
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select") || target.isContentEditable)
        return;
      const editor = editorRef.current;
      if (!editor) return;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void (event.shiftKey ? redo() : undo());
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        void redo();
      } else if (mod && event.key.toLowerCase() === "c") {
        event.preventDefault();
        editor.copy();
        showNotice("Copied");
      } else if (mod && event.key.toLowerCase() === "v") {
        event.preventDefault();
        void editor.paste();
      } else if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        void editor.duplicate();
      } else if (mod && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) editor.ungroup();
        else editor.group();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        editor.deleteSelection();
      } else if (
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        const distance = event.shiftKey ? 10 : 1;
        editor.nudgeSelection(
          event.key === "ArrowLeft"
            ? -distance
            : event.key === "ArrowRight"
              ? distance
              : 0,
          event.key === "ArrowUp"
            ? -distance
            : event.key === "ArrowDown"
              ? distance
              : 0,
        );
      } else if (event.key === "0") {
        fitToScreen();
      } else if (event.code === "Space") setPanning(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") setPanning(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [redo, undo, showNotice, fitToScreen, artworkTarget]);

  useEffect(() => {
    if (!ready || view !== "editor" || !editorRef.current) return;
    const frame = window.requestAnimationFrame(fitToScreen);
    return () => window.cancelAnimationFrame(frame);
  }, [ready, view, fitToScreen]);

  const addAsset = useCallback(
    async (asset: AssetMetadata, point?: { x: number; y: number }) => {
      const editor = editorRef.current;
      if (!editor) return;
      const documentId = editor.getProject().metadata.id;
      try {
        const svg = sanitizeSvg(await seedProvider.loadSvg(asset)).svg;
        if (editorRef.current !== editor || editor.getProject().metadata.id !== documentId) return;
        const { file, integrity, ...metadata } = asset;
        void file;
        void integrity;
        const inserted = await editor.addAsset(
          { ...metadata, svg, verified: true },
          point,
        );
        if (!inserted) return;
        rememberAssetUse(asset.id);
        setTab("properties");
      } catch (error) {
        showNotice(error instanceof InputError ? error.message : "This drawing could not be loaded. Please retry or refresh the app.");
      }
    },
    [showNotice],
  );

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("application/x-openbiofigure-asset");
    const asset = await seedProvider.find(id);
    if (!asset) return;
    const canvas = document
      .querySelector(".canvas-container")
      ?.getBoundingClientRect();
    if (!canvas) return;
    await addAsset(asset, {
      x: (event.clientX - canvas.left) / zoom,
      y: (event.clientY - canvas.top) / zoom,
    });
  };

  const handleSvgFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      assertFileSize(file.size, INPUT_LIMITS.svgBytes);
      const result = sanitizeSvg(await file.text());
      setPendingSvg({
        fileName: file.name,
        svg: result.svg,
        changed: result.changed,
      });
    } catch (error) {
      showNotice(error instanceof InputError ? error.message : "SVG import failed");
    }
  };

  const runExport = async (operation: () => Promise<void>) => {
    try {
      await operation();
    } catch (error) {
      showNotice(error instanceof InputError ? error.message : "Export failed. Your figure is still open; try a smaller export or save the project.");
    }
  };

  const exportProject = () => runExport(async () => {
    const filename = `${safeFileStem(project.metadata.title)}.obf.json`;
    const contents = buildProjectJson(project);
    if (
      !(await saveDesktopTextFile(contents, filename, [
        { name: "OpenBRender project", extensions: ["obf.json", "json"] },
      ]))
    ) {
      makeDownload(contents, "application/json", filename);
    }
  });
  const exportSvg = () => runExport(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const filename = `${safeFileStem(project.metadata.title)}.svg`;
    const contents = buildSvgExport(editor.getSvg(), project);
    if (
      !(await saveDesktopTextFile(contents, filename, [
        { name: "Scalable Vector Graphics", extensions: ["svg"] },
      ]))
    ) {
      makeDownload(contents, "image/svg+xml", filename);
    }
    showNotice("SVG exported");
  });
  const exportPng = () => runExport(async () => {
    const dataUrl = editorRef.current?.getPng(exportScale);
    if (!dataUrl) return;
    const filename = `${safeFileStem(project.metadata.title)}@${exportScale}x.png`;
    if (
      !(await saveDesktopBinaryFile(await dataUrlToBytes(dataUrl), filename, [
        { name: "Portable Network Graphics", extensions: ["png"] },
      ]))
    ) {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = filename;
      anchor.click();
    }
    showNotice(`PNG exported at ${exportScale}×`);
  });
  const exportPdf = () => runExport(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    await preparePdfPrint(editor.getSvg(), project);
    showNotice("Choose Save as PDF in the print dialog. The figure remains vector artwork.");
    openPdfPrintDialog();
  });
  const exportAttributions = (format: "markdown" | "text") => runExport(async () => {
    const output = generateAttributions(project);
    const markdown = format === "markdown";
    const contents = markdown ? output.markdown : output.text;
    const filename = markdown ? "ATTRIBUTIONS.md" : "Attribution.txt";
    if (
      !(await saveDesktopTextFile(contents, filename, [
        {
          name: markdown ? "Markdown" : "Plain text",
          extensions: [markdown ? "md" : "txt"],
        },
      ]))
    ) {
      makeDownload(
        contents,
        markdown ? "text/markdown" : "text/plain",
        filename,
      );
    }
  });

  const openDesktopProject = async () => {
    const file = await openDesktopTextFile([
      { name: "OpenBRender project", extensions: ["obf.json", "json"] },
    ]);
    if (!file) return;
    try {
      await openOrReplaceProject(
        migrateProject(parseBoundedJson(file.contents)),
      );
      showNotice("Project opened");
    } catch (error) {
      showNotice(
        error instanceof InputError ? error.message : "Project could not be opened",
      );
    }
  };

  const importDesktopSvg = async () => {
    const file = await openDesktopTextFile([
      { name: "Scalable Vector Graphics", extensions: ["svg"] },
    ]);
    if (!file) return;
    try {
      const result = sanitizeSvg(file.contents);
      setPendingSvg({
        fileName: file.fileName,
        svg: result.svg,
        changed: result.changed,
      });
    } catch (error) {
      showNotice(error instanceof InputError ? error.message : "SVG import failed");
    }
  };

  const openProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    try {
      assertFileSize(file.size, INPUT_LIMITS.projectBytes);
      const next = migrateProject(parseBoundedJson(await file.text()));
      await openOrReplaceProject(next);
      showNotice("Project opened");
    } catch (error) {
      showNotice(
        error instanceof InputError ? error.message : "Project could not be opened",
      );
    }
  };

  const onPanStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panning || !workspaceRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panStart.current = {
      x: event.clientX,
      y: event.clientY,
      left: workspaceRef.current.scrollLeft,
      top: workspaceRef.current.scrollTop,
    };
  };
  const onPanMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panStart.current || !workspaceRef.current) return;
    workspaceRef.current.scrollLeft =
      panStart.current.left - (event.clientX - panStart.current.x);
    workspaceRef.current.scrollTop =
      panStart.current.top - (event.clientY - panStart.current.y);
  };

  const publication = checkPublication(project);
  const locale: Locale = project.settings.locale;
  const localized = messages[locale];

  const applyPreferences = (next: OpenBioFigureProject) => {
    next.settings.grid.size = preferences.gridSize;
    next.settings.grid.snap = preferences.snapToGrid;
    return next;
  };

  const requestOpenProject = () => {
    if (isDesktopRuntime()) void openDesktopProject();
    else openProjectRef.current?.click();
  };

  useEffect(() => {
    const onApplicationShortcut = (event: KeyboardEvent) => {
      if (artworkTarget) return;
      const target = event.target as HTMLElement;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPalette((open) => !open);
        return;
      }
      if (target.matches("input, textarea, select") || target.isContentEditable)
        return;
      if (mod && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNewDialog(true);
      } else if (mod && event.key.toLowerCase() === "o") {
        event.preventDefault();
        requestOpenProject();
      } else if (mod && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void exportProject();
      } else if (event.key === "?") {
        event.preventDefault();
        setShortcutsDialog(true);
      }
    };
    window.addEventListener("keydown", onApplicationShortcut);
    return () => window.removeEventListener("keydown", onApplicationShortcut);
  });

  const goHome = () => {
    void persistPending().then(() => {
      window.sessionStorage.removeItem(ACTIVE_SESSION_KEY);
      setView("home");
    }).catch(error => showNotice(error instanceof InputError ? error.message : "The current figure could not be saved."));
  };

  const openSettings = (returnTo: "home" | "editor") => {
    void persistPending().then(() => {
      setSettingsReturnView(returnTo);
      setView("settings");
    }).catch(error => showNotice(error instanceof InputError ? error.message : "The current figure could not be saved."));
  };

  const exitApp = () => {
    goHome();
  };

  const commandActions: CommandAction[] = [
    {
      id: "command-new-figure",
      label: "New figure",
      description: "Choose a blank document or scientific template",
      group: "Document",
      keywords: ["document", "template"],
      shortcut: "Ctrl N",
      run: () => setNewDialog(true),
    },
    {
      id: "command-open-project",
      label: "Open project",
      description: "Open an OpenBRender project from this device",
      group: "Document",
      keywords: ["file", "load"],
      shortcut: "Ctrl O",
      run: requestOpenProject,
    },
    ...(view === "editor"
      ? [
          {
            id: "command-add-text",
            label: "Add text",
            description: "Place an editable text label on the figure",
            group: "Create" as const,
            keywords: ["label", "caption", "type"],
            run: () => editorRef.current?.addText(),
          },
          {
            id: "command-add-arrow",
            label: "Add arrow",
            description: "Place a directional arrow on the figure",
            group: "Create" as const,
            keywords: ["connector", "direction", "flow"],
            run: () => editorRef.current?.addArrow(),
          },
          {
            id: "command-add-panel",
            label: "Add figure panel",
            description: "Insert an editable labelled publication panel",
            group: "Create" as const,
            keywords: ["layout", "scientific", "letter"],
            run: () => editorRef.current?.addScientificElement("panel"),
          },
          {
            id: "command-create-chart",
            label: "Create chart",
            description: "Build an editable local bar or line chart",
            group: "Create" as const,
            keywords: ["graph", "data", "bar", "line"],
            run: () => setChartDialog(true),
          },
          {
            id: "command-search-assets",
            label: "Search scientific assets",
            description: "Move focus to the scientific asset panel",
            group: "View" as const,
            keywords: ["library", "cell", "icon", "bioicons"],
            run: () =>
              window.requestAnimationFrame(() =>
                document
                  .querySelector<HTMLInputElement>(
                    "[aria-label='Search scientific assets']",
                  )
                  ?.focus(),
              ),
          },
          {
            id: "command-open-layers",
            label: "Open layers",
            description: "Inspect and reorder figure objects",
            group: "View" as const,
            keywords: ["objects", "stack", "groups"],
            run: () => setTab("layers"),
          },
          {
            id: "command-publication-check",
            label: "Open license and credits",
            description: "See each drawing's license and any credit it requires",
            group: "View" as const,
            keywords: ["license", "provenance", "attribution", "credit"],
            run: () => setTab("licensing"),
          },
          {
            id: "command-fit",
            label: "Fit figure to screen",
            description: "Center the complete page in the workspace",
            group: "View" as const,
            keywords: ["zoom", "canvas", "page"],
            shortcut: "0",
            run: fitToScreen,
          },
          {
            id: "command-export-svg",
            label: "Export SVG",
            description: "Download an editable vector figure",
            group: "Export" as const,
            keywords: ["vector", "publication", "download"],
            run: () => void exportSvg(),
          },
          {
            id: "command-export-png",
            label: "Export PNG",
            description: `Download a ${exportScale}× raster figure`,
            group: "Export" as const,
            keywords: ["image", "raster", "download"],
            run: () => void exportPng(),
          },
        ]
      : []),
    {
      id: "command-settings",
      label: "Open Settings",
      description: "Adjust appearance, editor, files, and privacy",
      group: "Application",
      keywords: ["preferences", "theme", "grid", "offline"],
      run: () => openSettings(view === "editor" ? "editor" : "home"),
    },
  ];

  const sharedFileInput = (
    <input
      ref={openProjectRef}
      className="visually-hidden"
      type="file"
      accept=".json,.obf.json,application/json"
      onChange={(event) => void openProject(event)}
    />
  );

  const sharedOverlays = (
    <>
      {newDialog && (
        <NewDocumentDialog
          initialPreset={preferences.defaultPreset}
          onClose={() => setNewDialog(false)}
          onCreateTemplate={(templateId) => {
            void openOrReplaceProject(
              applyPreferences(createTemplateProject(templateId)),
            ).then(() => {
              setNewDialog(false);
              window.requestAnimationFrame(fitToScreen);
            }).catch(() => showNotice("The template could not be opened; your figure is still available."));
          }}
          onCreate={(preset, width, height) => {
            const next = applyPreferences(
              createProject(preset, { width, height }),
            );
            const operation = editorRef.current
              ? replaceProject(next)
              : activateProject(next);
            void operation.then(() => {
              setNewDialog(false);
              window.requestAnimationFrame(fitToScreen);
            }).catch(() => showNotice("The figure could not be opened."));
          }}
        />
      )}
      {shortcutsDialog && (
        <KeyboardShortcutsDialog onClose={() => setShortcutsDialog(false)} />
      )}
      {chartDialog && (
        <ChartDialog
          onClose={() => setChartDialog(false)}
          onCreate={async (spec) => {
            await editorRef.current?.addProjectObject(
              createChartObject(
                spec,
                project.document.width / 2,
                project.document.height / 2,
              ),
            );
            setChartDialog(false);
          }}
        />
      )}
      {commandPalette && (
        <CommandPalette
          actions={commandActions}
          onClose={() => setCommandPalette(false)}
        />
      )}
      {notice && !artworkTarget && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  );

  const openArtworkEditor = () => {
    try {
      const target = editorRef.current?.getArtworkTarget();
      if (target) setArtworkTarget(target);
    } catch (error) {
      showNotice(error instanceof InputError ? error.message : "This artwork could not be opened for editing.");
    }
  };

  if (!ready) {
    return (
      <main className="app-loading" aria-live="polite">
        <span className="loading-mark" aria-hidden="true" />
        <p>Opening OpenBRender…</p>
      </main>
    );
  }

  if (view === "home") {
    return (
      <>
        <StartScreen
          autosave={autosaveProject}
          recent={recentProjects.slice(0, preferences.recentProjectCount)}
          onNew={() => setNewDialog(true)}
          onOpen={requestOpenProject}
          onContinue={() =>
            autosaveProject && void activateProject(autosaveProject)
          }
          onOpenRecent={(next) => void activateProject(next)}
          onRemoveRecent={(projectId) => {
            void storage.removeRecent(projectId).then(refreshRecent);
          }}
          onCreateTemplate={(templateId) =>
            void activateProject(
              applyPreferences(createTemplateProject(templateId)),
            )
          }
          onSettings={() => openSettings("home")}
        />
        {sharedFileInput}
        {sharedOverlays}
      </>
    );
  }

  if (view === "settings") {
    return (
      <>
        <SettingsScreen
          initialSection={
            settingsReturnView === "editor" ? "editor" : "general"
          }
          preferences={preferences}
          recentCount={recentProjects.length}
          onBack={() => {
            if (settingsReturnView === "editor") void activateProject(project);
            else setView("home");
          }}
          onPreferencesChange={(updates: Partial<AppPreferences>) =>
            setPreferences((current) => ({ ...current, ...updates }))
          }
          onClearRecent={() => {
            void storage.clearRecent().then(refreshRecent);
          }}
        />
        {sharedFileInput}
        {sharedOverlays}
      </>
    );
  }

  return (
    <>
    <div className="app-shell" inert={!editorReady || Boolean(artworkTarget)} aria-busy={!editorReady}>
      <ApplicationMenuBar
        getEditor={() => editorRef.current}
        selection={selection}
        canUndo={historyRef.current.canUndo}
        canRedo={historyRef.current.canRedo}
        gridEnabled={project.settings.grid.enabled}
        title={project.metadata.title}
        onTitleChange={(title) => {
          editorRef.current?.setTitle(title);
        }}
        onHome={goHome}
        onNew={() => setNewDialog(true)}
        onOpen={requestOpenProject}
        onSave={() => void exportProject()}
        onExportSvg={() => void exportSvg()}
        onExportPng={() => void exportPng()}
        onExportPdf={() => void exportPdf()}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        onFit={fitToScreen}
        onZoomIn={() => setZoom((current) => Math.min(3, current + 0.1))}
        onZoomOut={() => setZoom((current) => Math.max(0.1, current - 0.1))}
        onToggleGrid={() => {
          const next = structuredClone(project);
          next.settings.grid.enabled = !next.settings.grid.enabled;
          void replaceProject(next, false);
        }}
        onOpenAssets={() =>
          document
            .querySelector<HTMLInputElement>(
              "[aria-label='Search scientific assets']",
            )
            ?.focus()
        }
        onOpenLayers={() => setTab("layers")}
        onOpenLicensing={() => setTab("licensing")}
        onQuickActions={() => setCommandPalette(true)}
        onShortcuts={() => setShortcutsDialog(true)}
        onSettings={() => openSettings("editor")}
        onExit={exitApp}
      />
      <EditorToolbar
        getEditor={() => editorRef.current}
        selection={selection}
        canUndo={historyRef.current.canUndo}
        canRedo={historyRef.current.canRedo}
        panning={panning}
        exportScale={exportScale}
        onNew={() => setNewDialog(true)}
        onRequestOpenProject={requestOpenProject}
        onSaveProject={() => void exportProject()}
        onUndo={() => void undo()}
        onRedo={() => void redo()}
        onPanningChange={setPanning}
        onExportScaleChange={(pngExportScale) => {
          if (![1, 2, 3, 4].includes(pngExportScale)) return;
          setPreferences((current) => ({
            ...current,
            pngExportScale: pngExportScale as AppPreferences["pngExportScale"],
          }));
        }}
        onExportSvg={() => void exportSvg()}
        onExportPng={() => void exportPng()}
        onExportPdf={() => void exportPdf()}
      />

      <div className="editor-grid" onDoubleClick={event => { if (event.target instanceof HTMLCanvasElement) openArtworkEditor(); }}>
        <Suspense
          fallback={
            <aside className="left-panel panel-loading" aria-busy="true">
              <h2>{localized.assets}</h2>
              <p>Opening scientific asset tools…</p>
            </aside>
          }
        >
          <AssetsPanel
            locale={locale}
            filters={filters}
            setFilters={setFilters}
            onAdd={addAsset}
            onInsertScientific={(kind) =>
              editorRef.current?.addScientificElement(kind)
            }
            onCreateChart={() => setChartDialog(true)}
            onFile={(event) => void handleSvgFile(event)}
            onRequestFile={
              isDesktopRuntime() ? () => void importDesktopSvg() : undefined
            }
          />
        </Suspense>
        <WorkspaceCanvas
          project={project}
          zoom={zoom}
          panning={panning}
          canvasRef={canvasRef}
          workspaceRef={workspaceRef}
          onDrop={(event) => void handleDrop(event)}
          onPanStart={onPanStart}
          onPanMove={onPanMove}
          onPanEnd={() => {
            panStart.current = null;
          }}
          onBackgroundChange={(color) =>
            editorRef.current?.setBackground(color)
          }
          onZoomChange={setZoom}
          onFitToScreen={fitToScreen}
        />
        <InspectorSidebar
          tab={tab}
          project={project}
          selection={selection}
          layers={layers}
          publication={publication}
          styleLabel={localized.style}
          layersLabel={localized.layers}
          getEditor={() => editorRef.current}
          onTabChange={setTab}
          onExportAttributions={(format) => void exportAttributions(format)}
          onEditArtwork={openArtworkEditor}
        />
      </div>

      <EditorStatus
        saveState={saveState}
        selection={selection}
        publication={publication}
        labels={localized}
        onOpenLicensing={() => setTab("licensing")}
        onHome={goHome}
      />
      {sharedFileInput}
      {pendingSvg && (
        <SvgMetadataDialog
          pending={pendingSvg}
          onClose={() => setPendingSvg(null)}
          onImport={(asset) => {
            void editorRef.current?.addAsset(asset).then((inserted) => {
              if (!inserted) return;
              setPendingSvg(null);
              setTab("properties");
            }).catch((error: unknown) => {
              showNotice(error instanceof InputError ? error.message : "SVG import failed. Your figure is still open.");
            });
          }}
        />
      )}
      {sharedOverlays}
    </div>
    {artworkTarget && <ArtworkEditor target={artworkTarget} onClose={() => setArtworkTarget(null)} onApply={async svg => {
      const editor = editorRef.current;
      if (!editor) throw new InputError("artwork_closed", "Reopen the figure before applying artwork changes.");
      await editor.applyArtworkEdit(artworkTarget, svg);
      showNotice("Artwork updated. You can undo this change in the figure.");
    }} />}
    </>
  );
}
