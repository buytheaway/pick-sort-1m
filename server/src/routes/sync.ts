import { Router } from "express";
import { applyOps, getLeftView, getRightView, state } from "../state.js";
import type { SyncOps, SyncViews } from "../state.js";

const router = Router();

router.post("/", (req, res) => {
  const ops = (req.body?.ops ?? {}) as SyncOps;
  const views = (req.body?.views ?? {}) as SyncViews;
  const { rejected } = applyOps(ops);

  const response: {
    version: number;
    left?: { items: number[]; nextAfterId: number | null };
    right?: { items: number[]; total: number };
    rejected?: typeof rejected;
  } = {
    version: state.version,
  };

  const leftRequested = Boolean(views.left);
  const rightRequested = Boolean(views.right);

  if (leftRequested) response.left = getLeftView(views.left);
  if (rightRequested) response.right = getRightView(views.right);

  response.version = state.version;

  if (rejected.addIds?.length || rejected.selectAdd?.length || rejected.selectRemove?.length) {
    response.rejected = rejected;
  }

  res.json(response);
});

export default router;
