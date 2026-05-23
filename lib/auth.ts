import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync } from "node:crypto";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { getOAuthConfig } from "@/lib/env";
import { deleteKey, getJson, setJson } from "@/lib/kv";
import type { StoredTokens } from "@/lib/types";

const TOKENS_KEY = "single_user:oauth_tokens";
const OAUTH_STATE_PREFIX = "single_user:oauth_state:";
const AUTH_COOKIE_NAME = "yts_google_session";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const AUTH_COOKIE_IV_BYTES = 12;
const AUTH_COOKIE_TAG_BYTES = 16;
const AUTH_COOKIE_SECRET_SALT = "youtube-subscriptions-auth-cookie";

const createOAuthClient = (redirectUri?: string) => {
  const oauthConfig = getOAuthConfig();
  return new google.auth.OAuth2(
    oauthConfig.clientId,
    oauthConfig.clientSecret,
    redirectUri ?? oauthConfig.redirectUri
  );
};

type OAuthRuntimeOptions = {
  redirectUri?: string;
};

type AuthCookiePayload = {
  tokens: StoredTokens;
};

const getAuthCookieSecret = () => {
  const oauthConfig = getOAuthConfig();
  return process.env.AUTH_COOKIE_SECRET ?? oauthConfig.clientSecret;
};

const getAuthCookieKey = () => {
  return scryptSync(getAuthCookieSecret(), AUTH_COOKIE_SECRET_SALT, 32);
};

const encodeAuthCookie = (payload: AuthCookiePayload): string => {
  const iv = randomBytes(AUTH_COOKIE_IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getAuthCookieKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64url");
};

const decodeAuthCookie = (value: string): AuthCookiePayload | null => {
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length <= AUTH_COOKIE_IV_BYTES + AUTH_COOKIE_TAG_BYTES) {
      return null;
    }

    const iv = raw.subarray(0, AUTH_COOKIE_IV_BYTES);
    const authTag = raw.subarray(AUTH_COOKIE_IV_BYTES, AUTH_COOKIE_IV_BYTES + AUTH_COOKIE_TAG_BYTES);
    const ciphertext = raw.subarray(AUTH_COOKIE_IV_BYTES + AUTH_COOKIE_TAG_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", getAuthCookieKey(), iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString("utf8")) as AuthCookiePayload;

    if (!parsed.tokens) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const buildAuthCookie = (tokens: StoredTokens) => ({
  name: AUTH_COOKIE_NAME,
  value: encodeAuthCookie({ tokens }),
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE_SECONDS
});

async function readAuthCookieTokens(): Promise<StoredTokens | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!raw) {
      return null;
    }

    return decodeAuthCookie(raw)?.tokens ?? null;
  } catch {
    return null;
  }
}

export async function persistAuthTokens(tokens: StoredTokens): Promise<void> {
  await setJson(TOKENS_KEY, tokens);

  try {
    const cookieStore = await cookies();
    cookieStore.set(buildAuthCookie(tokens));
  } catch {
    // Ignore cookie write errors outside request contexts.
  }
}

export async function createOAuthUrl(options?: OAuthRuntimeOptions): Promise<string> {
  const oauth2Client = createOAuthClient(options?.redirectUri);
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

export async function exchangeCodeForTokens(
  code: string,
  options?: OAuthRuntimeOptions
): Promise<StoredTokens> {
  const oauth2Client = createOAuthClient(options?.redirectUri);
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

  await persistAuthTokens(tokens);
  return tokens;
}

export async function getValidAccessToken(): Promise<string | null> {
  const cookieTokens = await readAuthCookieTokens();
  const stored = cookieTokens ?? (await getJson<StoredTokens>(TOKENS_KEY));
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

  await persistAuthTokens(merged);

  return merged.access_token ?? null;
}
