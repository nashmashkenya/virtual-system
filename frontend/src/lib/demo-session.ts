import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentDemoUser } from "@/lib/api";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-config";
import type { DemoUser } from "@/lib/types";

export async function getAccessToken() {
  const headerStore = await headers();
  const headerToken = headerStore.get("x-edustream-access-token");
  if (headerToken) {
    return headerToken;
  }

  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

export async function requireDemoUser(expectedRole?: DemoUser["role"]) {
  const token = await getAccessToken();

  if (!token) {
    redirect("/login");
  }

  const user = await getCurrentDemoUser(token);

  if (!user) {
    redirect("/login");
  }

  if (expectedRole && user.role !== expectedRole) {
    redirect(user.role === "teacher" ? "/teacher" : "/student");
  }

  return user;
}
