import type { DocumentPreset } from "../project/factory";

export const PREFERENCES_KEY = "openbiofigure:preferences:v2";

export type ThemePreference = "light" | "dark" | "system";
export type DensityPreference = "comfortable" | "compact";
export type StartupPreference = "home" | "reopen";

export interface AppPreferences {
  theme: ThemePreference;
  density: DensityPreference;
  reduceMotion: boolean;
  startup: StartupPreference;
  recentProjectCount: number;
  defaultPreset: Exclude<DocumentPreset, "custom">;
  gridSize: number;
  snapToGrid: boolean;
  pngExportScale: 1 | 2 | 3 | 4;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: "system",
  density: "comfortable",
  reduceMotion: false,
  startup: "home",
  recentProjectCount: 6,
  defaultPreset: "journal",
  gridSize: 20,
  snapToGrid: false,
  pngExportScale: 2,
};

const themes = new Set<ThemePreference>(["light", "dark", "system"]);
const densities = new Set<DensityPreference>(["comfortable", "compact"]);
const startupOptions = new Set<StartupPreference>(["home", "reopen"]);
const presets = new Set<AppPreferences["defaultPreset"]>([
  "square",
  "widescreen",
  "a4-portrait",
  "a4-landscape",
  "journal",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizePreferences(value: unknown): AppPreferences {
  if (!isRecord(value)) return { ...DEFAULT_PREFERENCES };
  const theme = themes.has(value.theme as ThemePreference)
    ? (value.theme as ThemePreference)
    : DEFAULT_PREFERENCES.theme;
  const density = densities.has(value.density as DensityPreference)
    ? (value.density as DensityPreference)
    : DEFAULT_PREFERENCES.density;
  const startup = startupOptions.has(value.startup as StartupPreference)
    ? (value.startup as StartupPreference)
    : DEFAULT_PREFERENCES.startup;
  const defaultPreset = presets.has(
    value.defaultPreset as AppPreferences["defaultPreset"],
  )
    ? (value.defaultPreset as AppPreferences["defaultPreset"])
    : DEFAULT_PREFERENCES.defaultPreset;
  const gridSize = Number(value.gridSize);
  const recentProjectCount = Number(value.recentProjectCount);
  const pngExportScale = Number(value.pngExportScale);

  return {
    theme,
    density,
    reduceMotion: value.reduceMotion === true,
    startup,
    recentProjectCount:
      Number.isInteger(recentProjectCount) &&
      recentProjectCount >= 3 &&
      recentProjectCount <= 8
        ? recentProjectCount
        : DEFAULT_PREFERENCES.recentProjectCount,
    defaultPreset,
    gridSize:
      Number.isInteger(gridSize) && gridSize >= 2 && gridSize <= 200
        ? gridSize
        : DEFAULT_PREFERENCES.gridSize,
    snapToGrid: value.snapToGrid === true,
    pngExportScale: [1, 2, 3, 4].includes(pngExportScale)
      ? (pngExportScale as AppPreferences["pngExportScale"])
      : DEFAULT_PREFERENCES.pngExportScale,
  };
}

export function loadPreferences(storage: Storage): AppPreferences {
  try {
    const current = storage.getItem(PREFERENCES_KEY);
    if (current) return normalizePreferences(JSON.parse(current));

    const legacy = storage.getItem("openbiofigure:preferences:v1");
    return legacy
      ? normalizePreferences(JSON.parse(legacy))
      : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(storage: Storage, preferences: AppPreferences) {
  storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function applyAppearancePreferences(
  preferences: Pick<AppPreferences, "theme" | "density" | "reduceMotion">,
  root: HTMLElement = document.documentElement,
) {
  if (preferences.theme === "system") delete root.dataset.theme;
  else root.dataset.theme = preferences.theme;
  root.dataset.density = preferences.density;
  root.dataset.reduceMotion = String(preferences.reduceMotion);
}
