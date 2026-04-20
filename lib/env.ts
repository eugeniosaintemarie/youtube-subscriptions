const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export const getOAuthConfig = () => ({
  clientId: requireEnv("GOOGLE_CLIENT_ID"),
  clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  redirectUri: requireEnv("GOOGLE_REDIRECT_URI")
});

export const getBaseUrl = () => process.env.APP_BASE_URL ?? "http://localhost:3000";
