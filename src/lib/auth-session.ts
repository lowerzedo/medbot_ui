import "server-only";

import { CompactEncrypt, compactDecrypt } from "jose";

import { getServerConfig } from "./server-config";

export const SESSION_COOKIE = "medbot_session";
export const OIDC_FLOW_COOKIE = "medbot_oidc_flow";

export interface AuthSession {
  kind: "session";
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiresAt: number;
  sessionExpiresAt: number;
}

export interface OidcFlow {
  kind: "oidc_flow";
  state: string;
  verifier: string;
  returnTo: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

interface SessionResolution {
  accessToken: string | null;
  rotatedCookie: string | null;
}

function isTokenResponse(value: unknown): value is TokenResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "access_token" in value &&
    typeof value.access_token === "string" &&
    "token_type" in value &&
    typeof value.token_type === "string" &&
    value.token_type.toLowerCase() === "bearer" &&
    "expires_in" in value &&
    typeof value.expires_in === "number" &&
    value.expires_in > 0
  );
}

async function encryptionKey(): Promise<Uint8Array> {
  const source = new TextEncoder().encode(getServerConfig().sessionSecret);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", source));
}

export async function seal(value: AuthSession | OidcFlow): Promise<string> {
  return new CompactEncrypt(new TextEncoder().encode(JSON.stringify(value)))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(await encryptionKey());
}

async function unsealPayload(value: string | undefined): Promise<unknown> {
  if (!value) return null;
  try {
    const decrypted = await compactDecrypt(value, await encryptionKey());
    return JSON.parse(new TextDecoder().decode(decrypted.plaintext)) as unknown;
  } catch {
    return null;
  }
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export async function unsealAuthSession(
  value: string | undefined,
): Promise<AuthSession | null> {
  const parsed = await unsealPayload(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("kind" in parsed) ||
    parsed.kind !== "session" ||
    !("accessToken" in parsed) ||
    typeof parsed.accessToken !== "string" ||
    !("refreshToken" in parsed) ||
    !nullableString(parsed.refreshToken) ||
    !("accessTokenExpiresAt" in parsed) ||
    typeof parsed.accessTokenExpiresAt !== "number" ||
    !("sessionExpiresAt" in parsed) ||
    typeof parsed.sessionExpiresAt !== "number" ||
    parsed.sessionExpiresAt <= Date.now()
  ) {
    return null;
  }
  return parsed as AuthSession;
}

export async function unsealOidcFlow(
  value: string | undefined,
): Promise<OidcFlow | null> {
  const parsed = await unsealPayload(value);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("kind" in parsed) ||
    parsed.kind !== "oidc_flow" ||
    !("state" in parsed) ||
    typeof parsed.state !== "string" ||
    !("verifier" in parsed) ||
    typeof parsed.verifier !== "string" ||
    !("returnTo" in parsed) ||
    typeof parsed.returnTo !== "string" ||
    !("expiresAt" in parsed) ||
    typeof parsed.expiresAt !== "number" ||
    parsed.expiresAt <= Date.now()
  ) {
    return null;
  }
  return parsed as OidcFlow;
}

export async function resolveAccessToken(
  sessionCookie: string | undefined,
): Promise<SessionResolution> {
  const config = getServerConfig();
  if (config.authMode === "dev") {
    return { accessToken: config.devToken, rotatedCookie: null };
  }

  const session = await unsealAuthSession(sessionCookie);
  if (!session) return { accessToken: null, rotatedCookie: null };
  if (session.accessTokenExpiresAt > Date.now() + 30_000) {
    return { accessToken: session.accessToken, rotatedCookie: null };
  }
  if (!session.refreshToken) return { accessToken: null, rotatedCookie: null };

  const tokenUrl = new URL(
    `${config.oidcIssuer.pathname.replace(/\/$/, "")}/protocol/openid-connect/token`,
    config.oidcIssuer,
  );
  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.oidcClientId,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const body: unknown = await response.json();
    if (!response.ok || !isTokenResponse(body)) {
      return { accessToken: null, rotatedCookie: null };
    }
    const refreshed: AuthSession = {
      kind: "session",
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? session.refreshToken,
      accessTokenExpiresAt: Date.now() + body.expires_in * 1000,
      sessionExpiresAt: session.sessionExpiresAt,
    };
    return {
      accessToken: refreshed.accessToken,
      rotatedCookie: await seal(refreshed),
    };
  } catch {
    return { accessToken: null, rotatedCookie: null };
  }
}

export function tokenResponse(value: unknown): TokenResponse | null {
  return isTokenResponse(value) ? value : null;
}
