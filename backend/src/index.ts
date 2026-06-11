// ACB Actas de Reunión — API privada (Cloudflare Worker + D1)
// Todo acceso a datos pasa por aquí: el navegador nunca toca la base de datos.
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Variables } from "./tipos";
import auth from "./rutas/auth";
import usuarios from "./rutas/usuarios";
import clientes from "./rutas/clientes";
import obras from "./rutas/obras";
import actas from "./rutas/actas";
import { requiereAdmin, requiereAprobado, requiereSesion } from "./middleware/autenticacion";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS restringido a los orígenes del frontend (lista en wrangler.toml)
app.use("*", async (c, next) => {
  const permitidos = (c.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const aplicar = cors({
    origin: (origen) => (origen && permitidos.includes(origen) ? origen : permitidos[0] ?? ""),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
  return aplicar(c, next);
});

// Errores: nunca se filtran detalles internos al cliente
app.onError((err, c) => {
  console.error("Error no controlado:", err.message);
  return c.json({ error: "Error interno del servidor." }, 500);
});
app.notFound((c) => c.json({ error: "Ruta no encontrada." }, 404));

app.get("/", (c) => c.json({ servicio: "acb-actas-backend", estado: "ok" }));

// Autenticación (rutas públicas: registro y entrada)
app.route("/api/auth", auth);

// Datos: requieren sesión válida + cuenta aprobada
app.use("/api/clientes/*", requiereSesion, requiereAprobado);
app.use("/api/obras/*", requiereSesion, requiereAprobado);
app.use("/api/actas/*", requiereSesion, requiereAprobado);
app.route("/api/clientes", clientes);
app.route("/api/obras", obras);
app.route("/api/actas", actas);

// Administración de usuarios: solo admin
app.use("/api/usuarios/*", requiereSesion, requiereAdmin);
app.route("/api/usuarios", usuarios);

export default app;
