import {
  Accessibility,
  ArrowLeft,
  ExternalLink,
  FileClock,
  FileText,
  Grid3X3,
  ImageDown,
  Info,
  Laptop,
  Moon,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import type {
  AppPreferences,
  DensityPreference,
  ThemePreference,
} from "../domain/preferences/preferences";
import { DOCUMENT_PRESETS } from "../domain/project/factory";
import { Brand } from "./Brand";

type SettingsSection =
  | "general"
  | "appearance"
  | "editor"
  | "documents"
  | "export"
  | "files"
  | "accessibility"
  | "privacy"
  | "about";

interface SettingsScreenProps {
  initialSection?: SettingsSection;
  preferences: AppPreferences;
  recentCount: number;
  onBack: () => void;
  onPreferencesChange: (updates: Partial<AppPreferences>) => void;
  onClearRecent: () => void;
}

const sections: Array<{
  id: SettingsSection;
  label: string;
  icon: typeof SlidersHorizontal;
}> = [
  { id: "general", label: "General", icon: SlidersHorizontal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "editor", label: "Editor", icon: Grid3X3 },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "export", label: "Export", icon: ImageDown },
  { id: "files", label: "Files", icon: FileClock },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "about", label: "About", icon: Info },
];

const sectionCopy: Record<SettingsSection, { title: string; detail: string }> =
  {
    general: {
      title: "General",
      detail:
        "Choose how OpenBRender starts and how much recent work appears.",
    },
    appearance: {
      title: "Appearance",
      detail: "Adjust the interface without changing exported figures.",
    },
    editor: {
      title: "Editor",
      detail: "Set practical defaults for new figure workspaces.",
    },
    documents: {
      title: "Documents",
      detail: "Choose the starting size for a new blank figure.",
    },
    export: {
      title: "Export",
      detail: "Set the default scale used for PNG output.",
    },
    files: {
      title: "Files",
      detail: "Review local autosave and recent-project behavior.",
    },
    accessibility: {
      title: "Accessibility",
      detail:
        "Reduce non-essential movement while keeping state changes clear.",
    },
    privacy: {
      title: "Privacy",
      detail: "Understand where your work lives and when the network is used.",
    },
    about: {
      title: "About",
      detail: "Version, project links, licences, and support resources.",
    },
  };

const themeOptions: Array<{
  id: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Laptop },
];

