import { readCookie, verifySessionCookie } from "../lib/session.js";

async function getSesion(request, env) {
  const cookieValue = readCookie(request, "chicagorp_session");
  return verifySessionCookie(cookieValue, env.SESSION_SECRET);
}

function tieneRol(session, env, variable) {
  if (!session) return false;
  const roles = (env[variable] || "").split(",").map((r) => r.trim()).filter(Boolean);
  return session.roles.some((r) => roles.includes(r));
}

// GET /api/buscar-ciudadano?buscar=texto
export async function onRequestGet({ request, env }) {
  const session = await getSesion(request, env);
  const esPolicia = tieneRol(session, env, "POLICIA_ROLE_IDS");
  const esStaff = tieneRol(session, env, "STAFF_ROLE_IDS");

  if (!esPolicia && !esStaff) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const url = new URL(request.url);
  const buscar = (url.searchParams.get("buscar") || "").trim();

  if (!buscar) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { results: ciudadanos } = await env.DB.prepare(
    `SELECT discord_username, nombre_ic, apellidos, edad, nacionalidad, dni, foto
     FROM ciudadanos
     WHERE discord_username LIKE ? OR dni LIKE ? OR nombre_ic LIKE ? OR apellidos LIKE ?`
  )
    .bind(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`, `%${buscar}%`)
    .all();

  const perfiles = [];
  for (const c of ciudadanos) {
    const { results: multas } = await env.DB.prepare(
      "SELECT motivo, monto, oficial, fecha FROM multas WHERE ciudadano = ? ORDER BY id DESC"
    )
      .bind(c.discord_username)
      .all();

    const { results: arrestos } = await env.DB.prepare(
      "SELECT motivo, tiempo, oficial, fecha FROM arrestos WHERE ciudadano = ? ORDER BY id DESC"
    )
      .bind(c.discord_username)
      .all();

    perfiles.push({ ...c, multas, arrestos });
  }

  return new Response(JSON.stringify(perfiles), {
    headers: { "Content-Type": "application/json" },
  });
}