import { NextRequest, NextResponse } from "next/server";
import { getFavoriteChannels } from "@/lib/favorites";
import { fetchRecentSubscriptionVideos } from "@/lib/youtube";
import type { AppVideo } from "@/lib/types";

export const dynamic = "force-dynamic";

type VideosPayload = {
  videos: AppVideo[];
  favorites: string[];
};

export async function GET() {
  try {
    const [videos, favorites] = await Promise.all([
      fetchRecentSubscriptionVideos(),
      getFavoriteChannels()
    ]);

    const payload: VideosPayload = {
      videos,
      favorites
    };

    const response = NextResponse.json(payload);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      const response = NextResponse.json(
        {
          authRequired: true,
          loginUrl: "/api/oauth/start"
        },
        { status: 401 }
      );
      response.headers.set("Cache-Control", "no-store, max-age=0");
      return response;
    }

    const response = NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  }
}
