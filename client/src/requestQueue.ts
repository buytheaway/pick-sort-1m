import { sync } from "./api";
import type { SyncReq, SyncRes } from "./api";

type QueueConfig = {
  getViews: () => SyncReq["views"];
  onData: (resp: SyncRes) => void;
  onError?: (error: string) => void;
  onRejected?: (rejected: NonNullable<SyncRes["rejected"]>) => void;
};

export class RequestQueue {
  private pendingAddIds = new Set<number>();
  private pendingSelectAdd = new Set<number>();
  private pendingSelectRemove = new Set<number>();
  private pendingReorder: NonNullable<SyncReq["ops"]>["reorder"] | null = null;
  private addTimer: number | null = null;
  private syncTimer: number | null = null;
  private addInFlight = false;
  private syncInFlight = false;
  private config: QueueConfig;

  constructor(config: QueueConfig) {
    this.config = config;
  }

  start() {
    this.stop();
    void this.flushSync().catch(() => {});
    this.addTimer = window.setInterval(() => {
      void this.flushAddIds().catch(() => {});
    }, 10_000);
    this.syncTimer = window.setInterval(() => {
      void this.flushSync().catch(() => {});
    }, 1_000);
  }

  stop() {
    if (this.addTimer) window.clearInterval(this.addTimer);
    if (this.syncTimer) window.clearInterval(this.syncTimer);
    this.addTimer = null;
    this.syncTimer = null;
  }

  enqueueAddId(id: number) {
    if (!Number.isInteger(id) || id <= 0) return;
    this.pendingAddIds.add(id);
  }

  enqueueSelectAdd(id: number) {
    if (!Number.isInteger(id) || id <= 0) return;
    this.pendingSelectRemove.delete(id);
    this.pendingSelectAdd.add(id);
  }

  enqueueSelectRemove(id: number) {
    if (!Number.isInteger(id) || id <= 0) return;
    this.pendingSelectAdd.delete(id);
    this.pendingSelectRemove.add(id);
  }

  enqueueReorder(dragId: number, toIndex: number, filter?: string) {
    if (!Number.isInteger(dragId) || dragId <= 0) return;
    this.pendingReorder = { dragId, toIndex, filter };
  }

  private async flushAddIds() {
    if (this.addInFlight || this.pendingAddIds.size === 0) return;
    this.addInFlight = true;
    const addBatch = Array.from(this.pendingAddIds);
    try {
      const result = await sync({ ops: { addIds: addBatch } });
      if (result.ok) {
        for (const id of addBatch) this.pendingAddIds.delete(id);
        if (result.data.rejected && this.config.onRejected) {
          this.config.onRejected(result.data.rejected);
        }
      } else if (this.config.onError) {
        this.config.onError(result.error);
      }
    } catch (error) {
      if (this.config.onError) {
        const message =
          error instanceof Error ? error.message : "Add IDs failed";
        this.config.onError(message);
      }
    } finally {
      this.addInFlight = false;
    }
  }

  private async flushSync() {
    if (this.syncInFlight) return;
    const views = this.config.getViews();
    const selectAddBatch = Array.from(this.pendingSelectAdd);
    const selectRemoveBatch = Array.from(this.pendingSelectRemove);
    const reorderBatch = this.pendingReorder;
    this.syncInFlight = true;

    const ops: NonNullable<SyncReq["ops"]> = {};
    if (selectAddBatch.length) ops.selectAdd = selectAddBatch;
    if (selectRemoveBatch.length) ops.selectRemove = selectRemoveBatch;
    if (reorderBatch) ops.reorder = reorderBatch;

    try {
      const result = await sync({ ops, views });
      if (result.ok) {
        for (const id of selectAddBatch) this.pendingSelectAdd.delete(id);
        for (const id of selectRemoveBatch) this.pendingSelectRemove.delete(id);
        if (this.pendingReorder === reorderBatch) this.pendingReorder = null;
        if (result.data.rejected && this.config.onRejected) {
          this.config.onRejected(result.data.rejected);
        }
        this.config.onData(result.data);
      } else if (this.config.onError) {
        this.config.onError(result.error);
      }
    } catch (error) {
      if (this.config.onError) {
        const message =
          error instanceof Error ? error.message : "Sync failed";
        this.config.onError(message);
      }
    } finally {
      this.syncInFlight = false;
    }
  }
}
