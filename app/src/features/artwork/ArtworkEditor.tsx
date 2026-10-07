import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, Blend, Circle, Copy, Eye, FlipHorizontal2, FlipVertical2, Group, Minus, PenTool, Plus, Redo2, RotateCw, Spline, Square, Trash2, Type, Undo2, X } from "lucide-react";
import { artworkDocument, artworkParts, editArtwork, type ArtworkOperation } from "../../domain/assets/artwork";
import { InputError } from "../../domain/security/input";
import type { ArtworkTarget } from "../../editor/FabricEditor";
import { useDialogBehavior } from "../../components/dialogs/useDialogBehavior";
import { FormField } from "../../components/ui/FormField";
import { IconButton } from "../../components/ui/IconButton";
import { ArtworkPreview, type ArtworkBounds } from "./ArtworkPreview";
import "./artwork.css";

interface Draft {svg: string; key: string | null}
interface History {past: Draft[]; current: Draft; future: Draft[]}
function boundedHistory(items: Draft[]): Draft[] {
  let bytes = 0;
  return items.slice(-50).reverse().filter(item => (bytes += item.svg.length * 2) <= 16_000_000).reverse();
}

function PaintField({label, value, onChange}: {label: string; value: string; onChange: (value: string) => void}) {
  return <div className="field"><span>{label}</span><div className="artwork-paint">
    <input type="color" aria-label={`${label} color`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={event => onChange(event.target.value)} />
    <input aria-label={`${label} value`} key={value} defaultValue={value} onBlur={event => { if (event.target.value !== value) onChange(event.target.value); }}
      onKeyDown={event => {if (event.key === "Enter") event.currentTarget.blur();}} />
    <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange("none")}>None</button>
  </div></div>;
}

