import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("login page renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "LAKEHOUSE" })).toBeVisible();
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("unauthenticated /dashboard redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/");
    await expect(page.getByPlaceholder("Enter password")).toBeVisible();
  });

  test("authenticated user is not redirected away from /pipeline", async ({ page, context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem("lh-auth", "true");
    });
    await page.goto("/pipeline");
    await expect(page).toHaveURL(/\/pipeline$/);
  });
});
