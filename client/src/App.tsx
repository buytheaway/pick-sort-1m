import { useEffect, useRef, useState } from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";
import { RequestQueue } from "./requestQueue";
import type { SyncRes } from "./api";
import "./App.css";

const PAGE_SIZE = 20;

type LeftRequest = {
  filter: string;
  afterId: number;
  mode: "replace" | "append";
};

type RightRequest = {
  filter: string;
  offset: number;
  mode: "replace" | "append";
};

type SortableRowProps = {
  id: number;
  label: string;
  onRemove: () => void;
  top: number;
};

const SortableRow = ({ id, label, onRemove, top }: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const extraTransform = CSS.Transform.toString(transform);
  const combinedTransform = extraTransform
    ? `translateY(${top}px) ${extraTransform}`
    : `translateY(${top}px)`;

  return (
    <div
      ref={setNodeRef}
      className={`row draggable ${isDragging ? "dragging" : ""}`}
      style={{ transform: combinedTransform, transition }}
      {...attributes}
      {...listeners}
    >
      <span className="row-id">{label}</span>
      <button
        className="row-action"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        Remove
      </button>
    </div>
  );
};

type LeftPanelProps = {
  filter: string;
  onFilterChange: (value: string) => void;
  items: number[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelect: (id: number) => void;
  addInput: string;
  onAddInputChange: (value: string) => void;
  onAddNew: () => void;
};

const LeftPanel = ({
  filter,
  onFilterChange,
  items,
  loading,
  hasMore,
  onLoadMore,
  onSelect,
  addInput,
  onAddInputChange,
  onAddNew,
}: LeftPanelProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 6,
  });

  const handleScroll = () => {
    const el = parentRef.current;
    if (!el || !hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      onLoadMore();
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Available IDs</h2>
          <p>Prefix filter, infinite scroll</p>
        </div>
        <div className="controls">
          <input
            className="filter"
            placeholder="Filter prefix"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
          />
          <div className="add-row">
            <input
              className="filter"
              placeholder="Add new ID"
              value={addInput}
              onChange={(event) => onAddInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onAddNew();
              }}
            />
            <button className="ghost" onClick={onAddNew}>
              Add new ID
            </button>
          </div>
        </div>
      </div>
      <div className="list" ref={parentRef} onScroll={handleScroll}>
        <div className="list-inner" style={{ height: rowVirtualizer.getTotalSize() }}>
          {rowVirtualizer.getVirtualItems().map((row) => {
            const id = items[row.index];
            if (id === undefined) return null;
            return (
              <div
                key={id}
                className="row"
                style={{ transform: `translateY(${row.start}px)` }}
              >
                <span className="row-id">{id}</span>
                <button className="row-action" onClick={() => onSelect(id)}>
                  Add to selected
                </button>
              </div>
            );
          })}
        </div>
        {loading && <div className="list-overlay">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="list-overlay">No matches</div>
        )}
      </div>
    </div>
  );
};

