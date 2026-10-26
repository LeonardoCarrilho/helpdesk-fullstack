import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
