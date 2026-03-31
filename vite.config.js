import { resolve } from "node:path";
import { defineConfig } from "vite";

// Rutas relativas en el build: el JS/CSS cargan bien en GitHub Pages (proyecto en subruta)
// y al servir `dist/` sin estar en la raíz del dominio. Para repo en la raíz del sitio, puedes usar base: "/".
export default defineConfig({
  root: ".",
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        adminConsole: resolve(__dirname, "apps/admin-console/index.html"),
      },
    },
  },
});
