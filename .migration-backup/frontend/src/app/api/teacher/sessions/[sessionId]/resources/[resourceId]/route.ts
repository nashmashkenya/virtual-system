import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string; resourceId: string }> },
) {
  const { sessionId, resourceId } = await context.params;
  const response = await fetchBackendWithAuth(
    `/api/teacher/sessions/${sessionId}/resources/${resourceId}/`,
    { method: "DELETE" },
  );
  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
