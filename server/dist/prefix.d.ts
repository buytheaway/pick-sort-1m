export type PrefixRange = {
    start: number;
    end: number;
};
export type RangeCursor = {
    rangeIndex: number;
    value: number;
};
export declare const sanitizeFilter: (value?: string) => string;
export declare const buildPrefixRanges: (prefix: string, maxValue: number) => PrefixRange[];
export declare const initRangeCursor: (ranges: PrefixRange[], afterId: number) => RangeCursor | null;
export declare const advanceRangeCursor: (ranges: PrefixRange[], cursor: RangeCursor) => RangeCursor | null;
//# sourceMappingURL=prefix.d.ts.map