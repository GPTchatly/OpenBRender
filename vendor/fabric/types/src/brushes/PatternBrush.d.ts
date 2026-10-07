import type { Canvas } from '../canvas/Canvas';
import { PencilBrush } from './PencilBrush';
import type { TSimplePathData } from '../util/path/typedefs';
export declare class PatternBrush extends PencilBrush {
    source?: CanvasImageSource;
    constructor(canvas: Canvas);
    getPatternSrc(): HTMLCanvasElement;
    /**
     * Creates "pattern" instance property
     * @param {CanvasRenderingContext2D} ctx
     */
    getPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null;
    /**
     * Sets brush styles
     * @param {CanvasRenderingContext2D} ctx
     */
    _setBrushStyles(ctx: CanvasRenderingContext2D): void;
    /**
     * Creates path
     */
    createPath(pathData: TSimplePathData): import("../shapes/Path").Path<Partial<import("../shapes/Path").PathProps>, import("../shapes/Path").SerializedPathProps, import("../EventTypeDefs").ObjectEvents>;
}
