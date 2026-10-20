import { mkdir } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

import type { ReferralDetail } from "../../src/lib/contracts";
import { approveSupportedFields, signInWithLocalKeycloak } from "./local-oidc";

test.skip(
  process.env.MEDBOT_LIVE_E2E !== "1",
  "Requires a running local API and MEDBOT_LIVE_E2E=1.",
);

test.beforeEach(async ({ page }) => {
  if (process.env.MEDBOT_COMPOSE_E2E !== "1") return;
  await signInWithLocalKeycloak(page);
});

test("fresh OIDC session supports parallel reads and a referral mutation", async ({
  page,
}) => {
  test.skip(
    process.env.MEDBOT_COMPOSE_E2E !== "1",
    "Requires real local OIDC.",
  );
  // No delay or retry: freshly issued tokens must work across the immediate request fan-out.
  const [session, referrals, created] = await Promise.all([
    page.request.get("/api/session"),
    page.request.get("/api/referrals?limit=1"),
    page.request.post("/api/referrals", { data: { specialty: "cardiology" } }),
  ]);
  expect(session.status()).toBe(200);
  expect(referrals.status()).toBe(200);
  expect(created.status()).toBe(201);
});

function syntheticPdf(lines: string[]): Buffer {
  const content = `BT /F1 12 Tf 40 760 Td ${["SYNTHETIC TEST DATA", ...lines]
    .map(
      (line) =>
        `(${line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")}) Tj 0 -24 Td`,
    )
    .join("\n")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}`;
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}

const baseLines = [
  "Patient Name: TEST UI RECOVERY",
  "Referring Provider: SYNTHETIC UI PROVIDER",
  "Requested Service: Synthetic consultation",
];

async function createIncomplete(
  page: Page,
  documents = [syntheticPdf(baseLines)],
): Promise<string> {
  const created = await page.request.post("/api/referrals", {
    data: { specialty: "cardiology" },
  });
  expect(created.status()).toBe(201);
  const { id } = (await created.json()) as ReferralDetail;
  for (const document of documents) {
    const uploaded = await page.request.post(`/api/referrals/${id}/documents`, {
      multipart: {
        classification: "referral_order",
        file: {
          name: "synthetic-referral.pdf",
          mimeType: "application/pdf",
          buffer: document,
        },
      },
    });
    expect(uploaded.status()).toBe(201);
  }
  const processed = await page.request.post(`/api/referrals/${id}/process`);
  expect(processed.ok()).toBeTruthy();
  expect(((await processed.json()) as ReferralDetail).status).toBe(
    "NEEDS_REVIEW",
  );
  await page.goto(`/referrals/${id}`);
  await expect(
    page.getByRole("heading", { name: "Resolve missing information" }),
  ).toBeVisible();
  await approveSupportedFields(page);
  return id;
}

test("missing DOB can be supplied, audited, and routed through the real BFF and API", async ({
  page,
}) => {
  const id = await createIncomplete(page);
  await page
    .getByRole("button", { name: "Record information request" })
    .click();
  await expect(
    page.getByText("Awaiting information.", { exact: false }),
  ).toBeVisible();
  await page.getByText("Supply date of birth", { exact: true }).click();
  await page.getByLabel("Date of birth", { exact: true }).fill("1984-02-03");
  await page
    .getByLabel("Source or confirmation reason")
    .fill("Confirmed with synthetic referrer");
  if (process.env.MEDBOT_VISUAL_QA === "1") {
    await mkdir("output/playwright", { recursive: true });
    await page.screenshot({
      path: `output/playwright/recovery-${test.info().project.name}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Save supplied value" }).click();
  await expect(
    page.getByText("Reviewer supplied", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Reason: Confirmed with synthetic referrer"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Route referral" }).click();
  await expect(page.getByText("Routed", { exact: true })).toBeVisible();
  const audit = await page.request.get(`/api/referrals/${id}/audit`);
  const events = (await audit.json()) as Array<{ action: string }>;
  expect(
    events.filter((event) => event.action === "FIELD_SUPPLIED"),
  ).toHaveLength(1);
  expect(
    events.filter((event) => event.action === "INFORMATION_REQUESTED"),
  ).toHaveLength(1);
});

test("supplemental PDF resolves missing information on the same referral", async ({
  page,
}) => {
  const id = await createIncomplete(page);
  await page
    .getByRole("button", { name: "Record information request" })
    .click();
  await page.getByText("Add a supporting PDF", { exact: true }).click();
  await page.getByLabel("PDF document").setInputFiles({
    name: "synthetic-response.pdf",
    mimeType: "application/pdf",
    buffer: syntheticPdf(["DOB: 1984-02-03"]),
  });
  await page.getByRole("button", { name: "Upload PDF", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("PDF uploaded");
  const processing = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/referrals/${id}/process`) &&
      response.request().method() === "POST",
    { timeout: 180_000 },
  );
  await page.getByRole("button", { name: "Reprocess referral" }).click();
  expect((await processing).ok()).toBeTruthy();
  await expect(
    page.getByRole("heading", { name: "Date of birth", exact: true }),
  ).toBeVisible();
  await approveSupportedFields(page);
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeEnabled();
  const response = await page.request.get(`/api/referrals/${id}`);
  expect(((await response.json()) as ReferralDetail).documents).toHaveLength(2);
});

test("conflicting DOB sources block routing until an explained correction", async ({
  page,
}) => {
  await createIncomplete(page, [
    syntheticPdf([...baseLines, "DOB: 1984-02-03"]),
    syntheticPdf(["DOB: 1992-04-05"]),
  ]);
  const field = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Date of birth", exact: true }),
  });
  await expect(
    field.getByText("DOB: 1984-02-03", { exact: true }),
  ).toBeVisible();
  await expect(
    field.getByText("DOB: 1992-04-05", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeDisabled();
  await expect(
    field.getByRole("button", { name: "Approve value" }),
  ).toBeDisabled();
  await field.getByRole("button", { name: "Correct value" }).click();
  await field.getByLabel("Corrected value").fill("1984-02-03");
  await expect(
    field.getByRole("button", { name: "Save correction" }),
  ).toBeDisabled();
  await field
    .getByLabel("Resolution reason")
    .fill("Confirmed synthetic source discrepancy");
  await field.getByRole("button", { name: "Save correction" }).click();
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeEnabled();
});

test("a failed save keeps the supplied value and confirmation reason", async ({
  page,
}) => {
  await createIncomplete(page);
  await page.getByText("Supply date of birth", { exact: true }).click();
  await page.getByLabel("Date of birth", { exact: true }).fill("1984-02-03");
  await page
    .getByLabel("Source or confirmation reason")
    .fill("Synthetic confirmation to preserve");
  await page.route("**/api/referrals/*/fields", (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: "temporarily_unavailable",
          message: "Temporarily unavailable. Try again.",
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Save supplied value" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Temporarily unavailable",
  );
  await expect(page.getByLabel("Date of birth", { exact: true })).toHaveValue(
    "1984-02-03",
  );
  await expect(page.getByLabel("Source or confirmation reason")).toHaveValue(
    "Synthetic confirmation to preserve",
  );
});
