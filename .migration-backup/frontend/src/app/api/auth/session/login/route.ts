import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  backendBaseUrl,
} from "@/lib/auth-config";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const response = await fetch(`${backendBaseUrl}/api/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      access?: string;
      refresh?: string;
      user?: unknown;
      message?: string;
      detail?: string;
    };
    if (!response.ok) {
      return NextResponse.json(
        { message: payload.message ?? payload.detail ?? "Unable to sign in." },
        { status: response.status },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(ACCESS_TOKEN_COOKIE, payload.access ?? "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    cookieStore.set(REFRESH_TOKEN_COOKIE, payload.refresh ?? "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return NextResponse.json({ message: payload.message, user: payload.user });
  } catch {
    return NextResponse.json(
      { message: "Auth service is offline. Start the backend on port 8000 and try again." },
      { status: 503 },
    );
  }
}
