import { readCookie, verifySessionCookie } from "../lib/session.js";
import { generarDNIUnico } from "../lib/dni-helpers.js";

async function getSesion(request, env) {
  const cookieValue = readCookie(request, "chicagorp_session");
  return verifySessionCookie(cookieValue, env.SESSION_SECRET);
}

function tieneRol(session, env, variable) {
  if (!session) return false;
  const roles = (env[variable] || "").split(",").map((r) => r.trim()).filter(Boolean);
  return session.roles.some((r) => roles.includes(r));
}

// GET /api/dni -> tu propia cedula
// GET /api/dni?buscar=texto -> buscar (solo Policia y Staff)
export async function onRequestGet({ request, env }) {
  const session = await getSesion(request, env);
  if (!session) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const url = new URL(request.url);
  const buscar = (url.searchParams.get("buscar") || "").trim();

  if (buscar) {
    const esPolicia = tieneRol(session, env, "POLICIA_ROLE_IDS");
    const esStaff = tieneRol(session, env, "STAFF_ROLE_IDS");
    if (!esPolicia && !esStaff) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
    }

    const { results } = await env.DB.prepare(
      `SELECT id, nombre_ic, apellidos, edad, nacionalidad, dni, foto, discord_username
       FROM ciudadanos
       WHERE nombre_ic LIKE ? OR apellidos LIKE ? OR dni LIKE ? OR discord_username LIKE ?
       ORDER BY id DESC`
    )
      .bind(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`, `%${buscar}%`)
      .all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sin buscar: devuelve la cedula propia
  const propia = await env.DB.prepare(
    "SELECT nombre_ic, apellidos, edad, nacionalidad, dni, foto FROM ciudadanos WHERE discord_username = ?"
  )
    .bind(session.username)
    .first();

  return new Response(JSON.stringify({ propia: propia || null }), {
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/dni -> crea o actualiza tu propia cedula
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const session = await getSesion(request, env);
  if (!session) {
    return Response.redirect(`${url.origin}/?acceso=denegado`, 302);
  }

  const data = await request.formData();
  const nombre_ic = (data.get("nombre_ic") || "").toString().trim();
  const apellidos = (data.get("apellidos") || "").toString().trim();
  const edad = (data.get("edad") || "").toString().trim();
  const nacionalidad = (data.get("nacionalidad") || "").toString().trim();
  const foto = (data.get("foto") || "").toString();

  if (!nombre_ic || !apellidos || !edad || !nacionalidad) {
    return Response.redirect(`${url.origin}/dni/`, 302);
  }

  const existente = await env.DB.prepare(
    "SELECT dni FROM ciudadanos WHERE discord_username = ?"
  )
    .bind(session.username)
    .first();

  if (existente) {
    await env.DB.prepare(
      "UPDATE ciudadanos SET nombre_ic = ?, apellidos = ?, edad = ?, nacionalidad = ?, foto = ? WHERE discord_username = ?"
    )
      .bind(nombre_ic, apellidos, edad, nacionalidad, foto, session.username)
      .run();
  } else {
    const dni = await generarDNIUnico(env);
    const fecha = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO ciudadanos (discord_username, nombre_ic, apellidos, edad, nacionalidad, dni, foto, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(session.username, nombre_ic, apellidos, edad, nacionalidad, dni, foto, fecha)
      .run();
  }

  return Response.redirect(`${url.origin}/dni/`, 302);
}