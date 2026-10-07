import { createStore, get, type UseStore } from "idb-keyval";
import { z } from "zod";
import { migrateProject } from "../project/migrations";
import { parseProject, type OpenBioFigureProject } from "../project/schema";

const STATE_KEY = "openrender:documents:v2";
const MAX_RECENT_PROJECTS = 8;
const stateSchema = z.object({
  version: z.literal(2),
  current: z.unknown().nullable(),
  previous: z.unknown().nullable(),
  recent: z.array(z.object({
    project: z.unknown(), lastOpenedAt: z.iso.datetime(),
  }).strict()).max(MAX_RECENT_PROJECTS),
}).strict();

export interface RecentProject { project: OpenBioFigureProject; lastOpenedAt: string; }
interface StoredState { version: 2; current: OpenBioFigureProject | null; previous: OpenBioFigureProject | null; recent: RecentProject[]; }
export interface ProjectStorage {
  load(): Promise<OpenBioFigureProject | null>;
  save(project: OpenBioFigureProject): Promise<void>;
  clear(): Promise<void>;
  listRecent(): Promise<RecentProject[]>;
  removeRecent(projectId: string): Promise<void>;
  clearRecent(): Promise<void>;
}
const emptyState = (): StoredState => ({ version: 2, current: null, previous: null, recent: [] });

function validProject(value: unknown): OpenBioFigureProject | null {
  if (value == null) return null;
  try { return migrateProject(value); }
  catch { return null; } // A damaged revision is recoverable from the independent previous revision.
}
function readState(value: unknown): StoredState {
  if (value === undefined) return emptyState();
  const envelope = stateSchema.safeParse(value);
  if (!envelope.success) throw new Error("Local document storage is invalid. Export files are unaffected.");
  const current = validProject(envelope.data.current);
  const previous = validProject(envelope.data.previous);
  if (envelope.data.current != null && !current && !previous)
    throw new Error("No readable saved revision was found. Open a portable project backup.");
  return {
    version: 2, current: current ?? previous, previous,
    recent: envelope.data.recent.flatMap(item => {
      const project = validProject(item.project);
      return project ? [{project, lastOpenedAt: item.lastOpenedAt}] : [];
    }).sort((a,b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt)),
  };
}

export class IndexedDbProjectStorage implements ProjectStorage {
  readonly #store: UseStore;
  recoveredPreviousRevision = false;
  constructor(store: UseStore = createStore("openrender-documents", "documents")) { this.#store = store; }

  async load() {
    const raw: unknown = await get(STATE_KEY, this.#store);
    if (raw === undefined) {
      // Preserve the inherited database until a validated copy commits to the new store.
      const legacy: unknown = await get("openbiofigure:autosave:v1");
      if (legacy) { const project = migrateProject(legacy); await this.save(project); return project; }
      return null;
    }
    const envelope = stateSchema.safeParse(raw);
    this.recoveredPreviousRevision = Boolean(envelope.success && envelope.data.current != null && !validProject(envelope.data.current));
    return readState(raw).current;
  }

  private async mutate(operation: (state: StoredState) => StoredState): Promise<void> {
    await this.#store("readwrite", store => new Promise<void>((resolve, reject) => {
      const transaction = store.transaction;
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("The local save could not be committed."));
      transaction.onabort = () => reject(new Error("The local save was cancelled; the previous revision is retained."));
      const request = store.get(STATE_KEY);
      request.onsuccess = () => {
        try {
          // Read, revision swap and recent-list update happen in this one serialized transaction.
          store.put(operation(readState(request.result)), STATE_KEY);
        } catch (error) {
          reject(error);
          try { transaction.abort(); }
          catch (abortError) {
            // A quota failure may already have aborted the transaction.
            if (!(abortError instanceof DOMException && abortError.name === "InvalidStateError")) reject(abortError);
          }
        }
      };
    }));
  }

  async save(value: OpenBioFigureProject) {
    const project = parseProject(value); // Validation finishes before opening a write transaction.
    await this.mutate(state => ({
      version: 2, current: project, previous: state.current,
      recent: [{project, lastOpenedAt: new Date().toISOString()},
        ...state.recent.filter(item => item.project.metadata.id !== project.metadata.id)].slice(0, MAX_RECENT_PROJECTS),
    }));
  }
  async clear() { await this.mutate(state => ({...state, current: null, previous: null})); }
  async listRecent() { return readState(await get(STATE_KEY, this.#store)).recent; }
  async removeRecent(projectId: string) {
    await this.mutate(state => ({...state, recent: state.recent.filter(item => item.project.metadata.id !== projectId)}));
  }
  async clearRecent() { await this.mutate(state => ({...state, recent: []})); }
}

export class MemoryProjectStorage implements ProjectStorage {
  #state = emptyState();
  load() { return Promise.resolve(this.#state.current ? parseProject(this.#state.current) : null); }
  save(value: OpenBioFigureProject) {
    const project = parseProject(value);
    this.#state = {...this.#state, current: project, previous: this.#state.current,
      recent: [{project, lastOpenedAt: new Date().toISOString()},
        ...this.#state.recent.filter(item => item.project.metadata.id !== project.metadata.id)].slice(0, MAX_RECENT_PROJECTS)};
    return Promise.resolve();
  }
  clear() { this.#state.current = null; this.#state.previous = null; return Promise.resolve(); }
  listRecent() { return Promise.resolve(structuredClone(this.#state.recent)); }
  removeRecent(id: string) { this.#state.recent = this.#state.recent.filter(item => item.project.metadata.id !== id); return Promise.resolve(); }
  clearRecent() { this.#state.recent = []; return Promise.resolve(); }
}
