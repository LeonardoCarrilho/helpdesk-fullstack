import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
Object.assign(process.env, { NODE_ENV: "production", PUBLIC_ORIGIN: "https://app.example.com", CORS_ORIGIN: "https://app.example.com", TRUSTED_PROXIES: "loopback", JWT_SECRET: "test-only-production-config-32-characters", DB_PASSWORD: "test-only-db-password" });
const { criarApp } = await import("../src/app.js");
const { criarRepositoriosMemoria } = await import("../src/repositories/memory.js");
test("sessão de produção é HttpOnly e mutações exigem origem", async () => {
 const app=criarApp({repos:criarRepositoriosMemoria()});
 const data={name:"Pessoa Teste",email:"cookie@example.com",password:"test-only-password"};
 await request(app).post("/api/auth/register").set("X-Forwarded-Proto","https").set("Origin","https://evil.example").send(data).expect(403);
 const response=await request(app).post("/api/auth/register").set("X-Forwarded-Proto","https").set("Origin","https://app.example.com").send(data).expect(201);
 assert.equal(response.body.data.token,undefined);
 const cookie=response.headers["set-cookie"][0];
 for(const flag of ["HttpOnly","Secure","SameSite=Strict"]) assert.ok(cookie.includes(flag));
 await request(app).get("/api/me").set("X-Forwarded-Proto","https").set("Cookie",cookie.split(";")[0]).expect(200);
 await request(app).post("/api/auth/logout").set("X-Forwarded-Proto","https").set("Cookie",cookie.split(";")[0]).expect(403);
});

