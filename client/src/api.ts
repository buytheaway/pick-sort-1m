export type SyncReq = {
  ops?: {
    addIds?: number[];
    selectAdd?: number[];
    selectRemove?: number[];
    reorder?: { dragId: number; toIndex: number; filter?: string };
  };
  views?: {
    left?: { filter?: string; afterId?: number; limit?: number };
    right?: { filter?: string; offset?: number; limit?: number };
  };
};

export type SyncRes = {
  version: number;
  left?: { items: number[]; nextAfterId: number | null };
  right?: { items: number[]; total: number };
  rejected?: {
    addIds?: number[];
    selectAdd?: number[];
    selectRemove?: number[];
  };
};

export type SyncResult =
  | { ok: true; data: SyncRes }
  | { ok: false; error: string };

export const sync = async (payload: SyncReq): Promise<SyncResult> => {
  try {
    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as SyncRes;
    return { ok: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    return { ok: false, error: message };
  }
};
