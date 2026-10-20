import "server-only";

export type AuthMode = "dev" | "oidc";

export interface ServerConfig {
  apiUrl: URL;
  authMode: AuthMode;
  devToken: string;
  oidcIssuer: URL;
  oidcClientId: string;
  oidcRedirectUri: URL;
  sessionSecret: string;
  secureCookies: boolean;
}

function parseUrl(value: string, name: string): URL {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol))
      throw new Error("unsupported protocol");
    return url;
  } catch {
    throw new Error(`${name} must be an absolute HTTP URL`);
  }
}

export function getServerConfig(): ServerConfig {
  const authMode = (process.env.MEDBOT_AUTH_MODE ?? "oidc") as AuthMode;
  if (authMode !== "dev" && authMode !== "oidc") {
    throw new Error("MEDBOT_AUTH_MODE must be 'dev' or 'oidc'");
  }
  if (authMode === "dev" && process.env.NODE_ENV === "production") {
    throw new Error("MEDBOT_AUTH_MODE=dev is not permitted in production");
  }

  const sessionSecret =
    process.env.MEDBOT_SESSION_SECRET ??
    (process.env.NODE_ENV === "production"
      ? ""
      : "medbot-local-only-session-secret-rotate-before-deployment");
  if (sessionSecret.length < 32) {
    throw new Error(
      "MEDBOT_SESSION_SECRET must contain at least 32 characters",
    );
  }

  return {
    apiUrl: parseUrl(
      process.env.MEDBOT_API_URL ?? "http://localhost:8000",
      "MEDBOT_API_URL",
    ),
    authMode,
    devToken: process.env.MEDBOT_DEV_TOKEN ?? "dev-token-org-a",
    oidcIssuer: parseUrl(
      process.env.MEDBOT_OIDC_ISSUER ?? "http://localhost:8081/realms/medbot",
      "MEDBOT_OIDC_ISSUER",
    ),
    oidcClientId: process.env.MEDBOT_OIDC_CLIENT_ID ?? "medbot-ui",
    oidcRedirectUri: parseUrl(
      process.env.MEDBOT_OIDC_REDIRECT_URI ??
        "http://localhost:3000/api/auth/callback",
      "MEDBOT_OIDC_REDIRECT_URI",
    ),
    sessionSecret,
    secureCookies:
      process.env.MEDBOT_SESSION_SECURE === "true" ||
      process.env.NODE_ENV === "production",
  };
}
