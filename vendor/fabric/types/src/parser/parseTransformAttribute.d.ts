import type { TMat2D } from '../typedefs';
/**
 * Parses "transform" attribute, returning an array of values
 * @param {String} attributeValue String containing attribute value
 * @return {TTransformMatrix} Array of 6 elements representing transformation matrix
 */
export declare function parseTransformAttribute(attributeValue: string): TMat2D;
