const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302"] }];

let cachedIceServers: RTCIceServer[] | null = null;

function normalizeIceServer(candidate: unknown): RTCIceServer | null {
  if (!candidate || typeof candidate !== "object") return null;
  const rawUrls = (candidate as { urls?: unknown }).urls;
  const urls =
    typeof rawUrls === "string"
      ? [rawUrls]
      : Array.isArray(rawUrls)
        ? rawUrls.filter((v): v is string => typeof v === "string" && v.length > 0)
        : [];
  if (!urls.length) return null;
  const username = (candidate as { username?: unknown }).username;
  const credential = (candidate as { credential?: unknown }).credential;
  return {
    urls,
    username: typeof username === "string" ? username : undefined,
    credential: typeof credential === "string" ? credential : undefined,
  };
}

function splitUrls(value: string | undefined): string[] {
  return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

function buildIceServersFromEnv(): RTCIceServer[] {
  const jsonConfig = (import.meta.env.VITE_EDUSTREAM_ICE_SERVERS as string | undefined)?.trim();
  if (jsonConfig) {
    try {
      const parsed = JSON.parse(jsonConfig) as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      const normalized = candidates.map(normalizeIceServer).filter((v): v is RTCIceServer => v !== null);
      if (normalized.length) return normalized;
    } catch { /* fall through */ }
  }
  const stunUrls = splitUrls(import.meta.env.VITE_EDUSTREAM_STUN_URLS as string | undefined);
  const turnUrls = splitUrls(import.meta.env.VITE_EDUSTREAM_TURN_URLS as string | undefined);
  const servers: RTCIceServer[] = [];
  if (stunUrls.length) servers.push({ urls: stunUrls });
  if (turnUrls.length) {
    servers.push({
      urls: turnUrls,
      username: import.meta.env.VITE_EDUSTREAM_TURN_USERNAME as string | undefined,
      credential: import.meta.env.VITE_EDUSTREAM_TURN_CREDENTIAL as string | undefined,
    });
  }
  return servers.length ? servers : DEFAULT_ICE_SERVERS;
}

export function getIceServers(): RTCIceServer[] {
  if (cachedIceServers) return cachedIceServers;
  cachedIceServers = buildIceServersFromEnv();
  return cachedIceServers;
}
