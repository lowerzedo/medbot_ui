import { expect, type Page } from "@playwright/test";

export async function signInWithLocalKeycloak(
  page: Page,
  settingsUser = false,
) {
  await page.goto("/login");
  await page.getByRole("link", { name: "Sign in with Keycloak" }).click();
  await page
    .locator("#username")
    .fill(settingsUser ? "synthetic-settings-alpha" : "synthetic-admin-alpha");
  await page
    .locator("#password")
    .fill(
      settingsUser
        ? "local-only-settings-password"
        : "local-only-admin-password",
    );
  await page.locator("#kc-login").click();
  await expect(page).toHaveURL("/");
  const session = await page.request.get("/api/session");
  expect(session.status()).toBe(200);
  expect(((await session.json()) as { auth_method: string }).auth_method).toBe(
    "oidc",
  );
}

export async function approveSupportedFields(page: Page) {
  const pending = page
    .getByRole("button", { name: "Approve value", exact: true })
    .and(page.locator("button:enabled"));
  while (await pending.count()) {
    const count = await pending.count();
    await pending.first().click();
    await expect(pending).toHaveCount(count - 1);
  }
}
