import { NextResponse } from "next/server";
import { getFavoriteChannels } from "@/lib/favorites";

export async function GET() {
  const favorites = await getFavoriteChannels();
  return NextResponse.json({ favorites });
}
