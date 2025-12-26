import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import syncRouter from "./routes/sync.js";
import { baseMax, state } from "./state.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/api/state", (_req, res) => {
  res.json({
    version: state.version,
    baseMax,
    addedCount: state.addedIds.length,
    selectedCount: state.selectedOrder.length,
  });
});

const logSync = process.env.LOG_SYNC === "1";
const syncLogger: express.RequestHandler = (req, _res, next) => {
  if (!logSync || req.method !== "POST") {
    next();
    return;
  }

  const ops = (req.body?.ops ?? {}) as Record<string, unknown>;
  const views = (req.body?.views ?? {}) as Record<string, unknown>;
  const hasViews = Boolean(views.left || views.right);

  const parts: string[] = [];
  if (Array.isArray(ops.addIds)) parts.push(`addIds(${ops.addIds.length})`);
  if (Array.isArray(ops.selectAdd))
    parts.push(`selectAdd(${ops.selectAdd.length})`);
  if (Array.isArray(ops.selectRemove))
    parts.push(`selectRemove(${ops.selectRemove.length})`);
  if (ops.reorder) parts.push("reorder");

  const opsText = parts.length ? parts.join(",") : "none";
  const respParts: string[] = [];
  if (views.left) respParts.push("left");
  if (views.right) respParts.push("right");
  const respText = respParts.length ? respParts.join(",") : "none";

  const stamp = new Date().toISOString();
  console.log(
    `[${stamp}] /api/sync views=${hasViews ? 1 : 0} ops=${opsText} resp=${respText}`
  );

  next();
};

app.use("/api/sync", syncLogger, syncRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  if (req.method !== "GET") {
    next();
    return;
  }
  res.sendFile(path.join(clientDistPath, "index.html"));
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(PORT, () => console.log(`server listening on ${PORT}`));