export function ArtworkEditor({target, onClose, onApply}: {target: ArtworkTarget; onClose: () => void; onApply: (svg: string) => Promise<void>}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [history, setHistory] = useState<History>({past: [], current: {svg: target.svg, key: null}, future: []});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [bounds, setBounds] = useState<ArtworkBounds | null>(null);
  const [frame, setFrame] = useState<ArtworkBounds>({x: 0, y: 0, width: 100, height: 100});
  const {svg, key} = history.current;
  const dirty = svg !== target.svg;
  const close = () => { if (busy) return; if (dirty) setConfirmDiscard(true); else onClose(); };
  useDialogBehavior(dialogRef, close);
  useEffect(() => {
    if (confirmDiscard) dialogRef.current?.querySelector<HTMLButtonElement>("[data-keep-editing]")?.focus();
  }, [confirmDiscard]);
  const parts = useMemo(() => {
    const all = artworkParts(artworkDocument(svg).documentElement);
    return [...all.filter(part => part.tag !== "stop"), ...all.filter(part => part.tag === "stop")];
  }, [svg]);
  const selected = parts.find(part => part.key === key);
  const filtered = parts.filter(part => `${part.label} ${part.tag}`.toLowerCase().includes(search.toLowerCase()));
  const center: [number, number] = bounds ? [bounds.x + bounds.width/2, bounds.y + bounds.height/2] : [0, 0];
  const isShape = Boolean(selected && selected.tag !== "stop");

  const select = (key: string | null) => setHistory(current => ({...current, current: {...current.current, key}}));
  const edit = (operation: ArtworkOperation) => {
    if (busy) return;
    try {
      const next = editArtwork(svg, key, operation);
      if (next.svg !== svg) setHistory(current => ({past: boundedHistory([...current.past, current.current]), current: next, future: []}));
      setError(null);
    } catch (error) {
      setError(error instanceof InputError ? error.message : "That change is outside the supported artwork limits. Try a smaller value.");
    }
  };
  const undo = () => {
    setHistory(current => current.past.length ? {past: current.past.slice(0, -1), current: current.past.at(-1)!, future: boundedHistory([...current.future, current.current])} : current);
    setError(null);
  };
  const redo = () => {
    setHistory(current => current.future.length ? {past: boundedHistory([...current.past, current.current]), current: current.future.at(-1)!, future: current.future.slice(0, -1)} : current);
    setError(null);
  };
  const property = (name: Extract<ArtworkOperation, {type: "property"}>["name"], value: string) => edit({type: "property", name, value});
  const shortcuts = (event: KeyboardEvent<HTMLElement>) => {
    // Main-figure shortcuts must never operate on the figure underneath this editor.
    if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
    const input = (event.target as HTMLElement).matches("input, textarea, select");
    if (input || busy || confirmDiscard) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
    else if (mod && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
    else if (mod && event.key.toLowerCase() === "d" && isShape) { event.preventDefault(); edit({type: "duplicate"}); }
    else if ((event.key === "Delete" || event.key === "Backspace") && isShape) { event.preventDefault(); edit({type: "delete"}); }
    else if (event.key.startsWith("Arrow") && isShape) {
      event.preventDefault(); const step = event.shiftKey ? 10 : 1;
      edit({type: "move", x: event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0,
        y: event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0});
    }
  };
  const apply = async () => {
    if (busy || !dirty) return;
    setBusy(true); setError(null);
    try { await onApply(svg); onClose(); }
    catch (error) { setError(error instanceof InputError ? error.message : "Artwork could not be applied. Your draft is still open."); setBusy(false); }
  };

  return <div className="dialog-backdrop artwork-backdrop">
    <section className="artwork-editor" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="artwork-editor-title" onKeyDown={shortcuts} aria-busy={busy}>
      <header className="artwork-header">
        <div className="artwork-heading"><span className="artwork-mark"><PenTool /></span><div><h2 id="artwork-editor-title">Edit artwork</h2></div></div>
        <span className="artwork-name" title={target.object.name}>{target.object.name}</span>
        <span className="artwork-draft-state">{dirty ? "Unapplied changes" : "Original artwork"}</span>
        <IconButton label="Close artwork editor" onClick={close} disabled={busy}><X /></IconButton>
      </header>
      <div className="artwork-toolbar" inert={busy || confirmDiscard}>
        <div className="artwork-tool-group">
          <IconButton label="Undo artwork change" onClick={undo} disabled={!history.past.length}><Undo2 /></IconButton>
          <IconButton label="Redo artwork change" onClick={redo} disabled={!history.future.length}><Redo2 /></IconButton>
        </div>
        <div className="artwork-tool-group">
          {([{shape: "rect", label: "Add artwork rectangle", Icon: Square}, {shape: "ellipse", label: "Add artwork ellipse", Icon: Circle}, {shape: "text", label: "Add artwork text", Icon: Type}] as const).map(({shape, label, Icon}) =>
            <IconButton key={shape} label={label} onClick={() => edit({type: "add", shape, center: [frame.x+frame.width/2, frame.y+frame.height/2], size: Math.min(frame.width, frame.height)/4})}><Icon /></IconButton>)}
        </div>
        <div className="artwork-tool-group">
          <IconButton label="Duplicate part" disabled={!isShape} onClick={() => edit({type: "duplicate"})}><Copy /></IconButton>
          <IconButton label="Delete part" disabled={!isShape} onClick={() => edit({type: "delete"})}><Trash2 /></IconButton>
          <IconButton label="Lower part" disabled={!isShape} onClick={() => edit({type: "lower"})}><ArrowDown /></IconButton>
          <IconButton label="Raise part" disabled={!isShape} onClick={() => edit({type: "raise"})}><ArrowUp /></IconButton>
        </div>
        <div className="artwork-tool-group artwork-zoom">
          <IconButton label="Zoom artwork out" disabled={zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value-0.25))}><Minus /></IconButton>
          <button type="button" onClick={() => setZoom(1)} title="Fit artwork">{Math.round(zoom*100)}%</button>
          <IconButton label="Zoom artwork in" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value+0.25))}><Plus /></IconButton>
        </div>
      </div>
      <div className="artwork-body" inert={busy || confirmDiscard}>
        <aside className="artwork-parts" aria-label="Artwork parts">
          <div className="artwork-panel-heading"><h3>Parts</h3><span>{parts.length}</span></div>
          <input type="search" placeholder="Find a part…" aria-label="Search artwork parts" value={search} onChange={event => setSearch(event.target.value)} />
          <div className="artwork-part-list">
            {filtered.slice(0, 300).map(part => <button type="button" key={part.key} className={`artwork-part ${part.key === key ? "selected" : ""}`} aria-pressed={part.key === key}
              title={part.label} onClick={() => select(part.key)} style={{paddingLeft: 12 + Math.min(part.depth, 5)*12}}>
              <span className="artwork-part-symbol" aria-hidden="true">{part.tag === "g" ? <Group /> : part.tag === "stop" ? <Blend /> : <Spline />}</span>
              <span>{part.label}<small>{part.tag === "g" ? "Group" : part.tag}</small></span>{part.hidden && <Eye size={14} />}
            </button>)}
            {!filtered.length && <p className="artwork-hint">No matching parts.</p>}
            {filtered.length > 300 && <p className="artwork-hint">Showing 300 parts. Search to find more.</p>}
          </div>
          <p className="artwork-hint">Select a part here or directly in the artwork. Select a group to move its parts together.</p>
        </aside>
        <div className="artwork-workspace">
          <ArtworkPreview svg={svg} selected={key} zoom={zoom} onSelect={select} onEdit={edit} onBounds={setBounds} onFrame={setFrame} />
          <div className="artwork-canvas-caption">Drag to move · Arrow keys to nudge · Shift for 10 units</div>
        </div>
        <aside className="artwork-properties" aria-label="Artwork part properties">
          <div className="artwork-panel-heading"><h3>Part properties</h3></div>
          {!selected ? <div className="artwork-empty"><p>Select a shape to change its color, outline, position or size. You can also add shapes and labels.</p><p>Gradients are editable through their stops in the parts list.</p></div> : <>
            <div className="artwork-selected-name"><strong>{selected.label}</strong><small>{selected.tag}</small></div>
            <PaintField label={selected.tag === "stop" ? "Gradient color" : "Part fill"} value={selected.fill} onChange={value => property(selected.tag === "stop" ? "stop-color" : "fill", value)} />
            {isShape && <>
              <PaintField label="Part stroke" value={selected.stroke} onChange={value => property("stroke", value)} />
              <FormField label="Outline width"><input type="number" min="0" max="10000" step="0.5" key={`width-${key}-${selected.strokeWidth}`} defaultValue={parseFloat(selected.strokeWidth)} onBlur={event => {if (event.target.value !== selected.strokeWidth) property("stroke-width", event.target.value);}} /></FormField>
            </>}
            <FormField label={`Part opacity · ${Math.round(Number(selected.opacity)*100)}%`}><input type="range" min="0" max="1" step="0.05" value={selected.opacity} onChange={event => property(selected.tag === "stop" ? "stop-opacity" : "opacity", event.target.value)} /></FormField>
            {isShape && <>
              <div className="artwork-property-divider" />
              <div className="input-grid">
                {([4, 5] as const).map((index, axis) => <FormField key={index} label={`Offset ${axis ? "Y" : "X"}`}><input type="number" step="1" value={Number(selected.matrix[index].toFixed(2))} onChange={event => edit({type: "offset", x: axis ? selected.matrix[4] : event.target.valueAsNumber, y: axis ? event.target.valueAsNumber : selected.matrix[5]})} /></FormField>)}
                {bounds && bounds.width > 0 && bounds.height > 0 && (["width", "height"] as const).map((dimension, axis) => {
                  const size = bounds[dimension] * Math.hypot(selected.matrix[axis ? 2 : 0], selected.matrix[axis ? 3 : 1]);
                  return <FormField key={dimension} label={`Part ${dimension}`}><input key={`${key}-${size}`} type="number" min="0.01" step="1" defaultValue={Number(size.toFixed(2))} onBlur={event => {const next = event.target.valueAsNumber; if (Math.abs(next-size) > 0.005) edit({type: "scale", x: axis ? 1 : next/size, y: axis ? next/size : 1, center});}} /></FormField>;
                })}
              </div>
              <div className="artwork-transform-buttons">
                <IconButton label="Rotate part 15 degrees" onClick={() => edit({type: "rotate", degrees: 15, center})}><RotateCw /></IconButton>
                <IconButton label="Flip part horizontally" onClick={() => edit({type: "scale", x: -1, y: 1, center})}><FlipHorizontal2 /></IconButton>
                <IconButton label="Flip part vertically" onClick={() => edit({type: "scale", x: 1, y: -1, center})}><FlipVertical2 /></IconButton>
                <button type="button" className="button" onClick={() => edit({type: "hide"})}>{selected.hidden ? "Show part" : "Hide part"}</button>
              </div>
            </>}
            {selected.text !== null && <>
              <FormField label="Part text"><textarea aria-label="Part text" key={`${key}-${selected.text}`} defaultValue={selected.text} maxLength={10_000} onBlur={event => edit({type: "text", value: event.target.value})} /></FormField>
              <FormField label="Text size"><input type="number" min="1" max="10000" placeholder="Set size" onBlur={event => {if (event.target.value) property("font-size", event.target.value);}} /></FormField>
            </>}
            {selected.tag === "text" && selected.text === null && <p className="artwork-hint">This label contains styled text spans. Color and transform controls preserve that formatting.</p>}
            {selected.path !== null && <details className="artwork-path"><summary>Path geometry</summary><p>SVG path commands. Changes are validated before previewing.</p><form onSubmit={event => {event.preventDefault(); const value = new FormData(event.currentTarget).get("path"); if (typeof value === "string") property("d", value);}}>
              <textarea aria-label="Path commands" name="path" key={`${key}-${selected.path}`} defaultValue={selected.path} maxLength={1_000_000} spellCheck={false} />
              <button type="submit" className="button">Update path</button>
            </form></details>}
          </>}
        </aside>
      </div>
      {error && <div className="artwork-error" role="alert">{error}</div>}
      <footer className="artwork-footer">
        {confirmDiscard ? <><p>Discard unapplied artwork changes?</p><button type="button" className="button" data-keep-editing onClick={() => setConfirmDiscard(false)}>Keep editing</button><button type="button" className="button danger" onClick={onClose}>Discard changes</button></>
          : <><p>Applies to this copy in your figure.<small>Placement and overall size are preserved. Original artwork and credits are retained.</small></p>
            <button type="button" className="button" onClick={close} disabled={busy}>Cancel</button>
            <button type="button" className="button primary" onClick={() => void apply()} disabled={!dirty || busy}>{busy ? "Applying…" : "Apply to figure"}</button></>}
      </footer>
    </section>
  </div>;
}
