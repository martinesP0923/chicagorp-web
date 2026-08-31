import { readCookie, verifySessionCookie } from "../lib/session.js";

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const cookieValue = readCookie(request, "chicagorp_session");
  const session = await verifySessionCookie(cookieValue, env.SESSION_SECRET);

  if (!session) {
    return Response.redirect(`${url.origin}/?acceso=denegado`, 302);
  }

  const allowedRoles = (env.POLICIA_ROLE_IDS || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const tieneAcceso = session.roles.some((r) => allowedRoles.includes(r));

  if (!tieneAcceso) {
    return new Response(
      JSON.stringify({
        env_crudo: env.POLICIA_ROLE_IDS,
        allowedRoles,
        sessionRoles: session.roles,
        tieneAcceso,
      }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  return next();
}