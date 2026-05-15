import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  backendBaseUrl,
} from "@/lib/auth-config";

async function refreshAccessToken() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${backendBaseUrl}/api/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
    return null;
  }

  const payload = (await response.json()) as { access: string; refresh?: string };

  cookieStore.set(ACCESS_TOKEN_COOKIE, payload.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  if (payload.refresh) {
    cookieStore.set(REFRESH_TOKEN_COOKIE, payload.refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  return payload.access;
}

export async function fetchBackendWithAuth(path: string, init?: RequestInit) {
  const cookieStore = await cookies();
  const currentAccessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  const send = async (token?: string) =>
    fetch(`${backendBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await send(currentAccessToken);
  if (response.status !== 401) {
    return response;
  }

  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) {
    return response;
  }

  response = await send(refreshedAccessToken);
  return response;
}
