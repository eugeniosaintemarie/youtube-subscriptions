import { NextRequest, NextResponse } from "next/server";
import { getFavoriteChannels } from "@/lib/favorites";
import { getJson, setJson } from "@/lib/kv";
import { fetchRecentSubscriptionVideos, videosCacheTtlSeconds } from "@/lib/youtube";
import type { AppVideo } from "@/lib/types";

type VideosPayload = {
  videos: AppVideo[];
  favorites: string[];
  cached: boolean;
  updatedAt: string;
};

const CACHE_KEY = "single_user:videos_cache";

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "true";

  if (!forceRefresh) {
    const cached = await getJson<VideosPayload>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  try {
    const [videos, favorites] = await Promise.all([
      fetchRecentSubscriptionVideos(),
      getFavoriteChannels()
    ]);

    const payload: VideosPayload = {
      videos,
      favorites,
      cached: false,
      updatedAt: new Date().toISOString()
    };

    await setJson(CACHE_KEY, payload, videosCacheTtlSeconds);

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json(
        {
          authRequired: true,
          loginUrl: "/api/oauth/start"
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
