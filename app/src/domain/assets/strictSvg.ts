import createDOMPurify, { type WindowLike } from "dompurify";
import { assertByteLimit, INPUT_LIMITS, InputError } from "../security/input";

const SVG_NS = "http://www.w3.org/2000/svg";
const ELEMENT_ATTRIBUTES: Record<string, string[]> = {
  svg: ["xmlns", "xmlns:xlink", "version", "viewBox", "width", "height", "preserveAspectRatio", "xml:space"],
  g: [], defs: [], path: ["d", "pathLength"],
  rect: ["x", "y", "width", "height", "rx", "ry"], circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"], line: ["x1", "x2", "y1", "y2"],
  polyline: ["points"], polygon: ["points"],
  text: ["x", "y", "dx", "dy", "textLength", "lengthAdjust", "xml:space"],
  tspan: ["x", "y", "dx", "dy", "xml:space"], title: [], desc: [], metadata: [],
  linearGradient: ["x1", "x2", "y1", "y2", "gradientUnits", "gradientTransform", "spreadMethod"],
  radialGradient: ["cx", "cy", "r", "fx", "fy", "fr", "gradientUnits", "gradientTransform", "spreadMethod"],
  stop: ["offset", "stop-color", "stop-opacity"], clipPath: ["clipPathUnits"],
};
const COMMON = ["id", "transform", "style", "opacity", "fill", "fill-opacity", "fill-rule",
  "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin",
  "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "clip-path", "clip-rule",
  "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline",
  "letter-spacing", "text-decoration", "text-decoration-thickness", "visibility", "display", "vector-effect", "paint-order", "white-space"];
const TEXT_ELEMENTS = new Set(["text", "tspan", "title", "desc", "metadata"]);
const NUMERIC = new Set(["x", "y", "dx", "dy", "x1", "x2", "y1", "y2", "cx", "cy", "fx", "fy",
  "r", "rx", "ry", "fr", "width", "height", "pathLength", "textLength", "offset", "font-size",
  "stroke-width", "stroke-dashoffset", "stroke-miterlimit", "letter-spacing", "text-decoration-thickness"]);
const ENUMS: Record<string, string[]> = {
  "fill-rule": ["nonzero", "evenodd"], "clip-rule": ["nonzero", "evenodd"],
  "stroke-linecap": ["butt", "round", "square"], "stroke-linejoin": ["miter", "round", "bevel"],
  "font-style": ["normal", "italic", "oblique"], "text-anchor": ["start", "middle", "end"],
  "dominant-baseline": ["auto", "alphabetic", "central", "middle", "hanging", "text-before-edge", "text-after-edge"],
  "text-decoration": ["none", "underline", "line-through", "overline"],
  visibility: ["visible", "hidden", "collapse"], display: ["inline", "none"],
  "vector-effect": ["none", "non-scaling-stroke"],
  gradientUnits: ["userSpaceOnUse", "objectBoundingBox"], clipPathUnits: ["userSpaceOnUse", "objectBoundingBox"],
  spreadMethod: ["pad", "reflect", "repeat"], lengthAdjust: ["spacing", "spacingAndGlyphs"],
  "xml:space": ["default", "preserve"],
  "white-space": ["normal", "pre", "pre-wrap"],
};

export interface SanitizeResult {
  svg: string;
  changed: boolean;
  warnings: string[];
  pathCommands: number;
  elements: number;
}
type SanitizerWindow = Pick<typeof globalThis, "DOMParser" | "XMLSerializer">;
function reject(message = "SVG contains active, external or unsupported content."): never {
  throw new InputError("unsupported_svg", message);
}

// This scan bounds work before DOM parsing. It is not the sanitizer.
export function preflightXml(svg: string): void {
  assertByteLimit(svg, INPUT_LIMITS.svgBytes);
  let depth = 0;
  let elements = 0;
  for (let i = 0; i < svg.length; i++) {
    if (svg[i] !== "<") continue;
    if (svg.startsWith("<!--", i)) {
      const end = svg.indexOf("-->", i + 4);
      if (end < 0) reject("SVG is not well-formed XML.");
      i = end + 2;
      continue;
    }
    if (svg.startsWith("<?", i)) {
      const end = svg.indexOf("?>", i);
      const instruction = svg.slice(i, end + 2);
      if (i !== 0 || !/^<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']UTF-8["'])?\s*\?>$/i.test(instruction))
        reject("SVG processing instructions are unsupported.");
      i = end + 1;
      continue;
    }
    if (svg.startsWith("<!", i)) reject("SVG declarations, DTDs and entities are unsupported.");
    let quote: string | undefined;
    let end = i + 1;
    for (; end < svg.length; end++) {
      const char = svg[end]!;
      if (quote) { if (char === quote) quote = undefined; }
      else if (char === "'" || char === '"') quote = char;
      else if (char === ">") break;
    }
    if (end === svg.length) reject("SVG is not well-formed XML.");
    if (svg[i + 1] === "/") depth--;
    else {
      if (++elements > INPUT_LIMITS.svgElements || depth + 1 > INPUT_LIMITS.svgDepth)
        reject("SVG nesting or element count exceeds the supported limit.");
      if (svg[end - 1] !== "/") depth++;
    }
    i = end;
  }
}

