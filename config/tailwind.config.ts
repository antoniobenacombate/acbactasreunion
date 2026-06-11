import type { Config } from "tailwindcss";
import path from "node:path";

const raiz = path.resolve(__dirname, "..");

export default {
  content: [
    path.join(raiz, "frontend", "index.html"),
    path.join(raiz, "frontend", "src", "**", "*.{ts,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        // Sistema de diseño ACB (HSL, coherente con ACB_PORTALOBRA)
        fondo: "hsl(220 13% 95%)",
        superficie: "hsl(0 0% 100%)",
        tinta: "hsl(230 30% 14%)",
        "tinta-suave": "hsl(230 8% 45%)",
        primario: "hsl(220 76% 43%)",
        "primario-suave": "hsl(220 76% 95%)",
        acento: "hsl(0 73% 47%)",
        "acento-suave": "hsl(0 73% 95%)",
        ambar: "hsl(32 91% 44%)",
        "ambar-suave": "hsl(32 91% 95%)",
        verde: "hsl(145 64% 29%)",
        "verde-suave": "hsl(145 64% 93%)",
        borde: "hsl(232 12% 84%)",
      },
      borderRadius: { acb: "6px" },
      boxShadow: {
        acb: "0 1px 3px hsl(230 30% 14% / 0.12), 0 1px 2px hsl(230 30% 14% / 0.07)",
        "acb-md": "0 4px 12px hsl(230 30% 14% / 0.10), 0 2px 4px hsl(230 30% 14% / 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
