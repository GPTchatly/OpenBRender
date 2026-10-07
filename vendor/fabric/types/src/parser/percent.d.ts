/**
 * Will loosely accept as percent numbers that are not like
 * 3.4a%. This function does not check for the correctness of a percentage
 * but it checks that values that are in theory correct are or arent percentages
 */
export declare function isPercent(value: string | null): boolean | "" | null;
/**
 * Parse a percentage value in an svg.
 * @param value
 * @param fallback in case of not possible to parse the number
 * @returns ∈ [0, 1]
 */
export declare function parsePercent(value: string | number | null | undefined, valueIfNaN?: number): number;
