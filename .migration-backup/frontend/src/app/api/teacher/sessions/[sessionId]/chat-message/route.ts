import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json();
  const { sessionId } = await context.params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/chat-message/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
