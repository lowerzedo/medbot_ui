import { NextRequest, NextResponse } from "next/server";

import type { ApiErrorEnvelope, CurrentUser } from "@/lib/contracts";
import { resolveAccessToken, SESSION_COOKIE } from "@/lib/auth-session";
import { getServerConfig } from "@/lib/server-config";
import { sessionCookieOptions } from "@/lib/backend-proxy";

export async function GET(request: NextRequest) {
  const resolved = await resolveAccessToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!resolved.accessToken) {
    return NextResponse.json<ApiErrorEnvelope>(
      {
        error: {
          code: "authentication_required",
          message: "Sign in to continue.",
          trace_id: crypto.randomUUID(),
          fields: [],
        },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(
      new URL("/api/v1/auth/me", getServerConfig().apiUrl),
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${resolved.accessToken}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    const body = (await response.json()) as CurrentUser | ApiErrorEnvelope;
    const result = NextResponse.json(body, {
      status: response.status,
      headers: { "Cache-Control": "private, no-store" },
    });
    if (resolved.rotatedCookie) {
      result.cookies.set(
        SESSION_COOKIE,
        resolved.rotatedCookie,
        sessionCookieOptions(),
      );
    }
    return result;
  } catch {
    return NextResponse.json<ApiErrorEnvelope>(
      {
        error: {
          code: "backend_unavailable",
          message: "The referral service is unavailable. Try again.",
          trace_id: crypto.randomUUID(),
          fields: [],
        },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
