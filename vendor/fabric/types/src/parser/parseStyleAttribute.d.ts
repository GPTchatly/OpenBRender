/**
 * Parses "style" attribute, retuning an object with values
 * @param {SVGElement} element Element to parse
 * @return {Object} Objects with values parsed from style attribute of an element
 */
export declare function parseStyleAttribute(element: HTMLElement | SVGElement): Record<string, any>;
