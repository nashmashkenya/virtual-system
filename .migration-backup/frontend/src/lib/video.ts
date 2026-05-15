export function normalizeYouTubeEmbedUrl(url: string) {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") ?? "";
      } else if (parsed.pathname.startsWith("/live/") || parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
      }
    }

    if (!videoId) {
      return url;
    }

    return `https://www.youtube.com/embed/${videoId}?rel=0`;
  } catch {
    return url;
  }
}
