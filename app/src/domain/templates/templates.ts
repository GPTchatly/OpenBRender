import { createProject } from "../project/factory";
import type { OpenBioFigureProject, ProjectObject } from "../project/schema";

export type FigureTemplateId =
  | "experimental-workflow"
  | "comparison-panels"
  | "microscopy-grid"
  | "pathway-mechanism"
  | "treatment-timeline"
  | "graphical-abstract";

export interface FigureTemplate {
  id: FigureTemplateId;
  title: string;
  description: string;
  width: number;
  height: number;
  preview:
    | "workflow"
    | "comparison"
    | "microscopy"
    | "pathway"
    | "timeline"
    | "abstract";
}

export const FIGURE_TEMPLATES: FigureTemplate[] = [
  {
    id: "experimental-workflow",
    title: "Experimental workflow",
    description: "Four editable steps with directional flow",
    width: 1600,
    height: 900,
    preview: "workflow",
  },
  {
    id: "comparison-panels",
    title: "Comparison A/B",
    description: "Two labeled panels for conditions or groups",
    width: 1200,
    height: 800,
    preview: "comparison",
  },
  {
    id: "microscopy-grid",
    title: "Microscopy grid",
    description: "Four labeled image panels with scale bars",
    width: 1200,
    height: 1000,
    preview: "microscopy",
  },
  {
    id: "pathway-mechanism",
    title: "Pathway mechanism",
    description: "Signal, receptor, pathway, and cellular response",
    width: 1600,
    height: 900,
    preview: "pathway",
  },
  {
    id: "treatment-timeline",
    title: "Treatment timeline",
    description: "Editable study events across a clear time axis",
    width: 1600,
    height: 900,
    preview: "timeline",
  },
  {
    id: "graphical-abstract",
    title: "Graphical abstract",
    description: "Question, method, and finding in three concise stages",
    width: 1800,
    height: 1000,
    preview: "abstract",
  },
];

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
  strokeWidth: 2,
});

function rect(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "#ffffff",
): ProjectObject {
  return { ...common(name, x, y, width, height), kind: "rect", fill };
}

function ellipse(
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = "#dff4f5",
): ProjectObject {
  return { ...common(name, x, y, width, height), kind: "ellipse", fill };
}

function text(
  name: string,
  value: string,
  x: number,
  y: number,
  fontSize = 26,
  width = Math.max(80, value.length * fontSize * 0.62),
): ProjectObject {
  return {
    ...common(name, x, y, width, fontSize * 1.3),
    kind: "text",
    text: value,
    fill: "#263238",
    stroke: null,
    strokeWidth: 0,
    fontFamily: "IBM Plex Sans",
    fontSize,
    fontWeight: name === "Figure title" ? 600 : 500,
    textAlign: "center",
  };
}

function arrow(
  name: string,
  x: number,
  y: number,
  width: number,
): ProjectObject {
  return {
    ...common(name, x, y, width, 3),
    kind: "arrow",
    fill: "#35545a",
    stroke: "#35545a",
    strokeWidth: 3,
    points: [0, 1.5, width, 1.5],
  };
}

function line(
  name: string,
  x: number,
  y: number,
  width: number,
  stroke = "#ffffff",
): ProjectObject {
  return {
    ...common(name, x, y, width, 4),
    kind: "line",
    fill: null,
    stroke,
    strokeWidth: 4,
    points: [0, 2, width, 2],
  };
}

function workflowObjects(): ProjectObject[] {
  const steps = ["Sample", "Prepare", "Measure", "Analyze"];
  const objects: ProjectObject[] = [
    text("Figure title", "Experimental workflow", 800, 105, 42),
  ];
  steps.forEach((label, index) => {
    const x = 245 + index * 370;
    objects.push(ellipse(`${label} step`, x, 420, 220, 150));
    objects.push(text(`${label} label`, label, x, 420, 25));
    objects.push(
      text(`${label} caption`, "Add method detail", x, 555, 18, 210),
    );
    if (index < steps.length - 1)
      objects.push(arrow(`Step ${index + 1} connector`, x + 190, 420, 130));
  });
  return objects;
}

function comparisonObjects(): ProjectObject[] {
  return [
    text("Figure title", "Condition comparison", 600, 70, 38),
    rect("Panel A", 320, 390, 500, 520, "#f7fafb"),
    rect("Panel B", 880, 390, 500, 520, "#f7fafb"),
    text("Panel A label", "A", 95, 155, 32),
    text("Panel B label", "B", 655, 155, 32),
    text("Condition A", "Control", 320, 180, 25),
    text("Condition B", "Treatment", 880, 180, 25),
    ellipse("Control placeholder", 320, 390, 190, 190),
    ellipse("Treatment placeholder", 880, 390, 190, 190, "#fae8c8"),
    text("Panel A caption", "Add observation", 320, 620, 18),
    text("Panel B caption", "Add observation", 880, 620, 18),
  ];
}

