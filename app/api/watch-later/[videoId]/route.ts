import { NextRequest, NextResponse } from "next/server";
import { addVideoToWatchLater } from "@/lib/youtube";

type Params = {
  params: Promise<{ videoId: string }>;
};

export async function POST(_request: NextRequest, context: Params) {
  const { videoId } = await context.params;

  if (!videoId) {
    return NextResponse.json({ success: false, message: "Missing video ID" }, { status: 400 });
  }

  try {
    await addVideoToWatchLater(videoId);
    return NextResponse.json({ success: true, message: "Saved" });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return NextResponse.json({ success: false, message: "Auth required" }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
