import { preflightXml } from "../assets/strictSvg";
import { InputError } from "../security/input";

// Fabric repeats imported object IDs and emits paint definitions per object.
// Normalize only its export output. Private imports still reject duplicate IDs.
export function normalizeFabricSvgIdentifiers(svg: string): string {
  preflightXml(svg);
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new InputError("invalid_svg", "The exported SVG is invalid.");
  const elements = Array.from(doc.querySelectorAll("*"));
  const definitions = elements.filter(el => ["linearGradient", "radialGradient", "clipPath"].includes(el.localName) && el.hasAttribute("id"));
  const originalIds = new Map(definitions.map(el => [el, el.getAttribute("id")]));
  const definitionsById = new Map<string, Element[]>();
  for (const element of definitions) {
    const id = originalIds.get(element)!;
    definitionsById.set(id, [...(definitionsById.get(id) ?? []), element]);
  }
  const names = new Map(definitions.map((el,i) => [el, "export_definition_" + i]));
  function ancestorDistance(from: Element, target: Element): number {
    let distance = 0;
    for (let parent: Element | null = from; parent; parent = parent.parentElement, distance++)
      if (parent.contains(target)) return distance;
    return Infinity;
  }
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      attribute.value = attribute.value.replace(/url\(#([A-Za-z_][A-Za-z0-9_.-]{0,127})\)/g, (_match, id: string) => {
        const candidates = (definitionsById.get(id) ?? [])
          .map(el => ({el, distance: ancestorDistance(element, el)})).sort((a,b) => a.distance - b.distance);
        if (!candidates.length || (candidates[1] && candidates[0]!.distance === candidates[1].distance))
          throw new InputError("ambiguous_svg", "The exported SVG contains an ambiguous paint or clipping reference.");
        return "url(#" + names.get(candidates[0]!.el) + ")";
      });
    }
    if (names.has(element)) element.setAttribute("id", names.get(element)!);
    else element.removeAttribute("id");
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}
