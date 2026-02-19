// ============================================
// Tester Backend - Proyecto Laboratorio
// Node 18+ (fetch nativo)
// ============================================

const BACKEND_URL = "http://localhost:3000";

async function main() {
  console.log("======================================");
  console.log("🔍 Probando Backend del Laboratorio");
  console.log("======================================\n");

  //  Status
  console.log("[1] GET /api/status");
  let res = await fetch(`${BACKEND_URL}/api/status`);
  console.log(await res.json(), "\n");

  //  Listar usuarios
  console.log("[2] GET /api/usuarios");
  res = await fetch(`${BACKEND_URL}/api/usuarios`);
  const usuarios = await res.json();
  console.log(usuarios, "\n");

  //  Crear usuario
  console.log("[3] POST /api/usuarios");
  res = await fetch(`${BACKEND_URL}/api/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre: "Usuario Tester" }),
  });
  const nuevoUsuario = await res.json();
  console.log(nuevoUsuario, "\n");

  const usuarioId = nuevoUsuario.id;

  //  Listar turnos
  console.log("[4] GET /api/turnos");
  res = await fetch(`${BACKEND_URL}/api/turnos`);
  console.log(await res.json(), "\n");

  //  Crear turno
  console.log("[5] POST /api/turnos");
  res = await fetch(`${BACKEND_URL}/api/turnos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fecha: "2025-06-01",
      usuario_id: usuarioId
    }),
  });
  const nuevoTurno = await res.json();
  console.log(nuevoTurno, "\n");

  const turnoId = nuevoTurno.id;

  //  Actualizar turno
  console.log("[6] PUT /api/turnos/:id");
  res = await fetch(`${BACKEND_URL}/api/turnos/${turnoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fecha: "2025-30-12",
      usuario_id: usuarioId
    }),
  });
  console.log(await res.json(), "\n");

  //  Eliminar turno
  console.log("[7] DELETE /api/turnos/:id");
  res = await fetch(`${BACKEND_URL}/api/turnos/${turnoId}`, {
    method: "DELETE"
  });
  console.log(await res.json(), "\n");

  //  API externa – feriados
  console.log("[8] GET /api/feriados");
  res = await fetch(`${BACKEND_URL}/api/feriados`);
  console.log(await res.json(), "\n");

  //  API externa – clima (Open-Meteo)
  console.log("[9] GET /api/clima");
  const FECHA_PRUEBA = "2025-06-01";
  async function testClima() {
    console.log("======================================");
    console.log("🌦️ Probando GET /api/clima");
    console.log("======================================\n");

    console.log(`[9] GET /api/clima?fecha=${FECHA_PRUEBA}`);

    const res = await fetch(
      `${BACKEND_URL}/api/clima?fecha=${FECHA_PRUEBA}`
    );

    const data = await res.json();

    console.log("Respuesta:");
    console.log(data, "\n");

    if (data.probabilidad_lluvia !== undefined) {
      console.log(
        `✔ Probabilidad de lluvia el ${FECHA_PRUEBA}: ${data.probabilidad_lluvia}%`
      );
    } else {
      console.log("❌ No se recibió probabilidad de lluvia");
    }

    console.log("======================================");
  }

  testClima().catch(err => {
    console.error("❌ Error en tester clima:", err);
  });

  console.log("======================================");
  console.log("✔ Pruebas completadas correctamente");
  console.log("======================================");
}

main().catch(err => {
  console.error("❌ Error en tester:", err);
});