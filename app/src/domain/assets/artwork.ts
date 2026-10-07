import { z } from "zod";
import { sanitizeSvg } from "./sanitize";
import { projectAssetSchema, type ProjectAsset } from "./schema";
import { INPUT_LIMITS, InputError } from "../security/input";

const NS = "http://www.w3.org/2000/svg";
const DRAWABLE = new Set(["g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text"]);
export type Matrix = [number, number, number, number, number, number];
const identity = (): Matrix => [1, 0, 0, 1, 0, 0];

export function multiply(a: Matrix, b: Matrix): Matrix {
  return [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3],
    a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
}

// Input has already passed strict SVG validation. Consolidation keeps repeated
// drags bounded instead of growing an unbounded transform attribute.
export function artworkMatrix(value: string | null): Matrix {
  let result = identity();
  for (const match of (value ?? "").matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)/g)) {
    const n = [...match[2]!.matchAll(/[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/ig)].map(item => Number(item[0]));
    let next = identity();
    const a = n[0]!;
    if (match[1] === "matrix") next = n as Matrix;
    if (match[1] === "translate") next = [1, 0, 0, 1, a, n[1] ?? 0];
    if (match[1] === "scale") next = [a, 0, 0, n[1] ?? a, 0, 0];
    if (match[1] === "skewX") next[2] = Math.tan(a*Math.PI/180);
    if (match[1] === "skewY") next[1] = Math.tan(a*Math.PI/180);
    if (match[1] === "rotate") {
      const c = Math.cos(a*Math.PI/180), s = Math.sin(a*Math.PI/180);
      const x = n[1] ?? 0, y = n[2] ?? 0;
      next = [c, s, -s, c, x-c*x+s*y, y-s*x-c*y];
    }
    result = multiply(result, next);
  }
  return result;
}

export function artworkDocument(svg: string): XMLDocument {
  return new DOMParser().parseFromString(sanitizeSvg(svg).svg, "image/svg+xml");
}

export function artworkElement(root: Element, key: string): Element {
  let element = root;
  if (!/^\d+(?:\.\d+)*$/.test(key)) throw new InputError("artwork_selection", "Select an artwork part first.");
  for (const index of key.split(".")) {
    const child = element.children[Number(index)];
    if (!child) throw new InputError("artwork_selection", "This artwork part no longer exists.");
    element = child;
  }
  return element;
}

export function presentation(element: Element, property: string, fallback = "", inherit = true): string {
  for (let current: Element | null = element; current; current = inherit ? current.parentElement : null) {
    const styles = (current.getAttribute("style") ?? "").split(";");
    const declaration = styles.reverse().find(item => item.split(":")[0]?.trim() === property);
    if (declaration) return declaration.slice(declaration.indexOf(":") + 1).trim();
    const value = current.getAttribute(property);
    if (value !== null) return value;
  }
  return fallback;
}

function setPresentation(element: Element, property: string, value: string) {
  const styles = (element.getAttribute("style") ?? "").split(";")
    .filter(item => item.trim() && item.split(":")[0]?.trim() !== property);
  if (styles.length) element.setAttribute("style", styles.join(";"));
  else element.removeAttribute("style");
  element.setAttribute(property, value);
}

export interface ArtworkPart {
  key: string;
  label: string;
  tag: string;
  depth: number;
  fill: string;
  stroke: string;
  strokeWidth: string;
  opacity: string;
  hidden: boolean;
  text: string | null;
  path: string | null;
  matrix: Matrix;
}

