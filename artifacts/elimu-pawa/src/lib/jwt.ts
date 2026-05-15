function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

export function isJwtExpiring(token: string, bufferSeconds = 60) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return true;

    const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: number };
    if (!parsed.exp) return true;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return parsed.exp <= nowInSeconds + bufferSeconds;
  } catch {
    return true;
  }
}
