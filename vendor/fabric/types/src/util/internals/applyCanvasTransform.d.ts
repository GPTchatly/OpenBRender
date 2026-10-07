import type { StaticCanvas } from '../../canvas/StaticCanvas';
/**
 * Set the transform of the passed context to the same of a specific Canvas or StaticCanvas.
 * setTransform is used since this utility will RESET the ctx transform to the basic value
 * of retina scaling and viewport transform
 * It is not meant to be added to other transforms, it is used internally to prepare canvases to draw
 * @param ctx
 * @param canvas
 */
export declare const applyCanvasTransform: (ctx: CanvasRenderingContext2D, canvas: StaticCanvas) => void;
