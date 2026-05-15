import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const response = await fetchBackendWithAuth(
    `/api/teacher/sessions/${sessionId}/enrollments/export/`,
    { method: "GET" },
  );

  const body = await response.arrayBuffer();
  const headers = new Headers();
  const disposition = response.headers.get("Content-Disposition");
  const contentType = response.headers.get("Content-Type");
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }
  headers.set("Content-Type", contentType ?? "text/csv; charset=utf-8");

  return new NextResponse(body, { status: response.status, headers });
}
