import { resolve } from "node:path";
import { defineConfig } from "vite";

// Rutas relativas en el build: el JS/CSS cargan bien en GitHub Pages (proyecto en subruta)
// y al servir `dist/` sin estar en la raíz del dominio. Para repo en la raíz del sitio, puedes usar base: "/".
export default defineConfig({
  root: ".",
  base: "./",
  server: {
    port: 5173,
    // Si 5173 está ocupado (otra terminal o Cursor), usa el siguiente libre (5174, …)
    strictPort: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        gmailOAuthCallback: resolve(__dirname, "gmail-oauth-callback.html"),
        adminConsole: resolve(__dirname, "apps/admin-console/index.html"),
        webinarsAssistant: resolve(
          __dirname,
          "apps/webinars-assistant/index.html"
        ),
        webinarsBuilder: resolve(
          __dirname,
          "apps/webinars-assistant/builder.html"
        ),
        webinarsMessages: resolve(
          __dirname,
          "apps/webinars-assistant/messages.html"
        ),
        webinarsViewer: resolve(
          __dirname,
          "apps/webinars-assistant/viewer.html"
        ),
        webinarsEntries: resolve(
          __dirname,
          "apps/webinars-assistant/entries.html"
        ),
        webinarsFormMessages: resolve(
          __dirname,
          "apps/webinars-assistant/form-messages.html"
        ),
      },
    },
  },
});
