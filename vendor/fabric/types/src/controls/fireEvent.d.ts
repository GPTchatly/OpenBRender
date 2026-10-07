import type { ObjectModificationEvents, TModificationEvents } from '../EventTypeDefs';
export declare const fireEvent: (eventName: TModificationEvents, options: ObjectModificationEvents[typeof eventName]) => void;
