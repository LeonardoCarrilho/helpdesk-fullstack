import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", use: { baseURL: "http://127.0.0.1:4173/helpdesk-fullstack/", headless: true }, webServer: { command: "npm run preview --workspace web -- --host 127.0.0.1 --port 4173", url: "http://127.0.0.1:4173/helpdesk-fullstack/", reuseExistingServer: false }, reporter: "list" });
