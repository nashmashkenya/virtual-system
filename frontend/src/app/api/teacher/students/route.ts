import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function GET() {
  const response = await fetchBackendWithAuth("/api/teacher/students/", {
    method: "GET",
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
