import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetchBackendWithAuth("/api/student/poll-vote/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
