import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/resources/`, {
    method: "GET",
  });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const body = await request.json();
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/resources/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
