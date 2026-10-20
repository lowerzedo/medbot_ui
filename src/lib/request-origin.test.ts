import { describe, expect, it } from "vitest";

import { isTrustedMutationOrigin } from "./request-origin";

describe("isTrustedMutationOrigin", () => {
  const appOrigin = "https://medbot.example";

  it("accepts a same-origin browser mutation", () => {
    expect(isTrustedMutationOrigin(appOrigin, "same-origin", appOrigin)).toBe(
      true,
    );
  });

  it("accepts a non-browser request without browser origin metadata", () => {
    expect(isTrustedMutationOrigin(null, null, appOrigin)).toBe(true);
  });

  it.each([
    ["https://malicious.example", "cross-site"],
    ["https://malicious.example", null],
    ["null", "cross-site"],
  ])("rejects an untrusted browser mutation", (origin, fetchSite) => {
    expect(isTrustedMutationOrigin(origin, fetchSite, appOrigin)).toBe(false);
  });
});
