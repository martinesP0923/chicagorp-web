import { readCookie, verifySessionCookie } from "../lib/session.js";
import { resolverDiscordUsername, buscarDiscordUsernames } from "../lib/dni-helpers.js";

async function getSesion(request, env) {
  const cookieValue = readCookie(request, "chicagorp_session");
  return verifySessionCookie(cookieValue, env.SESSION_SECRET);
}

function tieneRol(session, env, variable) {
  if (!session) return false;
  const roles = (env[variable] || "").split(",").map((r) => r.trim()).filter(Boolean);
  return session.roles.some((r) => roles.includes(r));
}

// GET /api/multas?buscar=texto -> busca por Discord, Nombre IC o DNI
export async function onRequestGet({ request, env }) {
  const session = await getSesion(request, env);
  const esPolicia = tieneRol(session, env, "POLICIA_ROLE_IDS");
  const esStaff = tieneRol(session, env, "STAFF_ROLE_IDS");

  if (!esPolicia && !esStaff) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const url = new URL(request.url);
  const buscar = (url.searchParams.get("buscar") || "").trim();

  let query;
  if (buscar) {
    const coincidencias = await buscarDiscordUsernames(env, buscar);
    const placeholders = coincidencias.map(() => "?").join(",");
    const sql = `SELECT id, ciudadano, motivo, monto, oficial, fecha FROM multas
                 WHERE ciudadano LIKE ?${coincidencias.length ? ` OR ciudadano IN (${placeholders})` : ""}
                 ORDER BY id DESC`;
    query = env.DB.prepare(sql).bind(`%${buscar}%`, ...coincidencias);
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

// POST /api/multas -> registra usando Discord, Nombre IC o DNI
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const session = await getSesion(request, env);

  if (!tieneRol(session, env, "POLICIA_ROLE_IDS")) {
    return Response.redirect(`${url.origin}/?acceso=denegado`, 302);
  }

  const data = await request.formData();
  const identificador = (data.get("identificador") || "").toString().trim();
  const motivo = (data.get("motivo") || "").toString().trim();
  const monto = (data.get("monto") || "").toString().trim();

  if (!identificador || !motivo || !monto) {
    return Response.redirect(`${url.origin}/multas/`, 302);
  }

  const ciudadano = await resolverDiscordUsername(env, identificador);
  const fecha = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO multas (ciudadano, motivo, monto, oficial, fecha) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(ciudadano, motivo, monto, session.username, fecha)
    .run();

  return Response.redirect(`${url.origin}/multas/`, 302);
}

// PUT /api/multas -> editar (solo Staff)
export async function onRequestPut({ request, env }) {
  const session = await getSesion(request, env);
  if (!tieneRol(session, env, "STAFF_ROLE_IDS")) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const body = await request.json();
  const { id, ciudadano, motivo, monto } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: "Falta id" }), { status: 400 });
  }

  await env.DB.prepare(
    "UPDATE multas SET ciudadano = ?, motivo = ?, monto = ? WHERE id = ?"
  )
    .bind(ciudadano, motivo, monto, id)
    .run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

// DELETE /api/multas?id=5 -> eliminar (solo Staff)
export async function onRequestDelete({ request, env }) {
  const session = await getSesion(request, env);
  if (!tieneRol(session, env, "STAFF_ROLE_IDS")) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "Falta id" }), { status: 400 });
  }

  await env.DB.prepare("DELETE FROM multas WHERE id = ?").bind(id).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}