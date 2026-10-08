import { type FabricObject, Group, loadSVGFromString } from "fabric";

// Fabric's SVG parser ignores CSS compositing (mix-blend-mode, isolation) and applies
// only one clip to each shape. A blended or isolating <g>, and a clipped <g> with
// clipped content, become groups drawn through their own cache canvas, so their content
// composites and clips as one layer, as in SVG. A drawing that blends is isolated as a
// whole, as it is when the same file renders as an image. SVG export writes both back.
const composited = new WeakSet<FabricObject>();
const GROUP_CLIP = "data-group-clip";

function declarations(element: Element) {
  const values = new Map<string, string>();
  for (const declaration of (element.getAttribute("style") ?? "").split(";")) {
    const split = declaration.indexOf(":");
    if (split > 0) values.set(declaration.slice(0, split).trim(), declaration.slice(split + 1).trim());
  }
  return (name: string) => values.get(name) ?? element.getAttribute(name);
}

function clipOf(element: Element) {
  const clip = declarations(element)("clip-path");
  return clip && clip !== "none" ? clip : null;
}

function compositing(element: Element) {
  const property = declarations(element);
  const blend = property("mix-blend-mode");
  return {
    // CSS blend mode keywords are also canvas composite operations. Browsers ignore the attribute form.
    blend: element.getAttribute("mix-blend-mode") === null && blend && blend !== "normal" ? (blend as GlobalCompositeOperation) : null,
    // Clipping and group opacity isolate blending too, as browsers render SVG.
    isolate: property("isolation") === "isolate" || !!clipOf(element) || Number(property("opacity") ?? 1) < 1,
  };
}

function composite(object: FabricObject, blend: GlobalCompositeOperation | null, isolate: boolean) {
  if (blend) object.globalCompositeOperation = blend;
  // Canvas blending reaches only the pixels already in the enclosing cache canvas.
  if (object instanceof Group) object.needsItsOwnCache = () => true;
  // Around the object's whole markup: Fabric's clip-path wrapper would isolate an inner blend.
  const markup = object._createBaseSVGMarkup.bind(object);
  const style = [blend ? `mix-blend-mode: ${blend};` : "", isolate ? "isolation: isolate;" : ""].join(" ").trim();
  object._createBaseSVGMarkup = (objectMarkup, options) => `<g style="${style}">\n${markup(objectMarkup, options)}</g>\n`;
  composited.add(object);
}

// The clip shapes of a group clip, in the coordinates of the drawing parts. Each ancestor of
// the clipped group, including the viewBox group Fabric inserts, contributes its transform.
async function groupClip(group: Element, source: Document, id: string): Promise<FabricObject | null> {
  const definition = source.getElementById(id);
  if (definition?.localName !== "clipPath") return null;
  const transforms: string[] = [];
  for (let element: Element | null = group; element && element.localName !== "svg"; element = element.parentElement)
    transforms.unshift(element.getAttribute("transform") ?? "");
  transforms.push(definition.getAttribute("transform") ?? "");
  const rule = declarations(definition)("clip-rule");
  const shapes = Array.from(definition.children).filter(child => {
    const property = declarations(child);
    return property("display") !== "none" && !["hidden", "collapse"].includes(property("visibility") ?? "");
  }).map(child => {
    const shape = child.cloneNode(true) as Element;
    // Clipping uses geometry only.
    shape.setAttribute("fill-rule", declarations(child)("clip-rule") ?? rule ?? "nonzero");
    for (const name of ["style", "clip-rule", "opacity", "fill-opacity", "visibility", "display", "id"]) shape.removeAttribute(name);
    shape.setAttribute("fill", "#000");
    shape.setAttribute("stroke", "none");
    return new XMLSerializer().serializeToString(shape);
  });
  const nest = transforms.map(transform => `<g transform="${transform.replace(/"/g, "")}">`).join("");
  const parsed = await loadSVGFromString(`<svg xmlns="http://www.w3.org/2000/svg">${nest}${shapes.join("")}${"</g>".repeat(transforms.length)}</svg>`);
  const parts = parsed.objects.filter((object): object is FabricObject => Boolean(object));
  return parts.length ? (parts.length === 1 ? parts[0]! : new Group(parts)) : null;
}

/** Parses sanitized SVG into the parts of a drawing, in paint order. */
export async function loadDrawingParts(svg: string): Promise<FabricObject[]> {
  const source = new DOMParser().parseFromString(svg, "image/svg+xml");
  const clipped = Array.from(source.querySelectorAll("g")).filter(group =>
    clipOf(group) && Array.from(group.querySelectorAll("*")).some(clipOf));
  for (const group of clipped) {
    // Fabric would let the inner clips replace this one; it is applied to the group instead.
    group.setAttribute(GROUP_CLIP, clipOf(group)!);
    group.removeAttribute("clip-path");
    const style = (group.getAttribute("style") ?? "").split(";").filter(item => item.split(":")[0]?.trim() !== "clip-path").join(";");
    if (style.trim()) group.setAttribute("style", style); else group.removeAttribute("style");
  }
  const parsed = await loadSVGFromString(clipped.length ? new XMLSerializer().serializeToString(source) : svg);
  const objects = new Map<Element, FabricObject>();
  parsed.elements.forEach((element, index) => {
    const object = parsed.objects[index];
    if (object) objects.set(element, object);
  });
  const root = parsed.allElements[0]?.ownerDocument.documentElement;
  // Isolation has no visible effect unless something blends.
  if (!root || (!clipped.length && !parsed.allElements.some(element => compositing(element).blend))) return [...objects.values()];
  const collect = async (parent: Element): Promise<FabricObject[]> => (await Promise.all(Array.from(parent.children).map(async element => {
    const { blend, isolate } = compositing(element);
    const object = objects.get(element);
    if (object) {
      if (blend) composite(object, blend, false);
      return [object];
    }
    const parts = element.localName === "g" ? await collect(element) : [];
    const clip = /^url\(#([^)]+)\)$/.exec(element.getAttribute(GROUP_CLIP) ?? "")?.[1];
    if (!parts.length || !(blend || clip || (isolate && parts.some(part => composited.has(part))))) return parts;
    // Fabric already applied any single-level clip and the group opacity to each part.
    const group = new Group(parts);
    if (clip) {
      const shape = await groupClip(element, source, clip);
      if (!shape) return [];
      // A new group is unrotated and unscaled, so its clip is offset only by the group's center.
      shape.setPositionByOrigin(shape.getCenterPoint().subtract(group.getCenterPoint()), "center", "center");
      group.clipPath = shape;
    }
    composite(group, blend, true);
    return [group];
  }))).flat();
  return collect(root);
}

/** Groups drawing parts, isolating the drawing when any part blends or clips as a group. */
export function drawingGroup(parts: FabricObject[]): Group {
  const group = new Group(parts);
  if (parts.some(part => composited.has(part))) composite(group, null, true);
  return group;
}
