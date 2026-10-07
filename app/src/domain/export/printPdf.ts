import { sanitizeSvg } from "../assets/sanitize";
import { parseProject, type OpenBioFigureProject } from "../project/schema";
import { buildSvgExport } from "./exporters";
let pageStyles: CSSStyleSheet | null = null;

export async function preparePdfPrint(canvasSvg: string, project: OpenBioFigureProject): Promise<void> {
  project = parseProject(project);
  const accepted = sanitizeSvg(buildSvgExport(canvasSvg, project)).svg;
  const parsed = new DOMParser().parseFromString(accepted, "image/svg+xml");
  const previous = document.getElementById("publication-print");
  previous?.remove();
  const scene = document.createElement("section");
  scene.id = "publication-print";
  scene.setAttribute("aria-hidden", "true");
  const svg = document.importNode(parsed.documentElement, true);
  scene.append(svg);
  document.body.append(scene);
  if (pageStyles) document.adoptedStyleSheets = document.adoptedStyleSheets.filter(sheet => sheet !== pageStyles);
  pageStyles = new CSSStyleSheet();
  const width = (project.document.width * 25.4 / 96).toFixed(4);
  const height = (project.document.height * 25.4 / 96).toFixed(4);
  pageStyles.replaceSync("@page {size: " + width + "mm " + height + "mm; margin: 0;}");
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, pageStyles];
  // Printed vector SVG uses the same locally bundled fonts; no remote converter is invoked.
  await document.fonts.ready;
}

export function openPdfPrintDialog(): void {
  window.print();
}
