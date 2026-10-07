export type InspectorTab = "properties" | "layers" | "licensing";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface PendingSvg {
  fileName: string;
  svg: string;
  changed: boolean;
}
