import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function GET() {
  const response = await fetchBackendWithAuth("/api/student/dashboard/", {
    method: "GET",
  });

  const payload = await response.json().catch(() => ({
    detail: "Unable to load student dashboard.",
  }));

  return NextResponse.json(payload, { status: response.status });
}