export function SettingsScreen({
  initialSection = "general",
  preferences,
  recentCount,
  onBack,
  onPreferencesChange,
  onClearRecent,
}: SettingsScreenProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>(initialSection);
  const copy = sectionCopy[activeSection];

  return (
    <main className="settings-screen">
      <header className="start-header">
        <Brand />
        <button className="button quiet" type="button" onClick={onBack}>
          <ArrowLeft /> Back to OpenBRender
        </button>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-heading">
            <h1>Settings</h1>
          </div>
          <nav aria-label="Settings sections">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                className={activeSection === id ? "is-active" : undefined}
                aria-current={activeSection === id ? "page" : undefined}
                onClick={() => setActiveSection(id)}
                key={id}
              >
                <Icon aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>
          <p className="settings-local-note">
            <ShieldCheck aria-hidden="true" />
            Preferences stay on this device.
          </p>
        </aside>

        <div className="settings-content">
          <header className="settings-page-heading">
            <h2>{copy.title}</h2>
            <p>{copy.detail}</p>
          </header>

          {activeSection === "general" && (
            <section aria-labelledby="general-behavior-title">
              <h3 id="general-behavior-title">Startup and recents</h3>
              <label className="settings-row">
                <span>
                  <strong>When OpenBRender starts</strong>
                  <small>
                    Home is safest; reopen returns to local autosave.
                  </small>
                </span>
                <select
                  value={preferences.startup}
                  onChange={(event) =>
                    onPreferencesChange({
                      startup: event.currentTarget
                        .value as AppPreferences["startup"],
                    })
                  }
                >
                  <option value="home">Show Home</option>
                  <option value="reopen">Reopen previous figure</option>
                </select>
              </label>
              <label className="settings-row">
                <span>
                  <strong>Recent projects shown</strong>
                  <small>Between 3 and 8 local projects.</small>
                </span>
                <input
                  type="number"
                  min="3"
                  max="8"
                  value={preferences.recentProjectCount}
                  onChange={(event) => {
                    const next = event.currentTarget.valueAsNumber;
                    if (Number.isInteger(next) && next >= 3 && next <= 8)
                      onPreferencesChange({ recentProjectCount: next });
                  }}
                />
              </label>
            </section>
          )}

          {activeSection === "appearance" && (
            <section aria-labelledby="appearance-title">
              <h3 id="appearance-title">Interface</h3>
              <div className="settings-choice">
                <div>
                  <strong>Theme</strong>
                  <small>
                    System follows your operating-system preference.
                  </small>
                </div>
                <div className="theme-picker" role="group" aria-label="Theme">
                  {themeOptions.map(({ id, label, icon: Icon }) => (
                    <button
                      type="button"
                      aria-pressed={preferences.theme === id}
                      onClick={() => onPreferencesChange({ theme: id })}
                      key={id}
                    >
                      <Icon aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <span>
                  <strong>Interface density</strong>
                  <small>
                    Compact reduces spacing while preserving targets.
                  </small>
                </span>
                <div
                  className="segmented-control"
                  role="group"
                  aria-label="Interface density"
                >
                  {(["comfortable", "compact"] as DensityPreference[]).map(
                    (density) => (
                      <button
                        type="button"
                        aria-pressed={preferences.density === density}
                        onClick={() => onPreferencesChange({ density })}
                        key={density}
                      >
                        {density === "comfortable" ? "Comfortable" : "Compact"}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === "editor" && (
            <section aria-labelledby="editor-grid-title">
              <h3 id="editor-grid-title">Grid and snapping</h3>
              <label className="settings-row">
                <span>
                  <strong>Grid size</strong>
                  <small>Spacing used by grid snapping in new figures.</small>
                </span>
                <span className="number-control">
                  <input
                    aria-label="Default grid size"
                    type="number"
                    min="2"
                    max="200"
                    value={preferences.gridSize}
                    onChange={(event) => {
                      const next = event.currentTarget.valueAsNumber;
                      if (Number.isInteger(next) && next >= 2 && next <= 200)
                        onPreferencesChange({ gridSize: next });
                    }}
                  />
                  <small>px</small>
                </span>
              </label>
              <div className="settings-row">
                <span>
                  <strong>Snap to grid</strong>
                  <small>Align moved objects to grid intersections.</small>
                </span>
                <ToggleSwitch
                  checked={preferences.snapToGrid}
                  label="Snap to grid by default"
                  onChange={(snapToGrid) => onPreferencesChange({ snapToGrid })}
                />
              </div>
            </section>
          )}

          {activeSection === "documents" && (
            <section aria-labelledby="documents-title">
              <h3 id="documents-title">New blank figures</h3>
              <label className="settings-row">
                <span>
                  <strong>Default size</strong>
                  <small>Preselected when you open New figure.</small>
                </span>
                <select
                  value={preferences.defaultPreset}
                  onChange={(event) =>
                    onPreferencesChange({
                      defaultPreset: event.currentTarget
                        .value as AppPreferences["defaultPreset"],
                    })
                  }
                >
                  {Object.entries(DOCUMENT_PRESETS).map(
                    ([id, { label, width, height }]) => (
                      <option value={id} key={id}>
                        {label} · {width}×{height} px
                      </option>
                    ),
                  )}
                </select>
              </label>
              <p className="settings-footnote">
                Custom dimensions remain available for every new figure. The
                current project format uses pixels and does not infer print
                units or DPI.
              </p>
            </section>
          )}

          {activeSection === "export" && (
            <section aria-labelledby="export-title">
              <h3 id="export-title">PNG output</h3>
              <label className="settings-row">
                <span>
                  <strong>Default PNG scale</strong>
                  <small>Higher scales create larger raster images.</small>
                </span>
                <select
                  value={preferences.pngExportScale}
                  onChange={(event) =>
                    onPreferencesChange({
                      pngExportScale: Number(
                        event.currentTarget.value,
                      ) as AppPreferences["pngExportScale"],
                    })
                  }
                >
                  <option value={1}>1×</option>
                  <option value={2}>2× — recommended</option>
                  <option value={3}>3×</option>
                  <option value={4}>4×</option>
                </select>
              </label>
              <p className="settings-footnote">
                SVG export remains vector-first and is not affected by this
                setting.
              </p>
            </section>
          )}

          {activeSection === "files" && (
            <section aria-labelledby="files-title">
              <h3 id="files-title">Local project history</h3>
              <div className="settings-info-banner">
                <FileClock aria-hidden="true" />
                <p>
                  Autosave protects the active figure in this browser profile.
                  Export an OpenBRender project for a portable backup.
                </p>
              </div>
              <div className="settings-row">
                <span>
                  <strong>Recent projects</strong>
                  <small>
                    {recentCount} project{recentCount === 1 ? "" : "s"} stored
                    on this device.
                  </small>
                </span>
                <button
                  className="button danger-outline"
                  type="button"
                  disabled={recentCount === 0}
                  onClick={onClearRecent}
                >
                  <Trash2 /> Clear recent list
                </button>
              </div>
            </section>
          )}

          {activeSection === "accessibility" && (
            <section aria-labelledby="accessibility-title">
              <h3 id="accessibility-title">Motion</h3>
              <div className="settings-row">
                <span>
                  <strong>Reduce motion</strong>
                  <small>
                    Removes non-essential transitions. Your operating-system
                    preference is respected even when this is off.
                  </small>
                </span>
                <ToggleSwitch
                  checked={preferences.reduceMotion}
                  label="Reduce interface motion"
                  onChange={(reduceMotion) =>
                    onPreferencesChange({ reduceMotion })
                  }
                />
              </div>
            </section>
          )}

          {activeSection === "privacy" && (
            <section aria-labelledby="privacy-title">
              <h3 id="privacy-title">Local-first by design</h3>
              <div className="privacy-points">
                <article>
                  <ShieldCheck aria-hidden="true" />
                  <div>
                    <strong>No account required</strong>
                    <p>Open, edit, save, and export without signing in.</p>
                  </div>
                </article>
                <article>
                  <Laptop aria-hidden="true" />
                  <div>
                    <strong>Projects stay on-device</strong>
                    <p>
                      Nothing is uploaded unless you explicitly share an
                      exported file.
                    </p>
                  </div>
                </article>
                <article>
                  <WifiOff aria-hidden="true" />
                  <div>
                    <strong>No telemetry</strong>
                    <p>
                      OpenBRender does not send usage or analytics events.
                    </p>
                  </div>
                </article>
              </div>
              <p className="settings-footnote">
                Opening external documentation, source, or release links uses
                your browser and network. The artwork catalogue is awaiting
                review. Save a project file for a portable backup.
              </p>
            </section>
          )}

          {activeSection === "about" && (
            <section aria-labelledby="about-title">
              <div className="about-product">
                <Brand />
                <div>
                  <h3 id="about-title">OpenBRender 0.1.0</h3>
                  <p>
                    Adapted from OpenBioFigure v0.3.0. Includes an open-license asset
                    pack, editable scientific tools and local export.
                  </p>
                </div>
              </div>
              <div className="about-links">
                <a
                  href="/help.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  Documentation <ExternalLink />
                </a>
                <a
                  href="https://github.com/Voldigoade/openbiofigure"
                  target="_blank"
                  rel="noreferrer"
                >
                  Upstream source code <ExternalLink />
                </a>
                <a
                  href="https://github.com/Voldigoade/openbiofigure/releases"
                  target="_blank"
                  rel="noreferrer"
                >
                  Upstream releases <ExternalLink />
                </a>
                <a
                  href="https://github.com/GPTchatly/OpenBRender/issues/new"
                  target="_blank"
                  rel="noreferrer"
                >
                  Report an issue <ExternalLink />
                </a>
                <a
                  href="https://github.com/GPTchatly/OpenBRender/security/policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Security policy <ExternalLink />
                </a>
                <a
                  href="./licenses/third-party.txt"
                  target="_blank"
                  rel="noreferrer"
                >
                  Third-party font licences <ExternalLink />
                </a>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
