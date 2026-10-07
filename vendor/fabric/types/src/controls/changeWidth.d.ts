import type { TransformActionHandler } from '../EventTypeDefs';
export declare const changeObjectDimensionGen: (dimension: "width" | "height", origin: "originX" | "originY", xorY: "x" | "y", scale: "scaleX" | "scaleY") => TransformActionHandler;
/**
 * Action handler to change object's width
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * You want to use this only if you are building a new control handler and you want
 * to reuse some logic. use "changeWidth" if you are looking to just use a control for width
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @return {Boolean} true if some change happened
 */
export declare const changeObjectWidth: TransformActionHandler;
/**
 * Action handler to change object's height
 * Needs to be wrapped with `wrapWithFixedAnchor` to be effective
 * You want to use this only if you are building a new control handler and you want
 * to reuse some logic. use "changeHeight" if you are looking to just use a control for height
 * @param {Event} eventData javascript event that is doing the transform
 * @param {Object} transform javascript object containing a series of information around the current transform
 * @param {number} x current mouse x position, canvas normalized
 * @param {number} y current mouse y position, canvas normalized
 * @return {Boolean} true if some change happened
 */
export declare const changeObjectHeight: TransformActionHandler;
/**
 * Control handler for changing width
 */
export declare const changeWidth: TransformActionHandler<import("../EventTypeDefs").Transform>;
/**
 * Control handler for changing height
 */
export declare const changeHeight: TransformActionHandler<import("../EventTypeDefs").Transform>;
