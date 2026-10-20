import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import type {
  PersonalAISettings,
  ReferralDetail,
} from "../../src/lib/contracts";
import { approveSupportedFields, signInWithLocalKeycloak } from "./local-oidc";

test.skip(
  process.env.MEDBOT_REAL_EXTRACTION_E2E !== "1",
  "Requires real local OCR/model Compose stack.",
);
const key = "synthetic-browser-key-not-valid-for-any-provider";

test.beforeEach(async ({ page }) => {
  await signInWithLocalKeycloak(page, true);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "AI settings", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Provider", { exact: true })).toBeEnabled();
});

test.afterEach(async ({ page }) => {
  let response = await page.request.get("/api/settings/ai");
  if (!response.ok()) return;
  let state = (await response.json()) as PersonalAISettings;
  for (const provider of state.configured_keys) {
    response = await page.request.post("/api/settings/ai/remove-key", {
      data: { provider, revision: state.revision },
    });
    expect(response.ok()).toBeTruthy();
    state = (await response.json()) as PersonalAISettings;
  }
  expect(
    (
      await page.request.post("/api/settings/ai/use-defaults", {
        data: { revision: state.revision },
      })
    ).ok(),
  ).toBeTruthy();
});

test("personal hosted keys can be saved, replaced and removed without returning secrets", async ({
  page,
}) => {
  for (const provider of ["openai", "gemini"] as const) {
    await page.getByLabel("Provider", { exact: true }).selectOption(provider);
    await page
      .getByLabel("Model name", { exact: true })
      .fill("synthetic-contract-model");
    await expect(
      page.getByRole("button", { name: "Save settings", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByText("Extracted document text will be sent", { exact: false }),
    ).toBeVisible();
    await page.getByLabel("API key", { exact: true }).fill(key);
    const saving = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/settings/ai") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save settings", exact: true })
      .click();
    const saved = await saving;
    expect(saved.status()).toBe(200);
    expect(await saved.text()).not.toContain(key);
    await expect(page.getByText("Key saved", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Replace API key")).toHaveValue("");
    await page.reload();
    await expect(page.getByText("Key saved", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Replace API key")).toHaveValue("");
    expect(await page.locator("body").innerText()).not.toContain(key);
    // Blank key input retains the encrypted key; replacing it is a separate explicit save.
    await page.getByLabel("Replace API key").fill(`${key}-replacement`);
    await page
      .getByRole("button", { name: "Save settings", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Settings saved");
    if (process.env.MEDBOT_VISUAL_QA === "1" && provider === "openai") {
      await mkdir("output/playwright", { recursive: true });
      await page
        .getByRole("heading", { name: "AI settings", exact: true })
        .scrollIntoViewIfNeeded();
      await page.locator("#main-content").evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        (document.activeElement as HTMLElement)?.blur();
      });
      await page.screenshot({
        path: `output/playwright/ai-settings-${test.info().project.name}.png`,
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Remove saved key" }).click();
    await expect(page.getByText("No key saved", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save settings", exact: true }),
    ).toBeDisabled();
  }
});

test("personal Ollama choice drives scan intake through review and actual FHIR routing", async ({
  page,
}) => {
  const state = (await (
    await page.request.get("/api/settings/ai")
  ).json()) as PersonalAISettings;
  expect(state.configuration.ai_provider).toBe("ollama");
  const model = state.configuration.ai_model!;
  await page.getByLabel("Provider", { exact: true }).selectOption("ollama");
  await page.getByLabel("Model name").fill(model);
  await expect(page.getByLabel("API key", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByText("Using your selection", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Model name")).toHaveValue(model);
  await page.getByRole("link", { name: "Referrals", exact: true }).click();
  await page
    .locator("#referral-file")
    .setInputFiles(
      fileURLToPath(new URL("../fixtures/synthetic-scan.pdf", import.meta.url)),
    );
  await expect(page).toHaveURL(/\/referrals\/[a-z0-9-]+$/, {
    timeout: 180_000,
  });
  await expect(
    page.getByRole("heading", { name: "Structured referral" }),
  ).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  const referral = (await (
    await page.request.get(`/api/referrals/${id}`)
  ).json()) as ReferralDetail;
  expect(referral.fields).toHaveLength(4);
  expect(referral.status).toBe("NEEDS_REVIEW");
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeDisabled();
  await approveSupportedFields(page);
  await expect(
    page.getByRole("button", { name: "Route referral" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Route referral" }).click();
  await expect(page.getByText("Routed", { exact: true })).toBeVisible();
});
