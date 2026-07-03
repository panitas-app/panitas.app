import { test, expect } from "@playwright/test"

test.describe("Smoke tests", () => {
  test("Landing page loads", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("text=PANITAS").first()).toBeVisible()
    await expect(page.locator("text=Monta tu tienda en línea")).toBeVisible()
  })

  test("Pricing page shows plans", async ({ page }) => {
    await page.goto("/pricing")
    await expect(page.locator("text=Grátis")).toBeVisible()
    await expect(page.locator("text=Básico")).toBeVisible()
    await expect(page.locator("text=Avanzado")).toBeVisible()
  })

  test("Login page has form", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button:has-text("Entrar")')).toBeVisible()
  })

  test("Register page loads", async ({ page }) => {
    await page.goto("/register")
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})
