import {test,expect} from "@playwright/test";
test("solicitante do demo não acessa administração",async({page})=>{
 await page.goto("./");
 await page.getByRole("button",{name:/Carla Mendes/}).click();
 await expect(page.getByRole("heading",{name:"Meus chamados"})).toBeVisible();
 await page.goto("./#/usuarios");
 await expect(page.getByText("Área restrita",{exact:true})).toBeVisible();
});
