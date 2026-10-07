import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  publicDir: "public-browser",
  plugins: [react()],
  build: { target: "es2022", sourcemap: false, assetsInlineLimit: 0 },
  server: { host: "127.0.0.1", strictPort: true },
});
