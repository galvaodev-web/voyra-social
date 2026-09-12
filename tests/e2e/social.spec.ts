import { test, expect } from "@playwright/test";
test("feed, descoberta, detalhe e demonstração honesta", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Sua próxima viagem começa com uma descoberta.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Vitrine de demonstração")).toBeVisible();
  await page.getByRole("button", { name: "Curtir publicação" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("demonstração");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .locator('.destination-card[href="/destinos/roma"]')
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Roma", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Ver experiência completa" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Converse com quem esteve lá" }),
  ).toBeVisible();
});
test("busca encontra destino e post", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Buscar destinos, pessoas e lugares" })
    .fill("Roma");
  await page
    .getByRole("textbox", { name: "Buscar destinos, pessoas e lugares" })
    .press("Enter");
  await expect(
    page.getByRole("heading", { name: "Descobertas para “Roma”" }),
  ).toBeVisible();
});
test("criação valida legenda e autenticação não simula sucesso", async ({
  page,
}) => {
  await page.goto("/criar");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(
    page.getByText("Conte um pouco mais sobre sua experiência."),
  ).toBeVisible();
  await page.getByLabel("Tipo de publicação").selectOption("TIP");
  await page
    .getByLabel("Sua história")
    .fill("Chegue cedo para aproveitar a cidade.");
  await page.getByRole("button", { name: "Publicar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Supabase");
});
for (const width of [320, 375, 390, 414, 768, 1024, 1440])
  test(`layout sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page.screenshot({
      path: `test-results/feed-${width}.png`,
      fullPage: width === 1440,
    });
  });
