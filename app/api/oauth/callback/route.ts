import { NextRequest, NextResponse } from "next/server";
import { consumeOAuthState, exchangeCodeForTokens } from "@/lib/auth";
import { getBaseUrl } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const isValidState = await consumeOAuthState(state);
  if (!isValidState) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  await exchangeCodeForTokens(code);

  return NextResponse.redirect(new URL("/", getBaseUrl()));
}
