import "server-only";

import { NextRequest, NextResponse } from "next/server";

import type { ApiErrorEnvelope } from "./contracts";
import { resolveAccessToken, SESSION_COOKIE } from "./auth-session";
import { isTrustedMutationOrigin } from "./request-origin";
import { getServerConfig } from "./server-config";

type SupportedMethod = "GET" | "POST";

const idPattern = "[A-Za-z0-9-]{8,64}";
const maxProxyBodyBytes = 10 * 1024 * 1024 + 256 * 1024;
const allowedRoutes: Array<{
  method: SupportedMethod;
  path: RegExp;
  upstream?: string;
}> = [
  { method: "GET", path: /^settings\/ai$/ },
  { method: "POST", path: /^settings\/ai$/ },
  { method: "POST", path: /^settings\/ai\/(remove-key|use-defaults)$/ },
  { method: "GET", path: /^processing-configuration$/ },
  { method: "GET", path: /^referrals$/ },
  { method: "POST", path: /^referrals$/ },
  { method: "GET", path: new RegExp(`^referrals/${idPattern}$`) },
  { method: "POST", path: new RegExp(`^referrals/${idPattern}/documents$`) },
  { method: "POST", path: new RegExp(`^referrals/${idPattern}/process$`) },
  { method: "POST", path: new RegExp(`^referrals/${idPattern}/fields$`) },
  {
    method: "POST",
    path: new RegExp(`^referrals/${idPattern}/request-information$`),
  },
  {
    method: "POST",
    path: new RegExp(`^referrals/${idPattern}/fields/${idPattern}/approve$`),
  },
  {
    method: "POST",
    path: new RegExp(`^referrals/${idPattern}/fields/${idPattern}/correct$`),
  },
  { method: "POST", path: new RegExp(`^referrals/${idPattern}/route$`) },
  {
    method: "GET",
    path: new RegExp(`^referrals/${idPattern}/fhir$`),
    upstream: "fhir-preview",
  },
  { method: "POST", path: new RegExp(`^referrals/${idPattern}/fhir$`) },
  { method: "GET", path: new RegExp(`^referrals/${idPattern}/audit$`) },
  {
    method: "GET",
    path: new RegExp(`^referrals/${idPattern}/documents/${idPattern}/content$`),
  },
  {
    method: "GET",
    path: new RegExp(
      `^referrals/${idPattern}/documents/${idPattern}/pages/[1-9][0-9]?/image$`,
    ),
  },
];

function safeError(
  status: number,
  code: string,
  message: string,
): NextResponse<ApiErrorEnvelope> {
  return NextResponse.json(
    { error: { code, message, trace_id: crypto.randomUUID(), fields: [] } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function mapPath(path: string, upstreamSuffix?: string): string {
  if (!upstreamSuffix) return path;
  const segments = path.split("/");
  segments[segments.length - 1] = upstreamSuffix;
  return segments.join("/");
}

async function boundedRequestBody(
  request: NextRequest,
): Promise<ArrayBuffer | undefined> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maxProxyBodyBytes) {
    throw new RangeError("request body too large");
  }
  if (!request.body) return undefined;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxProxyBodyBytes) {
      await reader.cancel();
      throw new RangeError("request body too large");
    }
    chunks.push(value);
  }

  const body = new ArrayBuffer(total);
  const bodyView = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bodyView.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function proxyBackend(
  request: NextRequest,
  method: SupportedMethod,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = pathSegments.join("/");
  const route = allowedRoutes.find(
    (candidate) => candidate.method === method && candidate.path.test(path),
  );
  if (!route)
    return safeError(404, "route_not_found", "The API route is not available.");
  if (
    method === "POST" &&
    !isTrustedMutationOrigin(
      request.headers.get("origin"),
      request.headers.get("sec-fetch-site"),
      request.nextUrl.origin,
    )
  ) {
    return safeError(
      403,
      "untrusted_origin",
      "The request origin is not permitted.",
    );
  }

  const resolved = await resolveAccessToken(
    request.cookies.get(SESSION_COOKIE)?.value,
  );
  if (!resolved.accessToken) {
    return safeError(401, "authentication_required", "Sign in to continue.");
  }

  const config = getServerConfig();
  const upstream = new URL(
    `/api/v1/${mapPath(path, route.upstream)}`,
    config.apiUrl,
  );
  upstream.search = request.nextUrl.search;

  const headers = new Headers({
    Accept: request.headers.get("accept") ?? "application/json",
    Authorization: `Bearer ${resolved.accessToken}`,
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  try {
    const body =
      method === "POST" ? await boundedRequestBody(request) : undefined;
    const upstreamResponse = await fetch(upstream, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(path.endsWith("/process") ? 180_000 : 30_000),
    });
    const responseHeaders = new Headers({
      "Cache-Control": "private, no-store",
    });
    for (const header of [
      "content-type",
      "content-disposition",
      "x-trace-id",
    ]) {
      const value = upstreamResponse.headers.get(header);
      if (value) responseHeaders.set(header, value);
    }
    const response = new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
    if (resolved.rotatedCookie) {
      response.cookies.set(
        SESSION_COOKIE,
        resolved.rotatedCookie,
        sessionCookieOptions(),
      );
    }
    return response;
  } catch (error) {
    if (error instanceof RangeError) {
      return safeError(
        413,
        "request_too_large",
        "The request exceeds the upload limit.",
      );
    }
    return safeError(
      502,
      "backend_unavailable",
      "The referral service is unavailable. Try again.",
    );
  }
}

export function sessionCookieOptions() {
  const config = getServerConfig();
  return {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 8 * 60 * 60,
  };
}
