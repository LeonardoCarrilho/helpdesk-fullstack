import {test,expect} from "@playwright/test";
for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test.describe("jornada em " + viewport.width + "px", () => {
    test.use({ viewport });
test("solicitante do demo não acessa administração",async({page})=>{
 await page.goto("./");
 await page.getByRole("button",{name:/Carla Mendes/}).click();
 await expect(page.getByRole("heading",{name:"Meus chamados"})).toBeVisible();
 await page.goto("./#/usuarios");
 await expect(page.getByText("Área restrita",{exact:true})).toBeVisible();
});

  });
}
