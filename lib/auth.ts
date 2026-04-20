import { randomUUID } from "node:crypto";
import { google } from "googleapis";
import { getOAuthConfig } from "@/lib/env";
import { deleteKey, getJson, setJson } from "@/lib/kv";
import type { StoredTokens } from "@/lib/types";

const TOKENS_KEY = "single_user:oauth_tokens";
const OAUTH_STATE_PREFIX = "single_user:oauth_state:";

const createOAuthClient = () => {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export async function createOAuthUrl(): Promise<string> {
  const oauth2Client = createOAuthClient();
  const state = randomUUID();

  await setJson(`${OAUTH_STATE_PREFIX}${state}`, { createdAt: Date.now() }, 300);

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
    include_granted_scopes: true,
    prompt: "consent",
    state
  });
}

export async function consumeOAuthState(state: string): Promise<boolean> {
  const key = `${OAUTH_STATE_PREFIX}${state}`;
  const found = await getJson(key);
  if (!found) {
    return false;
  }

  await deleteKey(key);
  return true;
}

export async function exchangeCodeForTokens(code: string): Promise<StoredTokens> {
  const oauth2Client = createOAuthClient();
  const tokenResponse = await oauth2Client.getToken(code);

  const tokens: StoredTokens = {
    access_token: tokenResponse.tokens.access_token ?? undefined,
    refresh_token: tokenResponse.tokens.refresh_token ?? undefined,
    scope: tokenResponse.tokens.scope ?? undefined,
    token_type: tokenResponse.tokens.token_type ?? undefined,
    expiry_date: tokenResponse.tokens.expiry_date ?? undefined
  };

  const previous = await getJson<StoredTokens>(TOKENS_KEY);
  if (!tokens.refresh_token && previous?.refresh_token) {
    tokens.refresh_token = previous.refresh_token;
  }

  await setJson(TOKENS_KEY, tokens);
  return tokens;
}

export async function getValidAccessToken(): Promise<string | null> {
  const stored = await getJson<StoredTokens>(TOKENS_KEY);
  if (!stored) {
    return null;
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials(stored);

  const refreshCutoffMs = 60_000;
  const isExpired = !stored.expiry_date || stored.expiry_date <= Date.now() + refreshCutoffMs;

  if (!isExpired && stored.access_token) {
    return stored.access_token;
  }

  if (!stored.refresh_token) {
    return null;
  }

  const refreshed = await oauth2Client.refreshAccessToken();
  const nextCredentials = refreshed.credentials;
  const merged: StoredTokens = {
    ...stored,
    access_token: nextCredentials.access_token ?? undefined,
    scope: nextCredentials.scope ?? stored.scope,
    token_type: nextCredentials.token_type ?? stored.token_type,
    expiry_date: nextCredentials.expiry_date ?? stored.expiry_date,
    refresh_token: stored.refresh_token
  };

  await setJson(TOKENS_KEY, merged);

  return merged.access_token ?? null;
}
