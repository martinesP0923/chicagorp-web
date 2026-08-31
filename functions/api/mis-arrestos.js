import { readCookie, verifySessionCookie } from "../lib/session.js";

export async function onRequestGet({ request, env }) {
  const cookieValue = readCookie(request, "chicagorp_session");
  const session = await verifySessionCookie(cookieValue, env.SESSION_SECRET);

  if (!session) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const { results } = await env.DB.prepare(
    "SELECT id, motivo, tiempo, oficial, fecha FROM arrestos WHERE ciudadano = ? ORDER BY id DESC"
  )
    .bind(session.username)
    .all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}