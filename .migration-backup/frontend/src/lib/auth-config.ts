export const ACCESS_TOKEN_COOKIE = "edustream_access_token";
export const REFRESH_TOKEN_COOKIE = "edustream_refresh_token";

export const ACCESS_TOKEN_MAX_AGE = 60 * 20;
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export const backendBaseUrl =
  process.env.EDUSTREAM_API_BASE_URL ??
  process.env.NEXT_PUBLIC_EDUSTREAM_API_BASE_URL ??
  "http://127.0.0.1:8000";
