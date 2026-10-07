import { type XY } from '../../../Point';
import type { TProjection, TProjectStrokeOnPointsOptions } from './types';
export type * from './types';
/**
 *
 * Used to calculate object's bounding box
 *
 * @see https://github.com/fabricjs/fabric.js/pull/8344
 *
 */
export declare const projectStrokeOnPoints: (points: XY[], options: TProjectStrokeOnPointsOptions, openPath?: boolean) => TProjection[];
