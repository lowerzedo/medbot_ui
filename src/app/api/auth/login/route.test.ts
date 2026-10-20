import { createHash } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { OIDC_FLOW_COOKIE, unsealOidcFlow } from "@/lib/auth-session";

import { GET } from "./route";

describe("login", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MEDBOT_AUTH_MODE", undefined);
    vi.stubEnv("MEDBOT_SESSION_SECRET", undefined);
    vi.stubEnv("MEDBOT_OIDC_ISSUER", undefined);
    vi.stubEnv("MEDBOT_OIDC_CLIENT_ID", undefined);
    vi.stubEnv("MEDBOT_OIDC_REDIRECT_URI", undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("defaults to the local Keycloak login with a bound PKCE flow", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/auth/login?returnTo=%2F"),
    );
    const destination = new URL(response.headers.get("location")!);
    expect(destination.origin).toBe("http://localhost:8081");
    expect(destination.pathname).toBe(
      "/realms/medbot/protocol/openid-connect/auth",
    );
    expect(destination.searchParams.get("client_id")).toBe("medbot-ui");
    expect(destination.searchParams.get("scope")).toBe("openid");
    expect(destination.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/auth/callback",
    );

    const cookie = response.cookies.get(OIDC_FLOW_COOKIE);
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/api/auth/callback",
    });
    const flow = await unsealOidcFlow(cookie?.value);
    expect(flow?.state).toBe(destination.searchParams.get("state"));
    expect(flow?.returnTo).toBe("/");
    expect(destination.searchParams.get("code_challenge_method")).toBe("S256");
    expect(destination.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(flow!.verifier).digest("base64url"),
    );
  });

  it("uses development authentication only when explicitly selected", async () => {
    vi.stubEnv("MEDBOT_AUTH_MODE", "dev");
    const response = await GET(
      new NextRequest("http://localhost:3000/api/auth/login"),
    );
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(response.cookies.has(OIDC_FLOW_COOKIE)).toBe(false);
  });

  it("rejects development authentication in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MEDBOT_AUTH_MODE", "dev");
    await expect(
      GET(new NextRequest("http://localhost:3000/api/auth/login")),
    ).rejects.toThrow("MEDBOT_AUTH_MODE=dev is not permitted in production");
  });
});
