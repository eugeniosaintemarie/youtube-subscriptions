import { NextResponse } from "next/server";
import { createOAuthUrl } from "@/lib/auth";

export async function GET() {
  const authorizationUrl = await createOAuthUrl();
  return NextResponse.redirect(authorizationUrl);
}
