import { NextRequest, NextResponse } from "next/server";

import { OIDC_FLOW_COOKIE, SESSION_COOKIE } from "@/lib/auth-session";
import { isTrustedMutationOrigin } from "@/lib/request-origin";

export async function POST(request: NextRequest) {
  if (
    !isTrustedMutationOrigin(
      request.headers.get("origin"),
      request.headers.get("sec-fetch-site"),
      request.nextUrl.origin,
    )
  ) {
    return NextResponse.json(
      {
        error: {
          code: "untrusted_origin",
          message: "The request origin is not permitted.",
        },
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const response = NextResponse.json(
    { signed_out: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.set(OIDC_FLOW_COOKIE, "", {
    path: "/api/auth/callback",
    maxAge: 0,
  });
  return response;
}