type RightPanelProps = {
  filter: string;
  onFilterChange: (value: string) => void;
  items: number[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRemove: (id: number) => void;
  onDragEnd: (event: DragEndEvent) => void;
};

const RightPanel = ({
  filter,
  onFilterChange,
  items,
  total,
  loading,
  hasMore,
  onLoadMore,
  onRemove,
  onDragEnd,
}: RightPanelProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 6,
  });

  const handleScroll = () => {
    const el = parentRef.current;
    if (!el || !hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      onLoadMore();
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h2>Selected IDs</h2>
          <p>Drag to reorder, click remove</p>
        </div>
        <div className="controls">
          <input
            className="filter"
            placeholder="Filter prefix"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
          />
          <div className="count">
            {items.length} / {total}
          </div>
        </div>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="list" ref={parentRef} onScroll={handleScroll}>
            <div
              className="list-inner"
              style={{ height: rowVirtualizer.getTotalSize() }}
            >
              {rowVirtualizer.getVirtualItems().map((row) => {
                const id = items[row.index];
                if (id === undefined) return null;
                return (
                  <SortableRow
                    key={id}
                    id={id}
                    label={String(id)}
                    top={row.start}
                    onRemove={() => onRemove(id)}
                  />
                );
              })}
            </div>
            {loading && <div className="list-overlay">Loading...</div>}
            {!loading && items.length === 0 && (
              <div className="list-overlay">Empty</div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

const buildRejectedMessage = (rejected: SyncRes["rejected"]) => {
  if (!rejected) return "";
  const parts: string[] = [];
  if (rejected.addIds?.length) {
    parts.push(`ID rejected: ${rejected.addIds.join(", ")}`);
  }
  if (rejected.selectAdd?.length) {
    parts.push(`Select rejected: ${rejected.selectAdd.join(", ")}`);
  }
  if (rejected.selectRemove?.length) {
    parts.push(`Remove rejected: ${rejected.selectRemove.join(", ")}`);
  }
  return parts.join(" | ");
};

function App() {
  const [leftFilter, setLeftFilter] = useState("");
  const [rightFilter, setRightFilter] = useState("");
  const [leftItems, setLeftItems] = useState<number[]>([]);
  const [leftAfterId, setLeftAfterId] = useState(0);
  const [leftHasMore, setLeftHasMore] = useState(true);
  const [leftLoading, setLeftLoading] = useState(true);
  const [rightItems, setRightItems] = useState<number[]>([]);
  const [rightOffset, setRightOffset] = useState(0);
  const [rightTotal, setRightTotal] = useState(0);
  const [rightHasMore, setRightHasMore] = useState(true);
  const [rightLoading, setRightLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [addInput, setAddInput] = useState("");
  const [rejectedMessage, setRejectedMessage] = useState("");

  const leftItemsRef = useRef<number[]>([]);
  const rightItemsRef = useRef<number[]>([]);
  const leftFilterRef = useRef(leftFilter);
  const rightFilterRef = useRef(rightFilter);
  const leftAfterIdRef = useRef(leftAfterId);
  const leftHasMoreRef = useRef(leftHasMore);
  const rightOffsetRef = useRef(rightOffset);
  const rightHasMoreRef = useRef(rightHasMore);
  const leftRequestRef = useRef<LeftRequest>({
    filter: "",
    afterId: 0,
    mode: "replace",
  });
  const rightRequestRef = useRef<RightRequest>({
    filter: "",
    offset: 0,
    mode: "replace",
  });

  useEffect(() => {
    leftItemsRef.current = leftItems;
  }, [leftItems]);

  useEffect(() => {
    rightItemsRef.current = rightItems;
  }, [rightItems]);

  useEffect(() => {
    leftFilterRef.current = leftFilter;
  }, [leftFilter]);

  useEffect(() => {
    rightFilterRef.current = rightFilter;
  }, [rightFilter]);

  useEffect(() => {
    leftAfterIdRef.current = leftAfterId;
  }, [leftAfterId]);

  useEffect(() => {
    leftHasMoreRef.current = leftHasMore;
  }, [leftHasMore]);

  useEffect(() => {
    rightOffsetRef.current = rightOffset;
  }, [rightOffset]);

  useEffect(() => {
    rightHasMoreRef.current = rightHasMore;
  }, [rightHasMore]);

  useEffect(() => {
    setLeftItems([]);
    setLeftAfterId(0);
    setLeftHasMore(true);
    setLeftLoading(true);
    leftRequestRef.current = {
      filter: leftFilter,
      afterId: 0,
      mode: "replace",
    };
  }, [leftFilter]);

  useEffect(() => {
    setRightItems([]);
    setRightOffset(0);
    setRightTotal(0);
    setRightHasMore(true);
    setRightLoading(true);
    rightRequestRef.current = {
      filter: rightFilter,
      offset: 0,
      mode: "replace",
    };
  }, [rightFilter]);

  const queueRef = useRef<RequestQueue | null>(null);
  useEffect(() => {
    const queue = new RequestQueue({
      getViews: () => {
        const left = leftRequestRef.current;
        const right = rightRequestRef.current;
        return {
          left: {
            filter: left.filter,
            afterId: left.afterId,
            limit: PAGE_SIZE,
          },
          right: {
            filter: right.filter,
            offset: right.offset,
            limit: PAGE_SIZE,
          },
        };
      },
      onData: (resp) => {
        setVersion(resp.version);
        setRejectedMessage("");
        const leftMode = leftRequestRef.current.mode;
        const rightMode = rightRequestRef.current.mode;

        if (resp.left) {
          const prevLeft = leftItemsRef.current;
          if (leftMode === "append") {
            const nextLeft = [...prevLeft, ...resp.left.items];
            setLeftItems(nextLeft);
            setLeftAfterId(resp.left.nextAfterId ?? leftAfterIdRef.current);
            setLeftHasMore(resp.left.nextAfterId !== null);
          } else if (prevLeft.length > PAGE_SIZE) {
            const merged = prevLeft.slice();
            for (let i = 0; i < resp.left.items.length; i += 1) {
              merged[i] = resp.left.items[i];
            }
            setLeftItems(merged);
            setLeftAfterId(leftAfterIdRef.current);
            setLeftHasMore(leftHasMoreRef.current);
          } else {
            setLeftItems(resp.left.items);
            setLeftAfterId(resp.left.nextAfterId ?? 0);
            setLeftHasMore(resp.left.nextAfterId !== null);
          }
          setLeftLoading(false);
        }

        if (resp.right) {
          const prevRight = rightItemsRef.current;
          if (rightMode === "append") {
            const nextRight = [...prevRight, ...resp.right.items];
            setRightItems(nextRight);
            setRightOffset(nextRight.length);
            setRightTotal(resp.right.total);
            setRightHasMore(nextRight.length < resp.right.total);
          } else if (prevRight.length > PAGE_SIZE) {
            let merged = prevRight.slice();
            for (let i = 0; i < resp.right.items.length; i += 1) {
              merged[i] = resp.right.items[i];
            }
            if (resp.right.total < merged.length) {
              merged = merged.slice(0, resp.right.total);
            }
            setRightItems(merged);
            setRightOffset(merged.length);
            setRightTotal(resp.right.total);
            setRightHasMore(merged.length < resp.right.total);
          } else {
            setRightItems(resp.right.items);
            setRightOffset(resp.right.items.length);
            setRightTotal(resp.right.total);
            setRightHasMore(resp.right.items.length < resp.right.total);
          }
          setRightLoading(false);
        }

        leftRequestRef.current = {
          filter: leftFilterRef.current,
          afterId: 0,
          mode: "replace",
        };
        rightRequestRef.current = {
          filter: rightFilterRef.current,
          offset: 0,
          mode: "replace",
        };

        if (resp.rejected) {
          setRejectedMessage(buildRejectedMessage(resp.rejected));
        }
      },
      onRejected: (rejected) => {
        setRejectedMessage(buildRejectedMessage(rejected));
      },
      onError: (error) => {
        setRejectedMessage(error);
      },
    });

    queueRef.current = queue;
    queue.start();
    return () => queue.stop();
  }, []);

  const handleLeftLoadMore = () => {
    if (leftLoading || !leftHasMore) return;
    setLeftLoading(true);
    leftRequestRef.current = {
      filter: leftFilter,
      afterId: leftAfterId,
      mode: "append",
    };
  };

  const handleRightLoadMore = () => {
    if (rightLoading || !rightHasMore) return;
    setRightLoading(true);
    rightRequestRef.current = {
      filter: rightFilter,
      offset: rightOffset,
      mode: "append",
    };
  };

  const queueSelectAdd = (id: number) => {
    queueRef.current?.enqueueSelectAdd(id);
    setLeftItems((prev) => prev.filter((item) => item !== id));
  };

  const queueSelectRemove = (id: number) => {
    queueRef.current?.enqueueSelectRemove(id);
    setRightItems((prev) => {
      const next = prev.filter((item) => item !== id);
      const nextTotal = Math.max(0, rightTotal - 1);
      setRightOffset(next.length);
      setRightTotal(nextTotal);
      setRightHasMore(next.length < nextTotal);
      return next;
    });
  };

  const queueAddNew = () => {
    const trimmed = addInput.trim();
    if (!trimmed) return;
    const id = Number(trimmed);
    if (!Number.isInteger(id) || id <= 1_000_000) return;
    queueRef.current?.enqueueAddId(id);
    setAddInput("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = rightItemsRef.current;
    const oldIndex = current.indexOf(active.id as number);
    const newIndex = current.indexOf(over.id as number);
    if (oldIndex === -1 || newIndex === -1) return;
    setRightItems(arrayMove(current, oldIndex, newIndex));
    queueRef.current?.enqueueReorder(active.id as number, newIndex, rightFilter);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <div className="title">Pick/Sort 1M</div>
          <div className="subtitle">Shared in-memory state</div>
        </div>
        <div className="version">v{version}</div>
      </header>

      {rejectedMessage && <div className="rejected">{rejectedMessage}</div>}

      <section className="panels">
        <LeftPanel
          filter={leftFilter}
          onFilterChange={setLeftFilter}
          items={leftItems}
          loading={leftLoading}
          hasMore={leftHasMore}
          onLoadMore={handleLeftLoadMore}
          onSelect={queueSelectAdd}
          addInput={addInput}
          onAddInputChange={setAddInput}
          onAddNew={queueAddNew}
        />
        <RightPanel
          filter={rightFilter}
          onFilterChange={setRightFilter}
          items={rightItems}
          total={rightTotal}
          loading={rightLoading}
          hasMore={rightHasMore}
          onLoadMore={handleRightLoadMore}
          onRemove={queueSelectRemove}
          onDragEnd={handleDragEnd}
        />
      </section>
    </div>
  );
}

export default App;

