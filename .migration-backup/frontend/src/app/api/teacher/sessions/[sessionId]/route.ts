import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/`, {
    method: "GET",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const body = await request.json();
  const { sessionId } = await params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/`, {
    method: "DELETE",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
