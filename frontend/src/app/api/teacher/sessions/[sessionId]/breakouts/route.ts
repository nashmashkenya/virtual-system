import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json();
  const { sessionId } = await context.params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/breakouts/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const body = await request.json();
  const { sessionId } = await context.params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/breakouts/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/breakouts/`, {
    method: "DELETE",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}

export async function PUT(request: Request, context: RouteContext) {
  const body = await request.json();
  const { sessionId } = await context.params;
  const response = await fetchBackendWithAuth(`/api/teacher/sessions/${sessionId}/breakouts/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
