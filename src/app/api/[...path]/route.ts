import type { NextRequest } from "next/server";

import { proxyBackend } from "@/lib/backend-proxy";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyBackend(request, "GET", path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyBackend(request, "POST", path);
}
