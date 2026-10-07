import type { TMat2D } from '../../typedefs';
/**
 * given an array of 6 number returns something like `"matrix(...numbers)"`
 * @param {TMat2D} transform an array with 6 numbers
 * @return {String} transform matrix for svg
 */
export declare const matrixToSVG: (transform: TMat2D) => string;
