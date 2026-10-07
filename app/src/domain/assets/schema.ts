import { z } from "zod";

const text = () => z.string().min(1).max(10_000);
const absoluteUrl = z.string().max(2048).url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Provenance URLs must be HTTPS without credentials.");

export const assetLicenseSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/),
  name: text(),
  url: absoluteUrl.nullable(),
  attributionRequired: z.boolean(),
}).strict();

const assetMetadataBaseSchema = z.object({
  id: z.string().max(128).regex(/^[a-z0-9][a-z0-9-]+$/),
  title: text(),
  description: text(),
  keywords: z.array(text()).min(1).max(100),
  category: text(),
  file: z.string().regex(/^[a-zA-Z0-9._-]+\.svg$/),
  integrity: z.string().regex(/^sha256-[A-F0-9]{64}$/),
  source: z.object({
    provider: text(),
    sourceUrl: absoluteUrl,
    assetUrl: absoluteUrl,
    retrievedAt: z.iso.date(),
    revision: z.string().min(7).max(10_000),
    upstreamPath: text(),
  }).strict(),
  creator: z.object({
    name: text(),
    url: absoluteUrl.nullable(),
  }).strict(),
  license: assetLicenseSchema,
  attribution: z.object({
    text: text(),
    modified: z.boolean(),
    modificationNotes: text().nullable(),
  }).strict(),
}).strict();

function validateModificationState(
  asset: {
    attribution: { modified: boolean; modificationNotes: string | null };
  },
  context: z.RefinementCtx,
) {
  if (
    asset.attribution.modified !== Boolean(asset.attribution.modificationNotes)
  ) {
    context.addIssue({
      code: "custom",
      path: ["attribution", "modificationNotes"],
      message:
        "Modification notes must be present exactly when modified is true.",
    });
  }
}

export const assetMetadataSchema = assetMetadataBaseSchema.superRefine(
  validateModificationState,
);

export const projectAssetSchema = assetMetadataBaseSchema
  .omit({ file: true, integrity: true, source: true })
  .extend({
    source: z.object({
      provider: text(),
      sourceUrl: absoluteUrl.nullable(),
      assetUrl: absoluteUrl.nullable(),
      retrievedAt: z.iso.date(),
      revision: z.string().min(7).max(10_000).nullable().optional(),
      upstreamPath: text().nullable().optional(),
    }).strict(),
    svg: z.string().min(1).max(2_000_000),
    verified: z.boolean(),
  })
  .superRefine(validateModificationState);

export type AssetMetadata = z.infer<typeof assetMetadataSchema>;
export type ProjectAsset = z.infer<typeof projectAssetSchema>;
export type AssetLicense = z.infer<typeof assetLicenseSchema>;

export interface AssetProvider {
  readonly id: string;
  readonly label: string;
  list(): Promise<AssetMetadata[]>;
  loadSvg(asset: AssetMetadata): Promise<string>;
}
