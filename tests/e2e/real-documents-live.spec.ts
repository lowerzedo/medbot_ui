import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

import type {
  ProcessingConfiguration,
  ReferralDetail,
} from "../../src/lib/contracts";
import { approveSupportedFields, signInWithLocalKeycloak } from "./local-oidc";

test.skip(
  process.env.MEDBOT_REAL_EXTRACTION_E2E !== "1",
  "Requires the real OCR/model Compose stack.",
);

test.beforeEach(async ({ page }) => {
  await signInWithLocalKeycloak(page);
  const response = await page.request.get("/api/processing-configuration");
  expect(response.status()).toBe(200);
  const configuration = (await response.json()) as ProcessingConfiguration;
  expect(configuration.document_extractor).toBe("pdfium-tesseract");
  expect(configuration.ai_provider).toBe("ollama");
  expect(configuration.hosted).toBe(false);
});

async function uploadThroughIntake(page: Page, filename: string) {
  await page
    .locator("#referral-file")
    .setInputFiles(
      fileURLToPath(new URL(`../fixtures/${filename}`, import.meta.url)),
    );
  await expect(page).toHaveURL(/\/referrals\/[a-z0-9-]+$/, {
    timeout: 180_000,
  });
  await expect(
    page.getByRole("heading", { name: "Structured referral" }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  const response = await page.request.get(`/api/referrals/${id}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as ReferralDetail;
}

test("scan intake preserves OCR regions and requires review before FHIR routing", async ({
  page,
}) => {
  const referral = await uploadThroughIntake(page, "synthetic-scan.pdf");
  expect(referral.fields).toHaveLength(4);
  expect(referral.status).toBe("NEEDS_REVIEW");
  expect(
    referral.fields.every((field) =>
      field.evidence.every(
        (ref) => ref.region && ref.extraction_method === "ocr",
      ),
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeDisabled();
  await expect(
    page.getByText("OCR text matched.", { exact: false }),
  ).toBeVisible();
  const image = page.getByRole("img", {
    name: "Source document, page 1",
    exact: true,
  });
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("img", { name: "Selected evidence region", exact: true }),
  ).toBeVisible();
  expect(
    (await page.request.post(`/api/referrals/${referral.id}/route`)).status(),
  ).toBe(409);
  if (process.env.MEDBOT_VISUAL_QA === "1") {
    await mkdir("output/playwright", { recursive: true });
    await page.screenshot({
      path: `output/playwright/ocr-review-${test.info().project.name}.png`,
      fullPage: true,
    });
  }
  await approveSupportedFields(page);
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Route referral" }).click();
  await expect(page.getByText("Routed", { exact: true })).toBeVisible();
});

test("multipage evidence opens the correct page and can be inspected with page controls", async ({
  page,
}) => {
  const referral = await uploadThroughIntake(page, "synthetic-multipage.pdf");
  const dob = referral.fields.find(
    (field) => field.field_name === "patient.date_of_birth",
  )!;
  expect(dob.evidence[0]?.page).toBe(2);
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next page", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Selected evidence region" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Show selected evidence" }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Selected evidence region" }),
  ).toBeVisible();
});

test("an unreadable scan reports an actionable error without claiming extraction success", async ({
  page,
}) => {
  await page
    .locator("#referral-file")
    .setInputFiles(
      fileURLToPath(
        new URL("../fixtures/synthetic-unreadable.pdf", import.meta.url),
      ),
    );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "No readable text",
    { timeout: 70_000 },
  );
  await expect(
    page.getByText("Upload referral", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL("/");
});
