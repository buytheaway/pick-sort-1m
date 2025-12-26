export declare const baseMax = 1000000;
export type SyncOps = {
    addIds?: number[];
    selectAdd?: number[];
    selectRemove?: number[];
    reorder?: {
        dragId: number;
        toIndex: number;
        filter?: string;
    };
};
export type SyncViews = {
    left?: {
        filter?: string;
        afterId?: number;
        limit?: number;
    };
    right?: {
        filter?: string;
        offset?: number;
        limit?: number;
    };
};
export type SyncRejected = {
    addIds?: number[];
    selectAdd?: number[];
    selectRemove?: number[];
};
export declare const state: {
    addedIds: number[];
    addedSet: Set<number>;
    selectedOrder: number[];
    selectedSet: Set<number>;
    version: number;
};
export declare const applyOps: (ops: SyncOps) => {
    rejected: SyncRejected;
};
export declare const getRightView: (views: SyncViews["right"]) => {
    items: number[];
    total: number;
};
export declare const getLeftView: (views: SyncViews["left"]) => {
    items: number[];
    nextAfterId: number | null;
};
//# sourceMappingURL=state.d.ts.map