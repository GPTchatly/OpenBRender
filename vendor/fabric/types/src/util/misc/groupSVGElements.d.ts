import type { GroupProps } from '../../shapes/Group';
import type { FabricObject } from '../../shapes/Object/FabricObject';
/**
 * TODO experiment with different layout manager and svg results ( fixed fit content )
 * Groups SVG elements (usually those retrieved from SVG document)
 * @param {FabricObject[]} elements FabricObject(s) parsed from svg, to group
 * @return {FabricObject | Group}
 */
export declare const groupSVGElements: (elements: FabricObject[], options?: Partial<GroupProps>) => FabricObject<Partial<import("../../../fabric").FabricObjectProps>, import("../../../fabric").SerializedObjectProps, import("../../EventTypeDefs").ObjectEvents>;
