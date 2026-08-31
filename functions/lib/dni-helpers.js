export function generarDNI() {
  let dni = "";
  for (let i = 0; i < 10; i++) {
    dni += Math.floor(Math.random() * 10);
  }
  return dni;
}

export async function generarDNIUnico(env) {
  for (let intento = 0; intento < 8; intento++) {
    const candidato = generarDNI();
    const existe = await env.DB.prepare("SELECT id FROM ciudadanos WHERE dni = ?")
      .bind(candidato)
      .first();
    if (!existe) return candidato;
  }
  throw new Error("No se pudo generar un DNI único");
}
// Busca un ciudadano por Discord, Nombre IC completo, o DNI, y devuelve su discord_username.
// Si no encuentra nada, devuelve el mismo texto tal como lo escribieron (por si aun no tiene DNI creado).
export async function resolverDiscordUsername(env, identificador) {
  const texto = identificador.trim();
  const fila = await env.DB.prepare(
    `SELECT discord_username FROM ciudadanos
     WHERE discord_username = ? OR dni = ? OR (nombre_ic || ' ' || apellidos) = ?`
  )
    .bind(texto, texto, texto)
    .first();

  return fila ? fila.discord_username : texto;
}

// Busca coincidencias parciales en ciudadanos (Discord, Nombre IC, Apellidos, DNI)
// y devuelve la lista de discord_username que coinciden.
export async function buscarDiscordUsernames(env, buscar) {
  const { results } = await env.DB.prepare(
    `SELECT discord_username FROM ciudadanos
     WHERE discord_username LIKE ? OR dni LIKE ? OR nombre_ic LIKE ? OR apellidos LIKE ?`
  )
    .bind(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`, `%${buscar}%`)
    .all();

  return results.map((r) => r.discord_username);
}