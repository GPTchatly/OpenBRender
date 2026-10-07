import { ColorMatrix, type ColorMatrixOwnProps } from './ColorMatrix';
import type { TWebGLPipelineState, T2DPipelineState } from './typedefs';
export type HueRotationOwnProps = ColorMatrixOwnProps & {
    rotation: number;
};
export type HueRotationSerializedProps = {
    rotation: number;
};
export declare const hueRotationDefaultValues: HueRotationOwnProps;
/**
 * HueRotation filter class
 * @example
 * const filter = new HueRotation({
 *   rotation: -0.5
 * });
 * object.filters.push(filter);
 * object.applyFilters();
 */
export declare class HueRotation extends ColorMatrix<'HueRotation', HueRotationOwnProps, HueRotationSerializedProps> {
    /**
     * HueRotation value, from -1 to 1.
     */
    rotation: HueRotationOwnProps['rotation'];
    static type: string;
    static defaults: HueRotationOwnProps;
    calculateMatrix(): void;
    isNeutralState(): boolean;
    applyTo(options: TWebGLPipelineState | T2DPipelineState): void;
    toObject(): {
        type: "HueRotation";
        rotation: number;
    };
}
