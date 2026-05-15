import { NextResponse } from "next/server";
import { fetchBackendWithAuth } from "@/lib/backend-auth";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const youtubeLink = requestUrl.searchParams.get("youtube_link");
  const backendPath = youtubeLink
    ? `/api/teacher/integrations/youtube/?youtube_link=${encodeURIComponent(youtubeLink)}`
    : "/api/teacher/integrations/youtube/";
  const response = await fetchBackendWithAuth(backendPath, {
    method: "GET",
  });
  const payload = await response.json().catch(() => ({
    connected: false,
    channel_name: "",
    channel_id: "",
    connected_at: null,
    oauth_configured: false,
    stream_status: "",
    stream_title: "",
    stream_checked_at: null,
    stream_message: "",
  }));
  return NextResponse.json(payload, { status: response.status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const response = await fetchBackendWithAuth("/api/teacher/integrations/youtube/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await response.json().catch(() => ({
    detail: "Unable to connect YouTube.",
  }));
  return NextResponse.json(payload, { status: response.status });
}

export async function DELETE() {
  const response = await fetchBackendWithAuth("/api/teacher/integrations/youtube/", {
    method: "DELETE",
  });
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const payload = await response.json().catch(() => ({
    detail: "Unable to disconnect YouTube.",
  }));
  return NextResponse.json(payload, { status: response.status });
}
