//Importacion de dependencias
const { default: axios } = require("axios");
const express = require("express");
const mysql = require("mysql2/promise");
const { fetchWeatherApi } = require("openmeteo");

//Configuracion de la conexion a la base de datos
const pool = mysql.createPool({
  host: "db",
  user: "root",
  password: "1234",
  database: "laboratorio",
});

//Configuracion del servidor Express
const app = express();

//Middlewares
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Permitir solicitudes desde cualquier origen
  res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS"); // Permitir estos métodos HTTP
  res.header("Access-Control-Allow-Headers", "Content-Type"); // Permitir este encabezado
  next();
});

app.get("/api/status", (req, res) => {
  res.json({ status: "OK" });
});

//Usuarios
app.get("/api/usuarios", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM usuarios");
  res.json(rows);
});

app.post("/api/usuarios", async (req, res) => {
  const { nombre } = req.body;
  const [result] = await pool.query("INSERT INTO usuarios (nombre) VALUES (?)", [
    nombre,
  ]);
  res.json({ id: result.insertId, nombre });
});

//Turnos
app.get("/api/turnos", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM turnos");
  res.json(rows);
});

app.post("/api/turnos", async (req, res) => {
  const { fecha, usuario_id } = req.body;
  const [result] = await pool.query(
    "INSERT INTO turnos (fecha, usuario_id) VALUES (?, ?)",
    [fecha, usuario_id]
  );
  res.json({ id: result.insertId, fecha, usuario_id });
});

app.put("/api/turnos/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, usuario_id } = req.body;
  await pool.query("UPDATE turnos SET fecha = ?, usuario_id = ? WHERE id = ?", [
    fecha,
    usuario_id,
    id
  ]);
  res.json({ id, fecha, usuario_id });
});

app.delete("/api/turnos/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM turnos WHERE id = ?", [id]);
  res.json({ message: "Turno eliminado" });
});

//Apis externas
app.get("/api/feriados", async (req, res) => {
  // /v1/feriados/{año}
  const response = await axios.get(
    "https://api.argentinadatos.com/v1/feriados/2025"
  );
  res.json(response.data);
});

app.get("/api/clima", async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return res.status(400).json({
        error: "Debe enviar la fecha en formato YYYY-MM-DD"
      });
    }

    const params = {
      latitude: -27.47,   // Corrientes Capital
      longitude: -58.83,
      daily: "precipitation_probability_max",
      timezone: "America/Argentina/Buenos_Aires"
    };

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);

    const response = responses[0];
    const daily = response.daily();

    // Fechas del forecast en YYYY-MM-DD
    const fechas = daily.time().map(
      t => new Date(t * 1000).toISOString().split("T")[0]
    );

    const index = fechas.indexOf(fecha);

    if (index === -1) {
      return res.status(404).json({
        error: "La fecha solicitada no está disponible en el pronóstico"
      });
    }

    const probLluvia = daily.variables(0).valuesArray()[index];

    res.json({
      ciudad: "Corrientes Capital",
      fecha,
      probabilidad_lluvia: probLluvia,
      alerta_lluvia: probLluvia > 60
        ? "Alta probabilidad de lluvia"
        : "Baja probabilidad de lluvia"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error al obtener datos del clima"
    });
  }
});

//Inicio del servidor
app.listen(3000, () => {
  console.log("Backend ejecutandose en el puerto 3000");
});