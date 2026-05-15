import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
  backendBaseUrl,
} from "@/lib/auth-config";
import { isJwtExpiring } from "@/lib/jwt";

const protectedPrefixes = ["/student", "/teacher", "/settings"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function refreshTokens(refreshToken: string) {
  const response = await fetch(`${backendBaseUrl}/api/auth/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as { access: string; refresh?: string };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const needsRefresh = Boolean(refreshToken) && (!accessToken || isJwtExpiring(accessToken));

  let refreshed: { access: string; refresh?: string } | null = null;
  if (needsRefresh && refreshToken) {
    refreshed = await refreshTokens(refreshToken);
  }

  if (isProtectedPath(pathname)) {
    const effectiveAccessToken = refreshed?.access ?? accessToken;
    if (!effectiveAccessToken) {
      const loginUrl = new URL("/login", request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(ACCESS_TOKEN_COOKIE);
      response.cookies.delete(REFRESH_TOKEN_COOKIE);
      return response;
    }
  }

  const requestHeaders = new Headers(request.headers);
  if (refreshed?.access) {
    requestHeaders.set("x-edustream-access-token", refreshed.access);
  } else if (accessToken) {
    requestHeaders.set("x-edustream-access-token", accessToken);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (refreshed?.access) {
    response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed.access, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    if (refreshed.refresh) {
      response.cookies.set(REFRESH_TOKEN_COOKIE, refreshed.refresh, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    }
  } else if (needsRefresh && !refreshed) {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }

  return response;
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/settings/:path*"],
};
