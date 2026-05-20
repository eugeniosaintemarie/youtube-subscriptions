import { NextRequest, NextResponse } from "next/server";
import { getFavoriteChannels } from "@/lib/favorites";
import { fetchRecentSubscriptionVideos } from "@/lib/youtube";
import type { AppVideo } from "@/lib/types";

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
