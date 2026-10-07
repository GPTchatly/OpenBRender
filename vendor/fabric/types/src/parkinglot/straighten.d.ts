import { FabricObject } from '../shapes/Object/FabricObject';
import { TDegree } from '../typedefs';
export interface StraightenableFabricObject extends FabricObject {
    FX_DURATION: number;
    _getAngleValueForStraighten(): number;
    straighten(): void;
    fxStraighten(callbacks?: {
        onChange?(value: TDegree): any;
        onComplete?(): any;
    }): () => void;
}
