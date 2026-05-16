import { Router, type IRouter } from "express";

const router: IRouter = Router();

/* ─────────────────────────────────────────────────────────────
   GET /api/ops/metrics
───────────────────────────────────────────────────────────── */
router.get("/ops/metrics", (_req, res) => {
  res.json({
    generated_at: new Date().toISOString(),
    pending_qa_count: 0,
    active_session_count: 1,
    waiting_room_request_count: 1,
    open_raise_hand_count: 2,
    database_ok: true,
    redis_ok: true,
  });
});

export default router;
