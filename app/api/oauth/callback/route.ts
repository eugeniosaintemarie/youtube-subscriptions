import { NextRequest, NextResponse } from "next/server";
import { consumeOAuthState, exchangeCodeForTokens } from "@/lib/auth";

const OAUTH_STATE_COOKIE = "oauth_state";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  let isValidState = Boolean(cookieState && cookieState === state);
  if (!isValidState) {
    isValidState = await consumeOAuthState(state);
  }

  if (!isValidState) {
    const response = NextResponse.json({ error: "Invalid state" }, { status: 400 });
    response.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0
    });
    return response;
  }

  const callbackUrl = `${request.nextUrl.origin}/api/oauth/callback`;
  await exchangeCodeForTokens(code, { redirectUri: callbackUrl });

  // Redirect with success indicator for client-side persistence
  const response = NextResponse.redirect(new URL("/?auth_success=true", request.nextUrl.origin));
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0
  });
  return response;
}
