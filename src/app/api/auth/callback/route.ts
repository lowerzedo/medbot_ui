import { NextRequest, NextResponse } from "next/server";

import {
  type AuthSession,
  OIDC_FLOW_COOKIE,
  SESSION_COOKIE,
  seal,
  tokenResponse,
  unsealOidcFlow,
} from "@/lib/auth-session";
import { sessionCookieOptions } from "@/lib/backend-proxy";
import { getServerConfig } from "@/lib/server-config";

export async function GET(request: NextRequest) {
  const config = getServerConfig();
  const flow = await unsealOidcFlow(
    request.cookies.get(OIDC_FLOW_COOKIE)?.value,
  );
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!flow || !state || state !== flow.state || !code) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_callback", request.url),
    );
  }

  const tokenUrl = new URL(
    `${config.oidcIssuer.pathname.replace(/\/$/, "")}/protocol/openid-connect/token`,
    config.oidcIssuer,
  );
  try {
    const tokenResult = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.oidcClientId,
        code,
        code_verifier: flow.verifier,
        grant_type: "authorization_code",
        redirect_uri: config.oidcRedirectUri.toString(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const token = tokenResponse(await tokenResult.json());
    if (!tokenResult.ok || !token) {
      return NextResponse.redirect(
        new URL("/login?error=token_exchange", request.url),
      );
    }
    const session: AuthSession = {
      kind: "session",
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
      sessionExpiresAt: Date.now() + 8 * 60 * 60 * 1000,
    };
    const response = NextResponse.redirect(new URL(flow.returnTo, request.url));
    response.cookies.set(
      SESSION_COOKIE,
      await seal(session),
      sessionCookieOptions(),
    );
    response.cookies.set(OIDC_FLOW_COOKIE, "", {
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "lax",
      path: "/api/auth/callback",
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=provider_unavailable", request.url),
    );
  }
}
