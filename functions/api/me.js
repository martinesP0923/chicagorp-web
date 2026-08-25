import { readCookie, verifySessionCookie } from "../lib/session.js";

// GET /api/me
// Le dice al navegador si el visitante tiene sesion activa, sin exponer la cookie.
export async function onRequestGet({ request, env }) {
  const cookieValue = readCookie(request, "chicagorp_session");
  const session = await verifySessionCookie(cookieValue, env.SESSION_SECRET);

  if (!session) {
    return new Response(JSON.stringify({ loggedIn: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      loggedIn: true,
      username: session.username,
      roles: session.roles,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}