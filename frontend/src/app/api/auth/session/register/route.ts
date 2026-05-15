import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  backendBaseUrl,
} from "@/lib/auth-config";

function formatRegisterError(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>;
    if (typeof p.detail === "string") {
      return p.detail;
    }
    if (typeof p.message === "string") {
      return p.message;
    }
    const fieldErrors = Object.entries(p)
      .filter(([, v]) => v != null)
      .map(([key, v]) => {
        if (Array.isArray(v)) {
          return `${key}: ${v.join(" ")}`;
        }
        if (typeof v === "string") {
          return `${key}: ${v}`;
        }
        return `${key}: ${JSON.stringify(v)}`;
      });
    if (fieldErrors.length > 0) {
      return fieldErrors.join(" ");
    }
  }
  return "Unable to create account.";
}

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${backendBaseUrl}/api/auth/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return NextResponse.json(
      { message: "Registration service returned an invalid response." },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: formatRegisterError(payload) },
      { status: response.status },
    );
  }

  const ok = payload as {
    access: string;
    refresh: string;
    message?: string;
    user: unknown;
  };

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, ok.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, ok.refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return NextResponse.json({ message: ok.message, user: ok.user }, { status: 201 });
}
