import { NextRequest, NextResponse } from "next/server";
import { consumeOAuthState, exchangeCodeForTokens } from "@/lib/auth";
import { getBaseUrl } from "@/lib/env";

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

  await exchangeCodeForTokens(code);

  const response = NextResponse.redirect(new URL("/", getBaseUrl()));
  response.cookies.set({
    name: OAUTH_STATE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0
  });
  return response;
}
