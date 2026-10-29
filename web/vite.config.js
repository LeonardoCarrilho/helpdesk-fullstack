import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), {
    name: "development-csp",
    apply: "serve",
    // O preâmbulo de HMR é inline; o build de produção mantém a CSP estrita.
    transformIndexHtml(html) { return html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, ""); },
  }],
  base: "/helpdesk-fullstack/",
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
