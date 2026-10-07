// Policy v1. These are ceilings, not yet measured browser performance claims.
export const INPUT_LIMITS = Object.freeze({
  projectBytes: 50 * 1_048_576,
  svgBytes: 2_000_000,
  jsonDepth: 64,
  jsonNodes: 200_000,
  textLength: 10_000,
  aggregateText: 1_000_000,
  objects: 5_000,
  assets: 1_000,
  svgDepth: 32,
  svgElements: 10_000,
  attributeLength: 16_384,
  pathLength: 1_000_000,
  pathCommands: 100_000,
  documentPathCommands: 500_000,
  documentVectorElements: 100_000,
  coordinate: 1_000_000,
  scale: 1_000,
  pngSide: 16_384,
  pngPixels: 64_000_000,
});

export class InputError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "InputError";
    this.code = code;
  }
}

export function assertByteLimit(text: string, maximum: number): void {
  // Reject before creating another large UTF-8 buffer when even ASCII is too big.
  if (text.length > maximum || new TextEncoder().encode(text).byteLength > maximum)
    throw new InputError("input_too_large", "The file exceeds the supported byte limit.");
}

export function assertFileSize(size: number, maximum: number): void {
  if (!Number.isSafeInteger(size) || size < 0 || size > maximum)
    throw new InputError("input_too_large", "The file exceeds the supported byte limit.");
}

export function preflightValue(value: unknown): void {
  const pending: { value: unknown; depth: number; svg: boolean }[] = [
    { value, depth: 0, svg: false },
  ];
  const seen = new WeakSet<object>();
  let nodes = 0;
  let text = 0;
  let embeddedBytes = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++nodes > INPUT_LIMITS.jsonNodes || item.depth > INPUT_LIMITS.jsonDepth)
      throw new InputError("input_complexity", "Project nesting or complexity exceeds the supported limit.");
    if (typeof item.value === "string") {
      if (item.svg) {
        assertByteLimit(item.value, INPUT_LIMITS.svgBytes);
        embeddedBytes += new TextEncoder().encode(item.value).byteLength;
        if (embeddedBytes > INPUT_LIMITS.projectBytes)
          throw new InputError("input_too_large", "Embedded artwork exceeds the project byte limit.");
      } else {
        text += item.value.length;
        if (item.value.length > INPUT_LIMITS.textLength || text > INPUT_LIMITS.aggregateText)
          throw new InputError("text_limit", "Project text exceeds the supported limit.");
      }
    } else if (typeof item.value === "number") {
      if (!Number.isFinite(item.value))
        throw new InputError("invalid_number", "Project numbers must be finite.");
    } else if (item.value && typeof item.value === "object") {
      if (seen.has(item.value))
        throw new InputError("cyclic_data", "Project data must be an acyclic JSON tree.");
      seen.add(item.value);
      const prototype = Object.getPrototypeOf(item.value);
      if (!Array.isArray(item.value) && prototype !== Object.prototype && prototype !== null)
        throw new InputError("invalid_data", "Project data must contain plain JSON values.");
      if (Array.isArray(item.value) && item.value.length > INPUT_LIMITS.jsonNodes)
        throw new InputError("input_complexity", "Project complexity exceeds the supported limit.");
      const entries = Object.entries(Object.getOwnPropertyDescriptors(item.value));
      if (nodes + pending.length + entries.length > INPUT_LIMITS.jsonNodes)
        throw new InputError("input_complexity", "Project complexity exceeds the supported limit.");
      for (const [key, descriptor] of entries) {
        if (["__proto__", "prototype", "constructor"].includes(key))
          throw new InputError("unsafe_key", "Project data contains a reserved property.");
        if (!Object.hasOwn(descriptor, "value"))
          throw new InputError("invalid_data", "Project data cannot contain accessors.");
        if (key === "length" && Array.isArray(item.value)) continue;
        pending.push({ value: descriptor.value, depth: item.depth + 1, svg: key === "svg" });
      }
    } else if (item.value !== null && typeof item.value !== "boolean" && item.value !== undefined) {
      throw new InputError("invalid_data", "Project data must contain JSON values.");
    }
  }
}

export function parseBoundedJson(text: string): unknown {
  assertByteLimit(text, INPUT_LIMITS.projectBytes);
  // Bound nesting before JSON.parse: quoted brackets and escapes do not count.
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (const char of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") {
      if (++depth > INPUT_LIMITS.jsonDepth)
        throw new InputError("input_complexity", "Project nesting exceeds the supported limit.");
    } else if (char === "}" || char === "]") depth--;
  }
  let value: unknown;
  try { value = JSON.parse(text) as unknown; }
  catch { throw new InputError("invalid_json", "The file is not valid project JSON."); }
  preflightValue(value);
  return value;
}

export function assertPngDimensions(width: number, height: number, scale: number): void {
  const pixelsWide = Math.ceil(width * scale);
  const pixelsHigh = Math.ceil(height * scale);
  if (![width, height, scale].every(n => Number.isFinite(n) && n > 0) ||
      pixelsWide > INPUT_LIMITS.pngSide || pixelsHigh > INPUT_LIMITS.pngSide ||
      pixelsWide * pixelsHigh > INPUT_LIMITS.pngPixels)
    throw new InputError("export_too_large", "PNG dimensions exceed the export budget. Reduce the size or resolution.");
}
