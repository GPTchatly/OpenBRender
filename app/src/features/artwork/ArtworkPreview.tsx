import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { artworkDocument, artworkElement, artworkParts, type ArtworkOperation } from "../../domain/assets/artwork";

export interface ArtworkBounds { x: number; y: number; width: number; height: number }
interface Props {
  svg: string;
  selected: string | null;
  zoom: number;
  onSelect: (key: string | null) => void;
  onEdit: (operation: ArtworkOperation) => void;
  onBounds: (bounds: ArtworkBounds | null) => void;
  onFrame: (bounds: ArtworkBounds) => void;
}

export function ArtworkPreview({svg, selected, zoom, onSelect, onEdit, onBounds, onFrame}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{pointer: number; key: string; start: DOMPoint; inverse: DOMMatrix; transform: string; dx: number; dy: number} | null>(null);
  const [outline, setOutline] = useState<ArtworkBounds | null>(null);
  const frameRef = useRef<ArtworkBounds>({x: 0, y: 0, width: 100, height: 100});
  const callbacks = useRef({onBounds, onFrame});
  callbacks.current = {onBounds, onFrame};

  useLayoutEffect(() => {
    const host = hostRef.current!;
    const doc = artworkDocument(svg);
    const root = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
    // Only strictly validated SVG reaches the document. IDs are scoped to this
    // preview so artwork references cannot resolve into the surrounding app.
    const prefix = `preview-${crypto.randomUUID()}-`;
    for (const element of [root, ...root.querySelectorAll("*")]) {
      if (element.id) element.setAttribute("id", prefix + element.id);
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.value.includes("url(#")) element.setAttribute(attribute.name,
          attribute.value.replace(/url\(#([^)]*)\)/g, `url(#${prefix}$1)`));
      }
    }
    for (const part of artworkParts(doc.documentElement)) {
      if (part.tag !== "stop") {
        const node = artworkElement(root, part.key);
        node.setAttribute("data-artwork-key", part.key);
        // This affects hit testing only; hidden parts remain reachable in the list.
        (node as SVGElement).style.pointerEvents = "visiblePainted";
      }
    }
    root.style.width = "100%";
    root.style.height = "100%";
    root.style.overflow = "visible";
    root.setAttribute("aria-label", "Editable artwork preview");
    host.replaceChildren(root);
    const box = root.viewBox.baseVal;
    const geometry = root.getBBox();
    const width = root.width.baseVal.value, height = root.height.baseVal.value;
    const frame = box.width > 0 && box.height > 0 ? {x: box.x, y: box.y, width: box.width, height: box.height}
      : width > 0 && height > 0 && root.hasAttribute("width") && root.hasAttribute("height") ? {x: 0, y: 0, width, height}
      : {x: geometry.x, y: geometry.y, width: Math.max(geometry.width, 1), height: Math.max(geometry.height, 1)};
    frameRef.current = frame;
    root.setAttribute("viewBox", `${frame.x} ${frame.y} ${frame.width} ${frame.height}`);
    callbacks.current.onFrame(frame);
    return () => { host.replaceChildren(); };
  }, [svg]);

  useLayoutEffect(() => {
    const host = hostRef.current!, viewport = viewportRef.current!;
    const measure = () => {
      const frame = frameRef.current;
      const ratio = frame.width / frame.height;
      const width = Math.max(80, Math.min(viewport.clientWidth - 100, (viewport.clientHeight - 100) * ratio));
      host.style.width = `${width * zoom}px`;
      host.style.height = `${width * zoom / ratio}px`;
      const root = host.firstElementChild;
      const node = root && selected ? artworkElement(root, selected) : null;
      if (!(node instanceof SVGGraphicsElement)) { setOutline(null); callbacks.current.onBounds(null); return; }
      const local = node.getBBox();
      callbacks.current.onBounds({x: local.x, y: local.y, width: local.width, height: local.height});
      const rect = node.getBoundingClientRect(), area = viewport.getBoundingClientRect();
      setOutline(rect.width || rect.height ? {x: rect.left-area.left+viewport.scrollLeft, y: rect.top-area.top+viewport.scrollTop, width: rect.width, height: rect.height} : null);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [svg, selected, zoom]);

  const start = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const hit = (event.target as Element).closest<SVGGraphicsElement>("[data-artwork-key]");
    if (!hit) { onSelect(null); return; }
    // A group selected in the parts list can be moved by dragging any child.
    const root = hostRef.current!.firstElementChild!;
    const current = selected ? artworkElement(root, selected) : null;
    const node = current instanceof SVGGraphicsElement && current.localName === "g" && current.contains(hit) ? current : hit;
    const key = node.getAttribute("data-artwork-key")!;
    onSelect(key);
    const matrix = (node.parentElement as unknown as SVGGraphicsElement).getScreenCTM();
    if (!matrix || matrix.a*matrix.d-matrix.b*matrix.c === 0) return;
    const inverse = matrix.inverse();
    drag.current = {pointer: event.pointerId, key, start: new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse), inverse,
      transform: node.getAttribute("transform") ?? "", dx: 0, dy: 0};
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(active.inverse);
    active.dx = point.x-active.start.x;
    active.dy = point.y-active.start.y;
    const node = artworkElement(hostRef.current!.firstElementChild!, active.key);
    node.setAttribute("transform", `translate(${active.dx} ${active.dy}) ${active.transform}`);
    setOutline(null);
  };
  const finish = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const active = drag.current;
    if (!active || active.pointer !== event.pointerId) return;
    drag.current = null;
    const node = artworkElement(hostRef.current!.firstElementChild!, active.key);
    if (active.transform) node.setAttribute("transform", active.transform); else node.removeAttribute("transform");
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!cancel && (Math.abs(active.dx) > 0.001 || Math.abs(active.dy) > 0.001)) onEdit({type: "move", x: active.dx, y: active.dy});
  };

  return <div className="artwork-viewport" ref={viewportRef} onPointerDown={start} onPointerMove={move}
    onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}>
    <div className="artwork-stage"><div className="artwork-paper" ref={hostRef} /></div>
    {outline && <div className="artwork-selection" style={{left: outline.x, top: outline.y, width: outline.width, height: outline.height}} />}
  </div>;
}
