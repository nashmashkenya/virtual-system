import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * Detailed health check including database connectivity
 * Used by CI/monitoring to verify service health
 */
router.get("/health/detailed", async (_req, res) => {
  const checks: Record<string, Record<string, unknown>> = {};
  let allHealthy = true;

  // Database health check
  try {
    const start = performance.now();
    await db.execute(sql`SELECT 1`);
    const latencyMs = performance.now() - start;

    checks.database = {
      ok: true,
      latency_ms: Number(latencyMs.toFixed(2)),
    };
  } catch (error) {
    checks.database = {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    allHealthy = false;
  }

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    service: "elimuapwa-classroom-api",
    checks,
  });
});

export default router;
