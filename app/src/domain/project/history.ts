import type { OpenBioFigureProject } from "./schema";

const clone = (project: OpenBioFigureProject) => structuredClone(project);

export class ProjectHistory {
  readonly limit: number;
  #past: OpenBioFigureProject[] = [];
  #present: OpenBioFigureProject;
  #future: OpenBioFigureProject[] = [];

  constructor(initial: OpenBioFigureProject, limit = 80) {
    this.#present = clone(initial);
    this.limit = limit;
  }

  get current() {
    return clone(this.#present);
  }

  get canUndo() {
    return this.#past.length > 0;
  }

  get canRedo() {
    return this.#future.length > 0;
  }

  push(next: OpenBioFigureProject) {
    if (JSON.stringify(next) === JSON.stringify(this.#present)) return;
    this.#past.push(clone(this.#present));
    if (this.#past.length > this.limit) this.#past.shift();
    this.#present = clone(next);
    this.#future = [];
  }

  replace(next: OpenBioFigureProject) {
    this.#present = clone(next);
  }

  undo(): OpenBioFigureProject | null {
    const previous = this.#past.pop();
    if (!previous) return null;
    this.#future.push(clone(this.#present));
    this.#present = previous;
    return this.current;
  }

  redo(): OpenBioFigureProject | null {
    const next = this.#future.pop();
    if (!next) return null;
    this.#past.push(clone(this.#present));
    this.#present = next;
    return this.current;
  }
}
