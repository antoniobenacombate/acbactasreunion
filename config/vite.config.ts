import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path from "node:path";

// Raíz del proyecto (un nivel por encima de config\)
const raiz = path.resolve(__dirname, "..");

export default defineConfig({
  // Rutas relativas: la app funciona en local y bajo subruta (GitHub Pages)
  base: "./",
  root: path.join(raiz, "frontend"),
  publicDir: path.join(raiz, "public"),
  plugins: [react()],
  resolve: {
    alias: { "@": path.join(raiz, "frontend", "src") },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss(path.join(raiz, "config", "tailwind.config.ts")),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: path.join(raiz, "dist"),
    emptyOutDir: true,
  },
  server: { port: 5180 },
});
