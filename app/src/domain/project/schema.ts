import { z } from "zod";
import { projectAssetSchema } from "../assets/schema";
import { sanitizeSvg, isSafePaint } from "../assets/sanitize";
import { matchesApprovedAsset } from "../assets/reviewedCatalog";
import { INPUT_LIMITS, InputError, preflightValue } from "../security/input";

export const FORMAT_VERSION = "1.0.0" as const;

const commonObjectSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(INPUT_LIMITS.textLength),
  x: z.number().finite().min(-INPUT_LIMITS.coordinate).max(INPUT_LIMITS.coordinate),
  y: z.number().finite().min(-INPUT_LIMITS.coordinate).max(INPUT_LIMITS.coordinate),
  width: z.number().positive().max(INPUT_LIMITS.coordinate),
  height: z.number().positive().max(INPUT_LIMITS.coordinate),
  scaleX: z.number().min(0.001).max(INPUT_LIMITS.scale),
  scaleY: z.number().min(0.001).max(INPUT_LIMITS.scale),
  angle: z.number().finite().min(-360_000).max(360_000),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
  fill: z.string().max(128).refine(isSafePaint).nullable(),
  stroke: z.string().max(128).refine(isSafePaint).nullable(),
  strokeWidth: z.number().min(0).max(10_000),
}).strict();

const rectObjectSchema = commonObjectSchema.extend({ kind: z.literal("rect") });
const ellipseObjectSchema = commonObjectSchema.extend({
  kind: z.literal("ellipse"),
});
const textObjectSchema = commonObjectSchema.extend({
  kind: z.literal("text"),
  text: z.string().max(INPUT_LIMITS.textLength),
  fontFamily: z.string().min(1).max(128).regex(/^[A-Za-z][A-Za-z0-9 ,'-]*$/),
  fontSize: z.number().positive().max(10_000),
  fontWeight: z.union([z.enum(["normal", "bold"]), z.number().int().min(100).max(900)]),
  textAlign: z.enum(["left", "center", "right", "justify"]),
});
const lineObjectSchema = commonObjectSchema.extend({
  kind: z.enum(["line", "arrow", "connector"]),
  points: z.tuple(Array.from({ length: 4 }, () => z.number().finite().min(-INPUT_LIMITS.coordinate).max(INPUT_LIMITS.coordinate)) as [z.ZodNumber, z.ZodNumber, z.ZodNumber, z.ZodNumber]),
});
const svgObjectSchema = commonObjectSchema.extend({
  kind: z.literal("svg"),
  assetId: z.string().min(1).max(128),
});

export type ProjectObject =
  | z.infer<typeof rectObjectSchema>
  | z.infer<typeof ellipseObjectSchema>
  | z.infer<typeof textObjectSchema>
  | z.infer<typeof lineObjectSchema>
  | z.infer<typeof svgObjectSchema>
  | (z.infer<typeof commonObjectSchema> & {
      kind: "group";
      children: ProjectObject[];
    });

export const projectObjectSchema: z.ZodType<ProjectObject> = z.lazy(() =>
  z.union([
    rectObjectSchema,
    ellipseObjectSchema,
    textObjectSchema,
    lineObjectSchema,
    svgObjectSchema,
    commonObjectSchema.extend({
      kind: z.literal("group"),
      children: z.array(projectObjectSchema).max(INPUT_LIMITS.objects),
    }),
  ]),
);

export const openBioFigureProjectSchema = z.object({
  formatVersion: z.literal(FORMAT_VERSION),
  metadata: z.object({
    id: z.string().min(1).max(128),
    title: z.string().min(1).max(INPUT_LIMITS.textLength),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    applicationVersion: z.string().min(1).max(128),
  }).strict(),
  document: z.object({
    width: z.number().int().min(100).max(10_000),
    height: z.number().int().min(100).max(10_000),
    unit: z.literal("px"),
    background: z.string().min(1).max(128).refine(isSafePaint),
    preset: z.string().min(1).max(128),
  }).strict(),
  objects: z.array(projectObjectSchema).max(INPUT_LIMITS.objects),
  assets: z.array(projectAssetSchema).max(INPUT_LIMITS.assets),
  settings: z.object({
    grid: z.object({
      enabled: z.boolean(),
      size: z.number().int().min(2).max(200),
      snap: z.boolean(),
    }).strict(),
    locale: z.enum(["en", "fr"]),
  }).strict(),
}).strict();

export type OpenBioFigureProject = z.infer<typeof openBioFigureProjectSchema>;

export function parseProject(value: unknown): OpenBioFigureProject {
  preflightValue(value);
  const result = openBioFigureProjectSchema.safeParse(value);
  if (!result.success) throw new InputError("invalid_project", "Project structure or values are unsupported.");
  const project = result.data;
  if (project.document.width * project.document.height > INPUT_LIMITS.pngPixels)
    throw new InputError("document_too_large", "The document exceeds the canvas budget. Reduce its dimensions.");
  const assets = new Map<string, { commands: number; elements: number }>();
  let retainedCommands = 0;
  for (const asset of project.assets) {
    if (assets.has(asset.id)) throw new InputError("duplicate_id", "Project asset IDs must be unique.");
    const sanitized = sanitizeSvg(asset.svg);
    asset.svg = sanitized.svg;
    if (sanitized.changed) {
      const note = "Inert comments were removed and SVG serialization was normalized during import.";
      const notes = asset.attribution.modificationNotes ? asset.attribution.modificationNotes + " " + note : note;
      if (notes.length > INPUT_LIMITS.textLength)
        throw new InputError("text_limit", "SVG modification notes exceed the supported text limit.");
      asset.attribution.modified = true;
      asset.attribution.modificationNotes = notes;
    }
    // A portable file or recovery record cannot grant reviewed catalogue status.
    // Reconstruct approval from the application-owned manifest and SVG fingerprint.
    asset.verified = matchesApprovedAsset(asset);
    assets.set(asset.id, { commands: sanitized.pathCommands, elements: sanitized.elements });
    retainedCommands += sanitized.pathCommands;
  }
  const ids = new Set<string>();
  let objectCount = 0;
  let commands = 0;
  let elements = 0;
  const visit = (objects: ProjectObject[], parentScaleX = 1, parentScaleY = 1) => {
    for (const object of objects) {
      if (++objectCount > INPUT_LIMITS.objects)
        throw new InputError("object_limit", "Project object count exceeds the supported limit.");
      if (ids.has(object.id)) throw new InputError("duplicate_id", "Project object IDs must be unique.");
      ids.add(object.id);
      const scaleX = parentScaleX * object.scaleX;
      const scaleY = parentScaleY * object.scaleY;
      if (Math.max(scaleX, scaleY) > INPUT_LIMITS.scale ||
          object.width * scaleX > INPUT_LIMITS.coordinate || object.height * scaleY > INPUT_LIMITS.coordinate)
        throw new InputError("transform_limit", "Project transforms exceed the supported geometry budget.");
      if (object.kind === "svg") {
        const asset = assets.get(object.assetId);
        if (!asset) throw new InputError("missing_asset", "Project contains a missing asset reference.");
        commands += asset.commands;
        elements += asset.elements;
      }
      if (object.kind === "group") visit(object.children, scaleX, scaleY);
    }
  };
  visit(project.objects);
  if (Math.max(commands, retainedCommands) > INPUT_LIMITS.documentPathCommands || elements > INPUT_LIMITS.documentVectorElements)
    throw new InputError("vector_limit", "Expanded artwork exceeds the project vector budget.");
  return project;
}
