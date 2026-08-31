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