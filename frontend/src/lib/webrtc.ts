"use client";

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

let cachedIceServers: RTCIceServer[] | null = null;

function normalizeIceServer(candidate: unknown): RTCIceServer | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const rawUrls = (candidate as { urls?: unknown }).urls;
  const urls =
    typeof rawUrls === "string"
      ? [rawUrls]
      : Array.isArray(rawUrls)
        ? rawUrls.filter((value): value is string => typeof value === "string" && value.length > 0)
        : [];

  if (!urls.length) {
    return null;
  }

  const username = (candidate as { username?: unknown }).username;
  const credential = (candidate as { credential?: unknown }).credential;

  return {
    urls,
    username: typeof username === "string" ? username : undefined,
    credential: typeof credential === "string" ? credential : undefined,
  };
}

function splitUrls(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildIceServersFromEnv(): RTCIceServer[] {
  const jsonConfig = process.env.NEXT_PUBLIC_EDUSTREAM_ICE_SERVERS?.trim();
  if (jsonConfig) {
    try {
      const parsed = JSON.parse(jsonConfig) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const normalized = candidates
        .map((candidate) => normalizeIceServer(candidate))
        .filter((candidate): candidate is RTCIceServer => candidate !== null);

      if (normalized.length) {
        return normalized;
      }
    } catch {
      // Fall through to the individual env vars if JSON parsing fails.
    }
  }

  const stunUrls = splitUrls(process.env.NEXT_PUBLIC_EDUSTREAM_STUN_URLS);
  const turnUrls = splitUrls(process.env.NEXT_PUBLIC_EDUSTREAM_TURN_URLS);
  const servers: RTCIceServer[] = [];

  if (stunUrls.length) {
    servers.push({ urls: stunUrls });
  }

  if (turnUrls.length) {
    servers.push({
      urls: turnUrls,
      username: process.env.NEXT_PUBLIC_EDUSTREAM_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_EDUSTREAM_TURN_CREDENTIAL,
    });
  }

  return servers.length ? servers : DEFAULT_ICE_SERVERS;
}

export function getIceServers(): RTCIceServer[] {
  if (cachedIceServers) {
    return cachedIceServers;
  }

  cachedIceServers = buildIceServersFromEnv();
  return cachedIceServers;
}
