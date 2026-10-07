import { FORMAT_VERSION, type OpenBioFigureProject } from "./schema";

export const DOCUMENT_PRESETS = {
  square: { label: "Square", width: 1080, height: 1080 },
  widescreen: { label: "16:9", width: 1600, height: 900 },
  "a4-portrait": { label: "A4 portrait", width: 794, height: 1123 },
  "a4-landscape": { label: "A4 landscape", width: 1123, height: 794 },
  journal: { label: "Journal figure", width: 1200, height: 800 },
} as const;

export type DocumentPreset = keyof typeof DOCUMENT_PRESETS | "custom";

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `obf-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function createProject(
  preset: DocumentPreset = "journal",
  custom?: { width: number; height: number },
): OpenBioFigureProject {
  const dimensions = preset === "custom" ? custom : DOCUMENT_PRESETS[preset];
  if (!dimensions) throw new Error("Custom document dimensions are required.");
  const now = new Date().toISOString();
  return {
    formatVersion: FORMAT_VERSION,
    metadata: {
      id: makeId(),
      title: "Untitled figure",
      createdAt: now,
      updatedAt: now,
      applicationVersion: "OpenBRender 0.1.0",
    },
    document: {
      width: Math.round(dimensions.width),
      height: Math.round(dimensions.height),
      unit: "px",
      background: "#ffffff",
      preset,
    },
    objects: [],
    assets: [],
    settings: { grid: { enabled: false, size: 20, snap: false }, locale: "en" },
  };
}
