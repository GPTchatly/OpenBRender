import type { ProjectObject } from "../project/schema";

export type ScientificElementKind =
  "cell" | "membrane" | "dna" | "panel" | "scale-bar";

const newId = () => globalThis.crypto.randomUUID();

const common = (
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
) => ({
  id: newId(),
  name,
  x,
  y,
  width,
  height,
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "#dff4f5",
  stroke: "#087f8c",
  strokeWidth: 2,
});

const ellipse = (
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "#dff4f5",
): ProjectObject => ({
  ...common(name, x, y, width, height),
  kind: "ellipse",
  fill,
});

const rect = (
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "#ffffff",
): ProjectObject => ({
  ...common(name, x, y, width, height),
  kind: "rect",
  fill,
});

const line = (
  name: string,
  x: number,
  y: number,
  width: number,
  angle = 0,
  stroke = "#35545a",
  strokeWidth = 2,
): ProjectObject => ({
  ...common(name, x, y, width, 1),
  kind: "line",
  angle,
  fill: null,
  stroke,
  strokeWidth,
  points: [0, 0.5, width, 0.5],
});

const text = (
  name: string,
  value: string,
  x: number,
  y: number,
  fontSize: number,
): ProjectObject => ({
  ...common(
    name,
    x,
    y,
    Math.max(20, value.length * fontSize * 0.62),
    fontSize * 1.3,
  ),
  kind: "text",
  text: value,
  fill: "#263238",
  stroke: null,
  strokeWidth: 0,
  fontFamily: "IBM Plex Sans",
  fontSize,
  fontWeight: 600,
  textAlign: "center",
});

const group = (
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  children: ProjectObject[],
): ProjectObject => ({
  ...common(name, x, y, width, height),
  kind: "group",
  fill: null,
  stroke: null,
  strokeWidth: 0,
  children,
});

function cell(x: number, y: number): ProjectObject {
  return group("Editable cell", x, y, 260, 190, [
    ellipse("Cell membrane", 0, 0, 250, 180, "#edf9f9"),
    ellipse("Nucleus", -35, -12, 78, 68, "#c8e8eb"),
    ellipse("Organelle 1", 58, -38, 50, 20, "#f8dca8"),
    ellipse("Organelle 2", 68, 34, 58, 22, "#f8dca8"),
    ellipse("Vesicle", -78, 45, 22, 22, "#d9c9ec"),
  ]);
}

function membrane(x: number, y: number): ProjectObject {
  const children: ProjectObject[] = [];
  for (let index = 0; index < 10; index += 1) {
    const headX = -117 + index * 26;
    children.push(ellipse(`Outer head ${index + 1}`, headX, -34, 13, 13));
    children.push(ellipse(`Inner head ${index + 1}`, headX, 34, 13, 13));
    children.push(line(`Outer tail ${index + 1}`, headX, -16, 30, 90));
    children.push(line(`Inner tail ${index + 1}`, headX, 16, 30, -90));
  }
  return group("Phospholipid bilayer", x, y, 260, 90, children);
}

function dna(x: number, y: number): ProjectObject {
  const children: ProjectObject[] = [];
  const height = 240, radius = 42, segments = 96;
  const strandX = (fraction: number) => radius * Math.sin(fraction * Math.PI * 4 - Math.PI / 2);
  // A schematic double helix: connected opposing backbones and paired rungs.
  // Each segment remains a native editable line, including after ungrouping.
  for (let index = 0; index < 24; index += 1) {
    const fraction = (index + 0.5) / 24;
    const offset = strandX(fraction), rowY = -height / 2 + fraction * height;
    children.push(line(`Base pair ${index + 1}, teal half`, offset / 2, rowY, Math.abs(offset), 0, '#087f8c', 3));
    children.push(line(`Base pair ${index + 1}, violet half`, -offset / 2, rowY, Math.abs(offset), 0, '#8657b5', 3));
  }
  for (const side of [1, -1]) {
    for (let index = 0; index < segments; index += 1) {
      const startX = side * strandX(index / segments);
      const endX = side * strandX((index + 1) / segments);
      const startY = -height / 2 + index / segments * height;
      const endY = -height / 2 + (index + 1) / segments * height;
      children.push(line(
        `${side === 1 ? 'Teal' : 'Violet'} backbone ${index + 1}`,
        (startX + endX) / 2, (startY + endY) / 2,
        Math.hypot(endX - startX, endY - startY),
        Math.atan2(endY - startY, endX - startX) * 180 / Math.PI,
        side === 1 ? '#087f8c' : '#8657b5', 5,
      ));
    }
  }
  return group("DNA double helix", x, y, 100, 250, children);
}

function figurePanel(x: number, y: number): ProjectObject {
  return group("Figure panel", x, y, 360, 270, [
    rect("Panel frame", 0, 0, 350, 260, "#ffffff"),
    text("Panel label", "A", -150, -105, 30),
  ]);
}

function scaleBar(x: number, y: number): ProjectObject {
  return group("Scale bar", x, y, 150, 36, [
    line("Scale line", 0, -5, 120, 0, "#263238", 5),
    text("Scale label", "10 µm", 0, 14, 15),
  ]);
}

export function createScientificElement(
  kind: ScientificElementKind,
  x: number,
  y: number,
): ProjectObject {
  if (kind === "cell") return cell(x, y);
  if (kind === "membrane") return membrane(x, y);
  if (kind === "dna") return dna(x, y);
  if (kind === "panel") return figurePanel(x, y);
  return scaleBar(x, y);
}
