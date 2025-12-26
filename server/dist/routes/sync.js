import { Router } from "express";
import { applyOps, getLeftView, getRightView, state } from "../state.js";
const router = Router();
router.post("/", (req, res) => {
    const ops = (req.body?.ops ?? {});
    const views = (req.body?.views ?? {});
    const { rejected } = applyOps(ops);
    const response = {
        version: state.version,
    };
    const leftRequested = Boolean(views.left);
    const rightRequested = Boolean(views.right);
    if (leftRequested)
        response.left = getLeftView(views.left);
    if (rightRequested)
        response.right = getRightView(views.right);
    response.version = state.version;
    if (rejected.addIds?.length || rejected.selectAdd?.length || rejected.selectRemove?.length) {
        response.rejected = rejected;
    }
    res.json(response);
});
export default router;
//# sourceMappingURL=sync.js.map