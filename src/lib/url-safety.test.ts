import { describe, expect, it } from "vitest";

import { safeReturnTo } from "./url-safety";

describe("safeReturnTo", () => {
  it.each([
    null,
    "",
    "https://example.test",
    "//example.test/path",
    "/\\\\example.test",
  ])("falls back for an unsafe destination: %s", (value) => {
    expect(safeReturnTo(value)).toBe("/");
  });

  it("preserves an application-relative path", () => {
    expect(safeReturnTo("/referrals/example?tab=audit")).toBe(
      "/referrals/example?tab=audit",
    );
  });
});
