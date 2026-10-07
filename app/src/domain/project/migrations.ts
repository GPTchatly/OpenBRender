import { createProject } from "./factory";
import { z } from "zod";
import { InputError, preflightValue } from "../security/input";
import {
  FORMAT_VERSION,
  parseProject,
  type OpenBioFigureProject,
} from "./schema";

const legacySchema = z.object({
  formatVersion: z.union([z.literal(0), z.literal("0.1.0")]),
  title: z.string().min(1).max(10_000).optional(),
  metadata: z.object({ title: z.string().min(1).max(10_000) }).strict().optional(),
  document: z.object({
    width: z.number().int().min(100).max(10_000).optional(),
    height: z.number().int().min(100).max(10_000).optional(),
    background: z.string().max(128).optional(),
  }).strict().optional(),
  objects: z.array(z.unknown()).max(5_000).optional(),
  assets: z.array(z.unknown()).max(1_000).optional(),
}).strict();

export function migrateProject(input: unknown): OpenBioFigureProject {
  preflightValue(input);
  if (typeof input !== "object" || input === null)
    throw new Error("Project data must be an object.");
  if ("formatVersion" in input && input.formatVersion === FORMAT_VERSION)
    return parseProject(input);

  const legacy = legacySchema.safeParse(input);
  if (legacy.success) {
    const candidate = legacy.data;
    const migrated = createProject("custom", {
      width: candidate.document?.width ?? 1200,
      height: candidate.document?.height ?? 800,
    });
    migrated.metadata.title =
      candidate.title ?? candidate.metadata?.title ?? "Imported figure";
    migrated.document.background = candidate.document?.background ?? "#ffffff";
    return parseProject({ ...migrated, objects: candidate.objects ?? [], assets: candidate.assets ?? [] });
  }

  throw new InputError("unsupported_version", "Project format or migration data is unsupported.");
}
