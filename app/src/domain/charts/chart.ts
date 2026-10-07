import type { ProjectObject } from "../project/schema";

export type ChartKind = "bar" | "line";

export interface ChartSpec {
  kind: ChartKind;
  title: string;
  labels: string[];
  values: number[];
}

const palette = ["#087f8c", "#d68c45", "#6f58a8", "#4f8a5b", "#b45757"];
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
  fill: "#ffffff",
  stroke: "#35545a",
  strokeWidth: 1.5,
});

function line(
  name: string,
  x: number,
  y: number,
  width: number,
  angle = 0,
  stroke = "#35545a",
): ProjectObject {
  return {
    ...common(name, x, y, Math.max(width, 0.1), 1),
    kind: "line",
    angle,
    fill: null,
    stroke,
    points: [0, 0.5, Math.max(width, 0.1), 0.5],
  };
}

function rect(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
): ProjectObject {
  return {
    ...common(name, x, y, width, height),
    kind: "rect",
    fill,
    stroke: fill,
  };
}

function ellipse(
  name: string,
  x: number,
  y: number,
  size: number,
  fill: string,
): ProjectObject {
  return {
    ...common(name, x, y, size, size),
    kind: "ellipse",
    fill,
    stroke: "#ffffff",
    strokeWidth: 1,
  };
}

function text(
  name: string,
  value: string,
  x: number,
  y: number,
  fontSize: number,
): ProjectObject {
  return {
    ...common(
      name,
      x,
      y,
      Math.max(30, value.length * fontSize * 0.58),
      fontSize * 1.3,
    ),
    kind: "text",
    text: value,
    fill: "#263238",
    stroke: null,
    strokeWidth: 0,
    fontFamily: "IBM Plex Sans",
    fontSize,
    fontWeight: name === "Chart title" ? 600 : 400,
    textAlign: "center",
  };
}

export function validateChartSpec(spec: ChartSpec): string | null {
  if (!spec.title.trim()) return "Add a chart title.";
  if (spec.labels.length < 2 || spec.labels.length > 20)
    return "Use between 2 and 20 data points.";
  if (spec.labels.length !== spec.values.length)
    return "Labels and values must contain the same number of items.";
  if (spec.labels.some((label) => !label.trim()))
    return "Every data point needs a label.";
  if (spec.values.some((value) => !Number.isFinite(value) || value < 0))
    return "Values must be finite numbers greater than or equal to zero.";
  if (Math.max(...spec.values) === 0)
    return "At least one value must be above zero.";
  return null;
}

export function createChartObject(
  spec: ChartSpec,
  x: number,
  y: number,
): ProjectObject {
  const error = validateChartSpec(spec);
  if (error) throw new Error(error);

  const width = 560;
  const height = 400;
  const plotLeft = -220;
  const plotRight = 230;
  const plotTop = -130;
  const plotBottom = 125;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;
  const max = Math.max(...spec.values);
  const slot = plotWidth / spec.values.length;
  const children: ProjectObject[] = [
    text("Chart title", spec.title.trim(), 0, -178, 24),
    line("X axis", 5, plotBottom, plotWidth),
    line("Y axis", plotLeft, -2.5, plotHeight, -90),
    text("Maximum value", String(max), plotLeft - 26, plotTop, 12),
    text("Zero", "0", plotLeft - 18, plotBottom, 12),
  ];

  const points = spec.values.map((value, index) => ({
    x: plotLeft + slot * (index + 0.5),
    y: plotBottom - (value / max) * plotHeight,
    value,
    label: spec.labels[index]!,
  }));

  points.forEach((point, index) => {
    const color = palette[index % palette.length]!;
    if (spec.kind === "bar") {
      const barHeight = plotBottom - point.y;
      children.push(
        rect(
          `${point.label} bar`,
          point.x,
          plotBottom - barHeight / 2,
          Math.max(12, slot * 0.58),
          Math.max(1, barHeight),
          color,
        ),
      );
      children.push(
        text(
          `${point.label} value`,
          String(point.value),
          point.x,
          point.y - 14,
          12,
        ),
      );
    } else {
      if (index > 0) {
        const previous = points[index - 1]!;
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        children.push(
          line(
            `${previous.label} to ${point.label}`,
            (previous.x + point.x) / 2,
            (previous.y + point.y) / 2,
            Math.hypot(dx, dy),
            (Math.atan2(dy, dx) * 180) / Math.PI,
            "#087f8c",
          ),
        );
      }
      children.push(
        ellipse(`${point.label} point`, point.x, point.y, 13, color),
      );
    }
    children.push(text(`${point.label} label`, point.label, point.x, 151, 12));
  });

  return {
    ...common(
      `${spec.kind === "bar" ? "Bar" : "Line"} chart`,
      x,
      y,
      width,
      height,
    ),
    kind: "group",
    fill: null,
    stroke: null,
    strokeWidth: 0,
    children,
  };
}
