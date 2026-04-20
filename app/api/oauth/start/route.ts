import { NextResponse } from "next/server";
import { createOAuthUrl } from "@/lib/auth";

export async function GET() {
  const requiredEnv = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"];
  const missing = requiredEnv.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "OAuth configuration is incomplete",
        missing
      },
      { status: 500 }
    );
  }

  try {
    const authorizationUrl = await createOAuthUrl();
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    console.error("OAuth start failed", error);
    return NextResponse.json(
      {
        error: "Failed to start OAuth flow"
      },
      { status: 500 }
    );
  }
}
