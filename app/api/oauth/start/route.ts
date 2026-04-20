import { NextResponse } from "next/server";
import { createOAuthUrl } from "@/lib/auth";

const OAUTH_STATE_COOKIE = "oauth_state";

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
    const state = new URL(authorizationUrl).searchParams.get("state");
    if (!state) {
      return NextResponse.json(
        {
          error: "Failed to create OAuth state"
        },
        { status: 500 }
      );
    }

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 300
    });

    return response;
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
