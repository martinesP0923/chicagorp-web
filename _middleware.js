import { readCookie, verifySessionCookie } from "../lib/session.js";

// Esto se ejecuta ANTES de mostrar cualquier página dentro de /staff/
export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const cookieValue = readCookie(request, "chicagorp_session");
  const session = await verifySessionCookie(cookieValue, env.SESSION_SECRET);

  if (!session) {
    return Response.redirect(`${url.origin}/?acceso=denegado`, 302);
  }

  // STAFF_ROLE_IDS es una variable de entorno con los IDs de rol permitidos,
  // separados por coma. Ej: "111111111111111111,222222222222222222"
  const allowedRoles = (env.STAFF_ROLE_IDS || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const tieneAcceso = session.roles.some((r) => allowedRoles.includes(r));

  if (!tieneAcceso) {
    return Response.redirect(`${url.origin}/?acceso=denegado`, 302);
  }

  return next();
}
