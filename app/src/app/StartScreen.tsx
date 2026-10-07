import {
  ArrowRight,
  Check,
  FilePlus2,
  FolderOpen,
  Github,
  Settings,
  Trash2,
} from "lucide-react";
import type { RecentProject } from "../domain/storage/projectStorage";
import type { FigureTemplateId } from "../domain/templates/templates";
import { FIGURE_TEMPLATES } from "../domain/templates/templates";
import { Brand } from "./Brand";

interface StartScreenProps {
  autosave: RecentProject["project"] | null;
  recent: RecentProject[];
  onNew: () => void;
  onOpen: () => void;
  onContinue: () => void;
  onOpenRecent: (project: RecentProject["project"]) => void;
  onRemoveRecent: (projectId: string) => void;
  onCreateTemplate: (templateId: FigureTemplateId) => void;
  onSettings: () => void;
}

const SHEET_COLUMNS = ["1", "2", "3", "4", "5", "6"];
const SHEET_ROWS = ["A", "B", "C", "D"];

function projectDimensions(project: RecentProject["project"]) {
  return `${project.document.width} × ${project.document.height} px · ${project.objects.length} object${project.objects.length === 1 ? "" : "s"}`;
}

export function StartScreen({
  autosave,
  recent,
  onNew,
  onOpen,
  onContinue,
  onOpenRecent,
  onRemoveRecent,
  onCreateTemplate,
  onSettings,
}: StartScreenProps) {
  return (
    <main className="start-screen">
      <header className="start-header">
        <Brand />
        <div className="start-header-actions">
          <a
            className="button quiet"
            href="https://github.com/GPTchatly/OpenBRender"
            target="_blank"
            rel="noreferrer"
          >
            <Github /> Source code
          </a>
          <button className="button quiet" type="button" onClick={onSettings}>
            <Settings /> Settings
          </button>
        </div>
      </header>

      <div className="start-content">
        <div className="sheet-frame">
          <ol className="sheet-zones is-columns" aria-hidden="true">
            {SHEET_COLUMNS.map((zone) => (
              <li key={zone}>{zone}</li>
            ))}
          </ol>
          <ol className="sheet-zones is-rows" aria-hidden="true">
            {SHEET_ROWS.map((zone) => (
              <li key={zone}>{zone}</li>
            ))}
          </ol>

          <div className="start-hero-layout">
            <section className="start-intro" aria-labelledby="start-title">
              <h1 id="start-title">Create an editable scientific figure</h1>
              <p>
                Build clear vector figures with reusable scientific assets.
                Keep provenance attached and export locally—without an
                account.
              </p>
              <div className="start-actions">
                <button
                  className="button primary large"
                  type="button"
                  onClick={onNew}
                >
                  <FilePlus2 /> New figure
                </button>
                <button
                  className="button large"
                  type="button"
                  onClick={onOpen}
                >
                  <FolderOpen /> Open project
                </button>
              </div>
              <ul className="start-trust-line">
                <li>
                  <Check aria-hidden="true" /> Local-first
                </li>
                <li>
                  <Check aria-hidden="true" /> Local file export
                </li>
                <li>
                  <Check aria-hidden="true" /> No telemetry
                </li>
              </ul>
            </section>

            <aside className="start-companion" aria-labelledby="companion-title">
              {autosave ? (
                <>
                  <h2 id="companion-title">Continue your work</h2>
                  <button
                    className="continue-card"
                    type="button"
                    onClick={onContinue}
                  >
                    <span className="recent-thumbnail" aria-hidden="true" />
                    <span>
                      <strong>{autosave.metadata.title}</strong>
                      <small>{projectDimensions(autosave)}</small>
                      <span>Saved locally</span>
                    </span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <h2 id="companion-title">Your first figure</h2>
                  <ol className="start-steps">
                    <li>
                      <strong>Choose a starting point</strong>
                      <small>Blank canvas or editable template</small>
                    </li>
                    <li>
                      <strong>Find scientific assets</strong>
                      <small>Use scientific shapes or import a local SVG</small>
                    </li>
                    <li>
                      <strong>Export with confidence</strong>
                      <small>SVG, PNG, and attribution report</small>
                    </li>
                  </ol>
                </>
              )}
            </aside>
          </div>

          <section className="start-section" aria-labelledby="templates-title">
            <div className="section-heading">
              <h2 id="templates-title">Figure templates</h2>
              <span>Fully editable</span>
            </div>
            <div className="start-template-grid">
              {FIGURE_TEMPLATES.map((template) => (
                <button
                  className="start-template"
                  type="button"
                  onClick={() => onCreateTemplate(template.id)}
                  key={template.id}
                >
                  <span className="start-template-sheet" aria-hidden="true">
                    <span
                      className={`start-template-preview template-${template.preview}`}
                      style={{
                        aspectRatio: `${template.width}/${template.height}`,
                      }}
                    >
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  </span>
                  <strong>{template.title}</strong>
                  <small>{template.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section
            className="start-section recent-section"
            aria-labelledby="recent-title"
          >
            <div className="section-heading">
              <h2 id="recent-title">Recent projects</h2>
              <span>Stored only on this device</span>
            </div>
            {recent.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">
                  <FolderOpen aria-hidden="true" />
                </span>
                <div>
                  <strong>No recent projects yet</strong>
                  <p>Create a figure or open a project to see it here.</p>
                </div>
                <button className="button quiet" type="button" onClick={onNew}>
                  Create your first figure <ArrowRight />
                </button>
              </div>
            ) : (
              <ul className="recent-list">
                {recent.map(({ project, lastOpenedAt }) => (
                  <li key={project.metadata.id}>
                    <button type="button" onClick={() => onOpenRecent(project)}>
                      <span className="recent-thumbnail" aria-hidden="true" />
                      <span>
                        <strong>{project.metadata.title}</strong>
                        <small>{projectDimensions(project)}</small>
                      </span>
                      <time dateTime={lastOpenedAt}>
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(lastOpenedAt))}
                      </time>
                    </button>
                    <button
                      className="recent-remove"
                      type="button"
                      aria-label={`Remove ${project.metadata.title} from recent projects`}
                      title="Remove from recent projects"
                      onClick={() => onRemoveRecent(project.metadata.id)}
                    >
                      <Trash2 />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <dl className="sheet-title-block" aria-label="About OpenBRender">
            <div className="is-title">
              <dt>Drawn with</dt>
              <dd>OpenBRender</dd>
            </div>
            <div>
              <dt>Rev</dt>
              <dd>0.1.0</dd>
            </div>
            <div>
              <dt>Exports</dt>
              <dd>SVG · PNG · PDF</dd>
            </div>
            <div>
              <dt>Files</dt>
              <dd>This device only</dd>
            </div>
            <div>
              <dt>Code</dt>
              <dd>Apache-2.0</dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  );
}
