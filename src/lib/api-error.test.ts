import { describe, expect, it } from "vitest";

import { readApiError } from "./api-error";

describe("readApiError", () => {
  it("reads the backend error envelope", async () => {
    const response = Response.json(
      {
        error: {
          code: "invalid_transition",
          fields: [],
          message: "The referral is not ready to route.",
          trace_id: "trace-1",
        },
      },
      { status: 409 },
    );

    await expect(readApiError(response)).resolves.toBe(
      "The referral is not ready to route.",
    );
  });

  it("accepts FastAPI validation detail when it is a safe string", async () => {
    const response = Response.json(
      { detail: "The upload must be a PDF." },
      { status: 415 },
    );

    await expect(readApiError(response)).resolves.toBe(
      "The upload must be a PDF.",
    );
  });

  it("does not surface arbitrary upstream response bodies", async () => {
    const response = new Response("patient data", { status: 502 });

    await expect(readApiError(response)).resolves.toBe(
      "The request failed with status 502.",
    );
  });
});