export function isSafePaint(value: string): boolean {
  const color = value.trim();
  if (/^(?:none|transparent|currentColor|black|white|red|green|blue|yellow|gray|grey|orange|purple|pink|brown|cyan|magenta|navy|teal|silver|lime|maroon|olive|aqua|fuchsia|#[0-9a-f]{3}|#[0-9a-f]{4}|#[0-9a-f]{6}|#[0-9a-f]{8})$/i.test(color)) return true;
  const match = /^(rgb|rgba)\(\s*([0-9.,%\s]+)\s*\)$/i.exec(color);
  if (!match) return false;
  const components = match[2]!.split(/[,\s]+/).filter(Boolean);
  return components.length === (match[1]!.toLowerCase() === "rgba" ? 4 : 3) &&
    components.every((n, i) => {
      const number = Number(n.replace("%", ""));
      return Number.isFinite(number) && number >= 0 && number <= (n.endsWith("%") ? 100 : i === 3 ? 1 : 255);
    });
}

function numericValues(value: string, units = false): number[] {
  const values: number[] = [];
  let rest = value.trim();
  while (rest) {
    const match = /^[,\s]*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|px|pt|mm|cm|in)?/i.exec(rest);
    if (!match || (match[2] && !units)) reject("SVG contains invalid numeric geometry.");
    const number = Number(match[1]);
    if (!Number.isFinite(number) || Math.abs(number) > INPUT_LIMITS.coordinate)
      reject("SVG geometry exceeds the coordinate budget.");
    values.push(number);
    rest = rest.slice(match[0].length);
  }
  if (!values.length) reject("SVG contains empty numeric geometry.");
  return values;
}

function validateTransform(value: string): void {
  let rest = value.trim();
  while (rest) {
    const match = /^(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)\s*/.exec(rest);
    if (!match) reject("SVG contains an unsupported transform.");
    const numbers = numericValues(match[2]!);
    const lengths: Record<string, number[]> = { matrix: [6], translate: [1, 2], scale: [1, 2], rotate: [1, 3], skewX: [1], skewY: [1] };
    if (!lengths[match[1]!]!.includes(numbers.length)) reject("SVG contains an invalid transform.");
    if (numbers.some(n => Math.abs(n) > 10_000)) reject("SVG transform exceeds the initial supported range.");
    rest = rest.slice(match[0].length).replace(/^[,\s]+/, "");
  }
}

function countPathCommands(value: string): number {
  if (value.length > INPUT_LIMITS.pathLength) reject("SVG path exceeds its length limit.");
  const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const token = /[MmZzLlHhVvCcSsQqTtAa]|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/iy;
  let position = 0;
  let command = "";
  let numbers = 0;
  let needsNumbers = false;
  let count = 0;
  while (position < value.length) {
    while (/[\s,]/.test(value[position] ?? "") && position < value.length) position++;
    if (position === value.length) break;
    token.lastIndex = position;
    const next = token.exec(value);
    if (!next) reject("SVG has invalid path geometry.");
    position = token.lastIndex;
    const item = next[0];
    if (/^[a-z]$/i.test(item)) {
      if (numbers || needsNumbers || (!command && item.toUpperCase() !== "M")) reject("SVG has incomplete path geometry.");
      command = item.toUpperCase();
      needsNumbers = command !== "Z";
      if (command === "Z") count++;
    } else {
      const number = Number(item);
      if (!command || command === "Z" || !Number.isFinite(number) || Math.abs(number) > INPUT_LIMITS.coordinate)
        reject("SVG path exceeds the geometry budget.");
      if (command === "A" && (numbers === 3 || numbers === 4) && ![0, 1].includes(number))
        reject("SVG arc flags must be zero or one.");
      if (++numbers === arity[command]) {
        count++;
        numbers = 0;
        needsNumbers = false;
      }
    }
    if (count > INPUT_LIMITS.pathCommands) reject("SVG path commands exceed the supported limit.");
  }
  if (numbers || needsNumbers) reject("SVG has incomplete path geometry.");
  return count;
}

type Reference = { from: Element; id: string; property: string };
function validateProperty(name: string, value: string, element: Element, refs: Reference[]): void {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\\]/.test(value)) reject();
  if (["fill", "stroke", "stop-color"].includes(name)) {
    const local = /^url\(#([A-Za-z_][A-Za-z0-9_.-]{0,127})\)$/.exec(value.trim());
    if (local && name !== "stop-color") refs.push({ from: element, id: local[1]!, property: name });
    else if (!isSafePaint(value)) reject();
  } else if (name === "clip-path") {
    if (value === "none") return;
    const local = /^url\(#([A-Za-z_][A-Za-z0-9_.-]{0,127})\)$/.exec(value);
    if (!local) reject();
    refs.push({ from: element, id: local[1]!, property: name });
  } else if (name === "transform" || name === "gradientTransform") validateTransform(value);
  else if (name === "id") {
    if (!/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(value)) reject("SVG has an unsupported identifier.");
  } else if (name.endsWith("opacity") || name === "opacity") {
    if (!/^(?:0(?:\.\d+)?|1(?:\.0+)?)$/.test(value.trim())) reject("SVG has invalid opacity.");
  } else if (NUMERIC.has(name)) numericValues(value, true);
  else if (name === "viewBox") {
    const numbers = numericValues(value);
    if (numbers.length !== 4 || numbers[2]! <= 0 || numbers[3]! <= 0) reject("SVG has an invalid viewBox.");
  } else if (name === "points" || name === "stroke-dasharray") {
    if (name === "stroke-dasharray" && value === "none") return;
    const numbers = numericValues(value);
    if (name === "points" && numbers.length % 2) reject("SVG has invalid points.");
  } else if (ENUMS[name]) {
    if (!ENUMS[name]!.includes(value)) reject("SVG has an unsupported presentation value.");
  } else if (name === "font-family") {
    if (!/^[A-Za-z][A-Za-z0-9 ,'-]{0,120}$/.test(value)) reject();
  } else if (name === "font-weight") {
    if (!/^(?:normal|bold|[1-9]00)$/.test(value)) reject();
  } else if (name === "paint-order") {
    if (!/^(?:normal|(?:fill|stroke|markers)(?: (?:fill|stroke|markers)){0,2})$/.test(value)) reject();
  } else if (name === "preserveAspectRatio") {
    if (!/^(?:none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/.test(value)) reject();
  } else if (name === "version") {
    if (!["1.0", "1.1", "2.0"].includes(value)) reject();
  } else if (name === "xmlns") {
    if (value !== SVG_NS) reject("SVG must use the SVG namespace.");
  } else if (name === "xmlns:xlink") {
    if (value !== "http://www.w3.org/1999/xlink") reject();
  } else if (name !== "d") reject();
}

function inspectSvg(document: Document): { elements: number; pathCommands: number } {
  const root = document.documentElement;
  if (document.querySelector("parsererror") || root.localName !== "svg" || root.namespaceURI !== SVG_NS)
    reject("The file is not a valid SVG document.");
  const ids = new Map<string, Element>();
  const refs: Reference[] = [];
  const elements = Array.from(document.querySelectorAll("*"));
  const clippingOf = (element: Element) => {
    let value = element.getAttribute("clip-path");
    for (const declaration of (element.getAttribute("style") ?? "").split(";")) {
      const split = declaration.indexOf(":");
      if (declaration.slice(0, split).trim() === "clip-path") value = declaration.slice(split + 1).trim();
    }
    return value;
  };
  let pathCommands = 0;
  let textLength = 0;
  for (const element of elements) {
    if (!Object.hasOwn(ELEMENT_ATTRIBUTES, element.localName)) reject("SVG contains an unsupported element: " + element.localName.slice(0,80));
    const permitted = ELEMENT_ATTRIBUTES[element.localName];
    if (!permitted || element.namespaceURI !== SVG_NS || (element.localName === "svg" && element !== root)) reject();
    const clipping = clippingOf(element);
    if (clipping && clipping !== "none") {
      if (element === root || element.localName === "clipPath")
        reject("SVG root or nested clipping is unsupported by the renderer.");
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent.localName === "clipPath" || (clippingOf(parent) && clippingOf(parent) !== "none"))
          reject("SVG nested clipping is unsupported by the renderer.");
      }
    }
    const id = element.getAttribute("id");
    if (id) {
      if (ids.has(id)) reject("SVG contains duplicate identifiers.");
      ids.set(id, element);
    }
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === 3) {
        const text = node.textContent ?? "";
        if (!TEXT_ELEMENTS.has(element.localName) && text.trim()) reject();
        textLength += text.length;
      } else if (![1, 8].includes(node.nodeType)) reject();
    }
    if (textLength > INPUT_LIMITS.aggregateText) reject("SVG text exceeds the supported limit.");
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name;
      if (!COMMON.includes(name) && !permitted.includes(name)) reject("SVG contains an unsupported attribute: " + name.slice(0,80));
      if (attribute.namespaceURI && !["http://www.w3.org/2000/xmlns/", "http://www.w3.org/XML/1998/namespace"].includes(attribute.namespaceURI)) reject();
      if (name !== "d" && attribute.value.length > INPUT_LIMITS.attributeLength) reject("SVG attribute exceeds its length limit.");
      if (name === "style") {
        for (const declaration of attribute.value.split(";")) {
          if (!declaration.trim()) continue;
          const split = declaration.indexOf(":");
          const property = declaration.slice(0, split).trim();
          const value = declaration.slice(split + 1).trim();
          const stopPresentation = element.localName === "stop" && ["stop-color", "stop-opacity"].includes(property);
          if (split < 1 || (!COMMON.includes(property) && !stopPresentation) || ["id", "style", "transform"].includes(property)) reject();
          validateProperty(property, value, element, refs);
        }
      } else if (name === "d") {
        pathCommands += countPathCommands(attribute.value);
        if (pathCommands > INPUT_LIMITS.pathCommands) reject("SVG path commands exceed the supported limit.");
      } else validateProperty(name, attribute.value, element, refs);
    }
  }
  const edges = new Map<Element, Element[]>();
  for (const ref of refs) {
    const target = ids.get(ref.id);
    if (!target || (ref.property === "clip-path" ? target.localName !== "clipPath" : !["linearGradient", "radialGradient"].includes(target.localName)))
      reject("SVG contains a missing or incompatible local reference.");
    edges.set(ref.from, [...(edges.get(ref.from) ?? []), target]);
  }
  for (const element of elements) {
    const children = Array.from(element.children);
    if (children.length) edges.set(element, [...(edges.get(element) ?? []), ...children]);
  }
  const active = new Set<Element>();
  const done = new Set<Element>();
  const visit = (element: Element, depth: number): void => {
    if (active.has(element) || depth > INPUT_LIMITS.svgDepth) reject("SVG references are cyclic or too deeply expanded.");
    if (done.has(element)) return;
    active.add(element);
    for (const next of edges.get(element) ?? []) visit(next, depth + 1);
    active.delete(element);
    done.add(element);
  };
  for (const element of elements) visit(element, 0);
  return { elements: elements.length, pathCommands };
}