function microscopyObjects(): ProjectObject[] {
  const objects: ProjectObject[] = [
    text("Figure title", "Microscopy figure", 600, 58, 36),
  ];
  const panels = [
    ["A", 325, 300],
    ["B", 875, 300],
    ["C", 325, 740],
    ["D", 875, 740],
  ] as const;
  panels.forEach(([label, x, y]) => {
    objects.push(rect(`Panel ${label}`, x, y, 500, 380, "#263238"));
    objects.push(text(`Panel ${label} label`, label, x - 215, y - 155, 28));
    objects.push(text(`Panel ${label} placeholder`, "Image", x, y, 23));
    objects.push(line(`Panel ${label} scale bar`, x + 155, y + 145, 110));
  });
  return objects;
}

function pathwayObjects(): ProjectObject[] {
  return [
    text("Figure title", "Signaling mechanism", 800, 85, 40),
    text("Signal label", "Signal", 210, 320, 23),
    ellipse("Signal", 210, 410, 120, 120, "#fae8c8"),
    arrow("Signal to receptor", 290, 410, 180),
    rect("Receptor", 540, 410, 190, 120, "#dff4f5"),
    text("Receptor label", "Receptor", 540, 410, 23),
    arrow("Receptor to kinase", 650, 410, 150),
    ellipse("Kinase", 870, 410, 150, 110, "#e8e6f8"),
    text("Kinase label", "Kinase", 870, 410, 22),
    arrow("Kinase to response", 965, 410, 150),
    rect("Response", 1240, 410, 260, 150, "#e1f1e7"),
    text("Response label", "Cell response", 1240, 410, 23),
    text(
      "Mechanism note",
      "Add regulators, evidence, and conditions",
      800,
      675,
      19,
    ),
  ];
}

function timelineObjects(): ProjectObject[] {
  const objects: ProjectObject[] = [
    text("Figure title", "Treatment timeline", 800, 90, 40),
    line("Study timeline", 190, 450, 1220, "#35545a"),
  ];
  const events = [
    ["Baseline", "Day 0"],
    ["Dose", "Day 3"],
    ["Sample", "Day 7"],
    ["Endpoint", "Day 14"],
  ] as const;
  events.forEach(([label, time], index) => {
    const x = 260 + index * 360;
    objects.push(ellipse(`${label} marker`, x, 450, 44, 44, "#0f766e"));
    objects.push(text(`${label} label`, label, x, 350, 23));
    objects.push(text(`${label} time`, time, x, 520, 18));
    objects.push(text(`${label} note`, "Add detail", x, 590, 17));
  });
  return objects;
}

function graphicalAbstractObjects(): ProjectObject[] {
  const stages = [
    ["Question", "State the biological question", "#f7fafb"],
    ["Method", "Show the experimental approach", "#dff4f5"],
    ["Finding", "Summarize the main result", "#e1f1e7"],
  ] as const;
  const objects: ProjectObject[] = [
    text("Figure title", "Graphical abstract", 900, 85, 42),
  ];
  stages.forEach(([label, caption, fill], index) => {
    const x = 335 + index * 565;
    objects.push(rect(`${label} stage`, x, 500, 450, 620, fill));
    objects.push(text(`${label} heading`, label, x, 255, 29));
    objects.push(ellipse(`${label} visual`, x, 470, 210, 180));
    objects.push(text(`${label} caption`, caption, x, 690, 20, 360));
    if (index < stages.length - 1)
      objects.push(arrow(`${label} connector`, x + 250, 500, 100));
  });
  return objects;
}

const templateObjects: Record<FigureTemplateId, () => ProjectObject[]> = {
  "experimental-workflow": workflowObjects,
  "comparison-panels": comparisonObjects,
  "microscopy-grid": microscopyObjects,
  "pathway-mechanism": pathwayObjects,
  "treatment-timeline": timelineObjects,
  "graphical-abstract": graphicalAbstractObjects,
};

export function createTemplateProject(
  templateId: FigureTemplateId,
): OpenBioFigureProject {
  const template = FIGURE_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown figure template: ${templateId}`);
  const project = createProject("custom", {
    width: template.width,
    height: template.height,
  });
  project.metadata.title = template.title;
  project.document.preset = `template:${template.id}`;
  project.objects = templateObjects[templateId]();
  return project;
}
