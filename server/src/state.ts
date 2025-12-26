import {
  advanceRangeCursor,
  buildPrefixRanges,
  initRangeCursor,
  sanitizeFilter,
} from "./prefix.js";

const LIMIT = 20;

export const baseMax = 1_000_000;

export type SyncOps = {
  addIds?: number[];
  selectAdd?: number[];
  selectRemove?: number[];
  reorder?: { dragId: number; toIndex: number; filter?: string };
};

export type SyncViews = {
  left?: { filter?: string; afterId?: number; limit?: number };
  right?: { filter?: string; offset?: number; limit?: number };
};

export type SyncRejected = {
  addIds?: number[];
  selectAdd?: number[];
  selectRemove?: number[];
};

export const state = {
  addedIds: [] as number[],
  addedSet: new Set<number>(),
  selectedOrder: [] as number[],
  selectedSet: new Set<number>(),
  version: 0,
};

const matchesPrefix = (id: number, prefix: string) => {
  if (!prefix) return true;
  return String(id).startsWith(prefix);
};

const normalizeId = (value: unknown) =>
  Number.isFinite(value) ? Math.trunc(value as number) : NaN;

const normalizeNonNegative = (value: unknown) => {
  const num = normalizeId(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, num);
};

const insertSortedUnique = (arr: number[], value: number) => {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midVal = arr[mid];
    if (midVal === undefined) return false;
    if (midVal === value) return false;
    if (midVal < value) lo = mid + 1;
    else hi = mid;
  }
  arr.splice(lo, 0, value);
  return true;
};