export function sanitizeSvg(svg: string, domWindow: SanitizerWindow = globalThis): SanitizeResult {
  preflightXml(svg);
  const parser = new domWindow.DOMParser();
  const document = parser.parseFromString(svg, "image/svg+xml");
  const metrics = inspectSvg(document);
  const purifier = createDOMPurify(domWindow as unknown as WindowLike);
  const canonical = new domWindow.XMLSerializer().serializeToString(document.documentElement);
  const sanitized = purifier.sanitize(canonical, {
    ALLOWED_TAGS: ["#text", ...Object.keys(ELEMENT_ATTRIBUTES)],
    ALLOWED_ATTR: [...new Set([...COMMON, ...Object.values(ELEMENT_ATTRIBUTES).flat()])],
    ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, KEEP_CONTENT: false, SAFE_FOR_XML: true,
  });
  // DOMPurify's inert HTML parser creates a BODY wrapper outside the SVG input.
  if (purifier.removed.some(item => !("element" in item) ||
      (item.element?.nodeName !== "BODY" && item.element?.nodeType !== 8)))
    reject("SVG requires unsupported sanitization; no artwork was imported.");
  const removedComments = purifier.removed.some(item => "element" in item && item.element?.nodeType === 8);
  const finalDocument = parser.parseFromString(sanitized, "image/svg+xml");
  inspectSvg(finalDocument);
  const output = new domWindow.XMLSerializer().serializeToString(finalDocument.documentElement);
  assertByteLimit(output, INPUT_LIMITS.svgBytes);
  return { svg: output, changed: removedComments,
    warnings: removedComments ? ["Non-rendering SVG comments were removed."] : [], ...metrics };
}

export function containsActiveSvgContent(svg: string): boolean {
  try { sanitizeSvg(svg); return false; } catch { return true; }
}
