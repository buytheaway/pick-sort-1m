export const sanitizeFilter = (value) => {
    if (!value)
        return "";
    const digits = value.replace(/\D/g, "");
    return digits;
};
export const buildPrefixRanges = (prefix, maxValue) => {
    if (!prefix)
        return [{ start: 1, end: maxValue }];
    if (prefix.startsWith("0"))
        return [];
    const prefixNum = Number(prefix);
    const maxLen = String(maxValue).length;
    const prefixLen = prefix.length;
    const ranges = [];
    for (let extra = 0; extra <= maxLen - prefixLen; extra += 1) {
        const pow = 10 ** extra;
        let start = prefixNum * pow;
        let end = (prefixNum + 1) * pow - 1;
        if (end < 1 || start > maxValue)
            continue;
        if (start < 1)
            start = 1;
        if (end > maxValue)
            end = maxValue;
        ranges.push({ start, end });
    }
    return ranges;
};
export const initRangeCursor = (ranges, afterId) => {
    for (let i = 0; i < ranges.length; i += 1) {
        const range = ranges[i];
        if (!range)
            continue;
        if (afterId < range.start)
            return { rangeIndex: i, value: range.start };
        if (afterId >= range.start && afterId < range.end) {
            return { rangeIndex: i, value: afterId + 1 };
        }
    }
    return null;
};
export const advanceRangeCursor = (ranges, cursor) => {
    let rangeIndex = cursor.rangeIndex;
    let value = cursor.value + 1;
    while (rangeIndex < ranges.length) {
        const range = ranges[rangeIndex];
        if (!range) {
            rangeIndex += 1;
            continue;
        }
        if (value <= range.end)
            return { rangeIndex, value };
        rangeIndex += 1;
        if (rangeIndex >= ranges.length)
            break;
        const nextRange = ranges[rangeIndex];
        if (!nextRange)
            continue;
        value = nextRange.start;
    }
    return null;
};
//# sourceMappingURL=prefix.js.map