export function artworkParts(root: Element): ArtworkPart[] {
  const parts: ArtworkPart[] = [];
  const walk = (parent: Element, prefix: string, inDefinition: boolean) => {
    Array.from(parent.children).forEach((element, index) => {
      const key = prefix ? `${prefix}.${index}` : String(index);
      const tag = element.localName;
      const definition = inDefinition || ["defs", "clipPath", "linearGradient", "radialGradient"].includes(tag);
      if ((!definition && DRAWABLE.has(tag)) || tag === "stop") {
        parts.push({key, tag, depth: key.split(".").length - 1,
          label: element.getAttribute("id") || (tag === "stop" ? `Gradient stop ${element.getAttribute("offset") ?? ""}` : `${tag} ${parts.length + 1}`),
          fill: presentation(element, tag === "stop" ? "stop-color" : "fill", "black"),
          stroke: presentation(element, "stroke", "none"),
          strokeWidth: presentation(element, "stroke-width", "1"),
          opacity: presentation(element, tag === "stop" ? "stop-opacity" : "opacity", "1", false),
          hidden: presentation(element, "display", "inline", false) === "none" || presentation(element, "visibility", "visible", false) !== "visible",
          text: tag === "text" && !element.children.length ? element.textContent ?? "" : null,
          path: tag === "path" ? element.getAttribute("d") : null,
          matrix: artworkMatrix(element.getAttribute("transform")),
        });
      }
      if (tag !== "text") walk(element, key, definition);
    });
  };
  walk(root, "", false);
  return parts;
}

const finite = z.number().finite().min(-10_000).max(10_000);
const point = z.tuple([finite, finite]);
const operationSchema = z.discriminatedUnion("type", [
  z.object({type: z.literal("property"), name: z.enum(["fill", "stroke", "stroke-width", "opacity", "stop-color", "stop-opacity", "font-size", "d"]), value: z.string().max(INPUT_LIMITS.pathLength)}).strict(),
  z.object({type: z.literal("text"), value: z.string().max(INPUT_LIMITS.textLength)}).strict(),
  z.object({type: z.literal("move"), x: finite, y: finite}).strict(),
  z.object({type: z.literal("offset"), x: finite, y: finite}).strict(),
  z.object({type: z.literal("scale"), x: finite, y: finite, center: point}).strict(),
  z.object({type: z.literal("rotate"), degrees: finite, center: point}).strict(),
  z.object({type: z.enum(["delete", "duplicate", "hide", "raise", "lower"])}).strict(),
  z.object({type: z.literal("add"), shape: z.enum(["rect", "ellipse", "text"]), center: point, size: z.number().positive().max(10_000)}).strict(),
]);
export type ArtworkOperation = z.infer<typeof operationSchema>;

function serialize(root: Element): string {
  return sanitizeSvg(new XMLSerializer().serializeToString(root)).svg;
}

