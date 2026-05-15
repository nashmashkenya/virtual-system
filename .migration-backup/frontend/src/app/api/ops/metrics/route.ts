import { NextResponse } from "next/server";
import { backendBaseUrl } from "@/lib/auth-config";

export async function GET(request: Request) {
  const incomingKey = request.headers.get("x-ops-key");
  const configuredKey = process.env.OPS_METRICS_KEY ?? process.env.NEXT_OPS_METRICS_KEY;
  const opsKey = incomingKey ?? configuredKey;

  const response = await fetch(`${backendBaseUrl}/api/ops/metrics/`, {
    method: "GET",
    headers: opsKey ? { "X-Ops-Key": opsKey } : undefined,
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({
    detail: "Unable to load ops metrics.",
  }));

  return NextResponse.json(payload, { status: response.status });
}
