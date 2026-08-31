import { readCookie, verifySessionCookie } from "../lib/session.js";

async function esPolicia(request, env) {
  const cookieValue = readCookie(request, "chicagorp_session");
  const session = await verifySessionCookie(cookieValue, env.SESSION_SECRET);
  if (!session) return { ok: false };

  const allowedRoles = (env.POLICIA_ROLE_IDS || "").split(",").map((r) => r.trim()).filter(Boolean);
  const tieneAcceso = session.roles.some((r) => allowedRoles.includes(r));
  return { ok: tieneAcceso, session };
}

// GET /api/multas?buscar=nombre -> lista de multas (solo Policia), opcionalmente filtrada
export async function onRequestGet({ request, env }) {
  const { ok } = await esPolicia(request, env);
  if (!ok) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const url = new URL(request.url);
  const buscar = (url.searchParams.get("buscar") || "").trim();

  let query;
  if (buscar) {
    query = env.DB.prepare(
      "SELECT id, ciudadano, motivo, monto, oficial, fecha FROM multas WHERE ciudadano LIKE ? ORDER BY id DESC"
    ).bind(`%${buscar}%`);
  } else {
    query = env.DB.prepare(
      "SELECT id, ciudadano, motivo, monto, oficial, fecha FROM multas ORDER BY id DESC"
    );
  }

  const { results } = await query.all();
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/multas -> crea una multa nueva (solo Policia)
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const { ok, session } = await esPolicia(request, env);
  if (!ok) {
    return Response.redirect(`${url.origin}/?acceso=denegado`, 302);
  }

  const data = await request.formData();
  const ciudadano = (data.get("ciudadano") || "").toString().trim();
  const motivo = (data.get("motivo") || "").toString().trim();
  const monto = (data.get("monto") || "").toString().trim();

  if (!ciudadano || !motivo || !monto) {
    return Response.redirect(`${url.origin}/multas/`, 302);
  }

  const fecha = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO multas (ciudadano, motivo, monto, oficial, fecha) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(ciudadano, motivo, monto, session.username, fecha)
    .run();

  return Response.redirect(`${url.origin}/multas/`, 302);
}