const findAddedStart = (afterId: number) => {
  let lo = 0;
  let hi = state.addedIds.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const midVal = state.addedIds[mid];
    if (midVal === undefined) break;
    if (midVal <= afterId) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

const getNextAdded = (
  startIndex: number,
  filter: string,
  afterId: number
) => {
  let index = startIndex;
  while (index < state.addedIds.length) {
    const id = state.addedIds[index];
    if (id === undefined) break;
    if (id <= afterId) {
      index += 1;
      continue;
    }
    if (state.selectedSet.has(id)) {
      index += 1;
      continue;
    }
    if (!matchesPrefix(id, filter)) {
      index += 1;
      continue;
    }
    return { id, index };
  }
  return { id: null as number | null, index };
};

const getNextBase = (filter: string, afterId: number) => {
  const ranges = buildPrefixRanges(filter, baseMax);
  let cursor = initRangeCursor(ranges, afterId);
  const next = () => {
    while (cursor) {
      const value = cursor.value;
      if (!state.selectedSet.has(value)) {
        return value;
      }
      cursor = advanceRangeCursor(ranges, cursor);
    }
    return null;
  };
  const advance = () => {
    if (!cursor) return;
    cursor = advanceRangeCursor(ranges, cursor);
  };
  const peek = () => next();
  const consume = () => {
    const value = next();
    if (value === null) return null;
    advance();
    return value;
  };
  const hasNext = () => peek() !== null;
  return { peek, consume, hasNext };
};

export const applyOps = (ops: SyncOps) => {
  const rejected: SyncRejected = {};
  let changed = false;

  if (Array.isArray(ops.addIds)) {
    for (const raw of ops.addIds) {
      const id = normalizeId(raw);
      if (!Number.isFinite(id) || id <= baseMax) {
        rejected.addIds ??= [];
        rejected.addIds.push(raw as number);
        continue;
      }
      if (state.addedSet.has(id)) {
        rejected.addIds ??= [];
        rejected.addIds.push(id);
        continue;
      }
      state.addedSet.add(id);
      insertSortedUnique(state.addedIds, id);
      changed = true;
    }
  }

  if (Array.isArray(ops.selectAdd)) {
    for (const raw of ops.selectAdd) {
      const id = normalizeId(raw);
      if (!Number.isFinite(id) || id <= 0) {
        rejected.selectAdd ??= [];
        rejected.selectAdd.push(raw as number);
        continue;
      }
      const isBase = id <= baseMax;
      const isAdded = id > baseMax && state.addedSet.has(id);
      if (!isBase && !isAdded) {
        rejected.selectAdd ??= [];
        rejected.selectAdd.push(id);
        continue;
      }
      if (state.selectedSet.has(id)) continue;
      state.selectedSet.add(id);
      state.selectedOrder.push(id);
      changed = true;
    }
  }

  if (Array.isArray(ops.selectRemove)) {
    for (const raw of ops.selectRemove) {
      const id = normalizeId(raw);
      if (!Number.isFinite(id) || id <= 0) {
        rejected.selectRemove ??= [];
        rejected.selectRemove.push(raw as number);
        continue;
      }
      if (!state.selectedSet.has(id)) {
        rejected.selectRemove ??= [];
        rejected.selectRemove.push(id);
        continue;
      }
      state.selectedSet.delete(id);
      changed = true;
    }
    if (changed) {
      state.selectedOrder = state.selectedOrder.filter((id) =>
        state.selectedSet.has(id)
      );
    }
  }

  if (ops.reorder && Number.isFinite(ops.reorder.dragId)) {
    const dragId = normalizeId(ops.reorder.dragId);
    if (Number.isFinite(dragId) && state.selectedSet.has(dragId)) {
      const filter = sanitizeFilter(ops.reorder.filter);
      const filtered = state.selectedOrder.filter((id) =>
        matchesPrefix(id, filter)
      );
      const currentIndex = filtered.indexOf(dragId);
      if (currentIndex !== -1 && filtered.length > 0) {
        const targetIndex = Math.max(
          0,
          Math.min(normalizeNonNegative(ops.reorder.toIndex), filtered.length - 1)
        );
        filtered.splice(currentIndex, 1);
        filtered.splice(targetIndex, 0, dragId);
        let cursor = 0;
        state.selectedOrder = state.selectedOrder.map((id) => {
          if (!matchesPrefix(id, filter)) return id;
          const next = filtered[cursor];
          if (next === undefined) return id;
          cursor += 1;
          return next;
        });
        changed = true;
      }
    }
  }

  if (changed) state.version += 1;

  return { rejected };
};

export const getRightView = (views: SyncViews["right"]) => {
  const filter = sanitizeFilter(views?.filter);
  const offset = normalizeNonNegative(views?.offset);
  const filtered = filter
    ? state.selectedOrder.filter((id) => matchesPrefix(id, filter))
    : state.selectedOrder.slice();
  const total = filtered.length;
  const items = filtered.slice(offset, offset + LIMIT);
  return { items, total };
};

export const getLeftView = (views: SyncViews["left"]) => {
  const filter = sanitizeFilter(views?.filter);
  const afterId = normalizeNonNegative(views?.afterId);
  const baseIter = getNextBase(filter, afterId);
  let addedIndex = findAddedStart(afterId);
  const items: number[] = [];

  while (items.length < LIMIT) {
    const baseVal = baseIter.peek();
    const { id: addedVal, index } = getNextAdded(addedIndex, filter, afterId);
    if (baseVal === null && addedVal === null) break;
    if (addedVal === null || (baseVal !== null && baseVal < addedVal)) {
      const picked = baseIter.consume();
      if (picked !== null) items.push(picked);
    } else {
      items.push(addedVal);
      addedIndex = index + 1;
    }
  }

  const lastItem = items.length ? items[items.length - 1] : undefined;
  const lastAfterId = lastItem === undefined ? afterId : lastItem;
  const hasMore =
    items.length === LIMIT &&
    (baseIter.hasNext() ||
      getNextAdded(addedIndex, filter, lastAfterId).id !== null);
  const nextAfterId = hasMore && lastItem !== undefined ? lastItem : null;
  return { items, nextAfterId };
};
