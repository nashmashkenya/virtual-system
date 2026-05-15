import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function POST() {
  const response = await fetchBackendWithAuth("/api/student/join-request/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
