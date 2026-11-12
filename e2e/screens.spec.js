import { test, expect } from "@playwright/test";

// Exercise the existing browser-only demo; never signs into a production account.
for (const width of [390, 1440]) {
  test(`all workspaces remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto("./");
    await page.getByRole("tab", { name: "Criar conta" }).click();
    await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
    await page.screenshot({ path: `.taste-skill/screens/register-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.screenshot({ path: `.taste-skill/screens/validation-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: /Leonardo Carrilho/ }).click();
    for (const route of ["chamados", "painel", "novo", "usuarios", "categorias", "chamados/1"]) {
      await page.goto(`./#/${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator(".carregando")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      await page.screenshot({ path: `.taste-skill/screens/${route.replaceAll("/", "-")}-${width}.png`, fullPage: true });
      if (route === "chamados") {
        await page.getByPlaceholder("Buscar por título ou descrição").fill("nenhum-resultado-visual");
        await expect(page.getByText("Nenhum chamado com esses filtros", { exact: true })).toBeVisible();
        await page.screenshot({ path: `.taste-skill/screens/empty-${width}.png`, fullPage: true });
      }
    }
    await page.getByRole("button", { name: "Editar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeVisible();
    await page.screenshot({ path: `.taste-skill/screens/edit-ticket-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await page.goto("./#/categorias");
    await page.getByRole("button", { name: "Editar", exact: true }).first().click();
    await expect(page.getByLabel("Novo nome da categoria")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.screenshot({ path: `.taste-skill/screens/edit-category-${width}.png`, fullPage: true });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("./#/painel");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator(".carregando")).toHaveCount(0);
    await page.screenshot({ path: `.taste-skill/screens/dark-panel-${width}.png`, fullPage: true });
  });
}