export function editArtwork(svg: string, key: string | null, input: ArtworkOperation): {svg: string; key: string | null} {
  const operation = operationSchema.parse(input);
  const root = artworkDocument(svg).documentElement;
  if (operation.type === "add") {
    const element = root.ownerDocument.createElementNS(NS, operation.shape);
    const [x, y] = operation.center, size = operation.size;
    const attributes = operation.shape === "rect" ? {x: x-size/2, y: y-size/2, width: size, height: size}
      : operation.shape === "ellipse" ? {cx: x, cy: y, rx: size/2, ry: size/3}
      : {x, y, "font-size": size/3};
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
    element.setAttribute("fill", "#087f8c");
    if (operation.shape === "text") { element.textContent = "Label"; element.setAttribute("font-family", "IBM Plex Sans"); }
    root.append(element);
    return {svg: serialize(root), key: String(root.children.length - 1)};
  }
  const element = artworkElement(root, key ?? "");
  const parts = artworkParts(root);
  if (!parts.some(part => part.key === key)) throw new InputError("artwork_selection", "Select an editable artwork part.");
  switch (operation.type) {
    case "property":
      if (operation.name === "d") {
        if (element.localName !== "path") throw new InputError("artwork_path", "Select a path to edit its geometry.");
        element.setAttribute("d", operation.value);
      } else {
        if (element.localName === "g" && ["fill", "stroke", "stroke-width"].includes(operation.name)) {
          for (const child of parts) {
            if (!child.key.startsWith(`${key}.`) || child.tag === "g" || child.tag === "stop") continue;
            if (operation.name === "fill" && child.fill === "none") continue;
            if (operation.name !== "fill" && child.stroke === "none") continue;
            setPresentation(artworkElement(root, child.key), operation.name, operation.value);
          }
        }
        setPresentation(element, operation.name, operation.value);
      }
      break;
    case "text":
      if (element.localName !== "text" || element.children.length) throw new InputError("artwork_text", "This text contains separately styled spans. Its structure is preserved.");
      element.textContent = operation.value;
      break;
    case "hide":
      setPresentation(element, "display", presentation(element, "display", "inline", false) === "none" || presentation(element, "visibility", "visible", false) !== "visible" ? "inline" : "none");
      setPresentation(element, "visibility", "visible");
      break;
    case "delete": element.remove(); key = null; break;
    case "duplicate": {
      const copy = element.cloneNode(true) as Element;
      // A duplicated subtree may own gradients/clips: renew their IDs and only
      // remap references into that subtree. Shared definitions remain shared.
      const all = [copy, ...copy.querySelectorAll("*")];
      const ids = new Map<string, string>();
      for (const node of all) if (node.id) ids.set(node.id, `part-${crypto.randomUUID()}`);
      for (const node of all) {
        if (node.id) node.setAttribute("id", ids.get(node.id)!);
        for (const attr of Array.from(node.attributes)) node.setAttribute(attr.name,
          attr.value.replace(/url\(#([^)]*)\)/g, (match, id: string) => ids.has(id) ? `url(#${ids.get(id)})` : match));
      }
      element.after(copy);
      key = key!.split(".").slice(0, -1).concat(String(Array.from(copy.parentElement!.children).indexOf(copy))).join(".");
      break;
    }
    case "raise": case "lower": {
      const sibling = operation.type === "raise" ? element.nextElementSibling : element.previousElementSibling;
      if (sibling) {
        if (operation.type === "raise") sibling.after(element); else sibling.before(element);
        key = key!.split(".").slice(0, -1).concat(String(Array.from(element.parentElement!.children).indexOf(element))).join(".");
      }
      break;
    }
    default: {
      let matrix = artworkMatrix(element.getAttribute("transform"));
      if (operation.type === "move") { matrix[4] += operation.x; matrix[5] += operation.y; }
      else if (operation.type === "offset") { matrix[4] = operation.x; matrix[5] = operation.y; }
      else {
        const [x, y] = operation.center;
        let transform: Matrix;
        if (operation.type === "scale") {
          if (!operation.x || !operation.y) throw new InputError("artwork_scale", "The part must have a nonzero size.");
          transform = [operation.x, 0, 0, operation.y, x*(1-operation.x), y*(1-operation.y)];
        } else {
          const c = Math.cos(operation.degrees*Math.PI/180), s = Math.sin(operation.degrees*Math.PI/180);
          transform = [c, s, -s, c, x-c*x+s*y, y-s*x-c*y];
        }
        matrix = multiply(matrix, transform);
      }
      element.setAttribute("transform", `matrix(${matrix.map(n => Number(n.toFixed(8))).join(" ")})`);
    }
  }
  return {svg: serialize(root), key};
}

export function bakeArtworkPaint(svg: string, fill: string | null, stroke: string | null): string {
  const root = artworkDocument(svg).documentElement;
  for (const part of artworkParts(root)) {
    if (part.tag === "g" || part.tag === "stop") continue;
    const element = artworkElement(root, part.key);
    if (fill !== null && part.fill !== "none") setPresentation(element, "fill", fill);
    if (stroke !== null && part.stroke !== "none") setPresentation(element, "stroke", stroke);
  }
  return serialize(root);
}

export function createArtworkVariant(asset: ProjectAsset, svg: string): ProjectAsset {
  const note = "Artwork parts edited in OpenBRender.";
  const notes = asset.attribution.modificationNotes;
  return projectAssetSchema.parse({...asset, id: `edited-${crypto.randomUUID()}`,
    svg: sanitizeSvg(svg).svg, verified: false,
    attribution: {...asset.attribution, modified: true,
      modificationNotes: notes?.includes(note) ? notes : [notes, note].filter(Boolean).join(" ")},
  });
}
