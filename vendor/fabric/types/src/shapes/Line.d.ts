import type { Abortable, TClassProperties, TOptions } from '../typedefs';
import { FabricObject } from './Object/FabricObject';
import { Point } from '../Point';
import type { FabricObjectProps, SerializedObjectProps } from './Object/types';
import type { ObjectEvents } from '../EventTypeDefs';
import type { CSSRules } from '../parser/typedefs';
interface UniqueLineProps {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}
export interface SerializedLineProps extends SerializedObjectProps, UniqueLineProps {
}
/**
 * A Class to draw a line
 * A bunch of methods will be added to Polyline to handle the line case
 * The line class is very strange to work with, is all special, it hardly aligns
 * to what a developer want everytime there is an angle
 * @deprecated
 */
export declare class Line<Props extends TOptions<FabricObjectProps> = Partial<FabricObjectProps>, SProps extends SerializedLineProps = SerializedLineProps, EventSpec extends ObjectEvents = ObjectEvents> extends FabricObject<Props, SProps, EventSpec> implements UniqueLineProps {
    /**
     * x value or first line edge
     * @type number
     */
    x1: number;
    /**
     * y value or first line edge
     * @type number
     */
    y1: number;
    /**
     * x value or second line edge
     * @type number
     */
    x2: number;
    /**
     * y value or second line edge
     * @type number
     */
    y2: number;
    static type: string;
    static cacheProperties: string[];
    /**
     * Constructor
     * @param {Array} [points] Array of points
     * @param {Object} [options] Options object
     * @return {Line} thisArg
     */
    constructor([x1, y1, x2, y2]?: [number, number, number, number], options?: Partial<Props>);
    /**
     * @private
     * @param {Object} [options] Options
     */
    _setWidthHeight(): void;
    /**
     * @private
     * @param {String} key
     * @param {*} value
     */
    _set(key: string, value: any): this;
    /**
     * @private
     * @param {CanvasRenderingContext2D} ctx Context to render on
     */
    _render(ctx: CanvasRenderingContext2D): void;
    /**
     * This function is an helper for svg import. it returns the center of the object in the svg
     * untransformed coordinates
     * @private
     * @return {Point} center point from element coordinates
     */
    _findCenterFromElement(): Point;
    /**
     * Returns object representation of an instance
     * @param {Array} [propertiesToInclude] Any properties that you might want to additionally include in the output
     * @return {Object} object representation of an instance
     */
    toObject<T extends Omit<Props & TClassProperties<this>, keyof SProps>, K extends keyof T = never>(propertiesToInclude?: K[]): Pick<T, K> & SProps;
    _getNonTransformedDimensions(): Point;
    /**
     * Recalculates line points given width and height
     * Those points are simply placed around the center,
     * This is not useful outside internal render functions and svg output
     * Is not meant to be for the developer.
     * @private
     */
    calcLinePoints(): UniqueLineProps;
    /**
     * Returns svg representation of an instance
     * @return {Array} an array of strings with the specific svg representation
     * of the instance
     */
    _toSVG(): string[];
    /**
     * List of attribute names to account for when parsing SVG element (used by {@link Line.fromElement})
     * @see http://www.w3.org/TR/SVG/shapes.html#LineElement
     */
    static ATTRIBUTE_NAMES: string[];
    /**
     * Returns Line instance from an SVG element
     * @param {HTMLElement} element Element to parse
     * @param {Object} [options] Options object
     * @param {Function} [callback] callback function invoked after parsing
     */
    static fromElement(element: HTMLElement, options?: Abortable, cssRules?: CSSRules): Promise<Line<{
        [x: string]: /*elided*/ any;
    }, SerializedLineProps, ObjectEvents>>;
    /**
     * Returns Line instance from an object representation
     * @param {Object} object Object to create an instance from
     * @returns {Promise<Line>}
     */
    static fromObject<T extends TOptions<SerializedLineProps>>({ x1, y1, x2, y2, ...object }: T): Promise<Line<Partial<FabricObjectProps>, SerializedLineProps, ObjectEvents>>;
}
export {};
