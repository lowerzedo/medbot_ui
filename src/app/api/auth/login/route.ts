import { NextRequest, NextResponse } from "next/server";

import { getServerConfig } from "@/lib/server-config";
import { OIDC_FLOW_COOKIE, seal } from "@/lib/auth-session";
import { safeReturnTo } from "@/lib/url-safety";

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export async function GET(request: NextRequest) {
  const config = getServerConfig();
  if (config.authMode === "dev")
    return NextResponse.redirect(new URL("/", request.url));

  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const flow = await seal({
    kind: "oidc_flow",
    state,
    verifier,
    returnTo: safeReturnTo(request.nextUrl.searchParams.get("returnTo")),
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const authorizationUrl = new URL(
    `${config.oidcIssuer.pathname.replace(/\/$/, "")}/protocol/openid-connect/auth`,
    config.oidcIssuer,
  );
  authorizationUrl.search = new URLSearchParams({
    client_id: config.oidcClientId,
    redirect_uri: config.oidcRedirectUri.toString(),
    response_type: "code",
    scope: "openid",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(OIDC_FLOW_COOKIE, flow, {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax",
    path: "/api/auth/callback",
    maxAge: 10 * 60,
  });
  return response;
}
