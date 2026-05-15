import { NextResponse } from "next/server";
import { backendBaseUrl } from "@/lib/auth-config";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${backendBaseUrl}/api/auth/password-reset/request/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
