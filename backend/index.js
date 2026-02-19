//Importacion de dependencias
const { default: axios } = require("axios");
const express = require("express");
const mysql = require("mysql2/promise");
const { fetchWeatherApi } = require("openmeteo");

const fs = require('fs'); // Maneja archivos, eliminar, sobreescribir, etc
const path = require('path'); //Se encarga de manejar correctamente las rutas

// Configuración de la conexión a la base de datos (se inicializa más abajo)
let pool;

async function initDatabase() {
  // Leer configuración desde variables de entorno (soporta docker-compose env)
  const dbHost = process.env.DB_HOST || 'db';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '1234';
  const dbName = process.env.DB_NAME || 'laboratorio';

  // Conectar sin nombre de base para crearla si hace falta.
  // MariaDB dentro de Docker puede tardar en estar lista, así que intentamos varias veces.
  const maxAttempts = 12;
  const retryDelayMs = 2000;
  let initConn;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      initConn = await mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPassword,
        multipleStatements: true
      });
      break;
    } catch (err) {
      console.log(`DB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, retryDelayMs));
    }
  }

  // Crear la base de datos si no existe
  await initConn.query('CREATE DATABASE IF NOT EXISTS laboratorio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');

  // Intentar cargar el esquema inicial desde el archivo init/01_schema.sql si existe
  const schemaPath = path.join(__dirname, '..', 'init', '01_schema.sql');
  try {
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      // Usar la BD y ejecutar el SQL del esquema
      await initConn.query('USE laboratorio; ' + schemaSql);
    }
  } catch (err) {
    console.warn('No se pudo ejecutar el esquema inicial:', err.message);
  }

  await initConn.end();

  // Crear el pool apuntando a la base de datos ya creada
  pool = mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10
  });
}

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
app.get("/api/users", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM users");
  res.json(rows);
});

app.post("/api/users", async (req, res) => {
  const { name } = req.body;
  const [result] = await pool.query("INSERT INTO users (name) VALUES (?)", [
    name,
  ]);
  res.json({ id: result.insertId, name });
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  await pool.query("UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?", [
    name,
    email,
    phone,
    id
  ]);
  res.json({ id, name, email, phone });
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM users WHERE id = ?", [id]);
  res.json({ message: "User eliminado" });
});

//Professionals
app.get("/api/professionals", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM professional");
  res.json(rows);
});

app.post("/api/professionals", async (req, res) => {
  const { name, email, phone, speciality } = req.body;
  const [result] = await pool.query("INSERT INTO professional (name, email, phone, speciality) VALUES (?, ?, ?, ?)", [
    name,
    email,
    phone,
    speciality
  ]);
  res.json({ id: result.insertId, name, email, phone, speciality });
});

app.put("/api/professionals/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, speciality } = req.body;
  await pool.query("UPDATE professional SET name = ?, email = ?, phone = ?, speciality = ? WHERE id = ?", [
    name,
    email,
    phone,
    speciality,
    id
  ]);
  res.json({ id, name, email, phone, speciality });
});

app.delete("/api/professionals/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM professional WHERE id = ?", [id]);
  res.json({ message: "Professional eliminado" });
});

//Turnos
app.get("/api/appointments", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM appointments");
  res.json(rows);
});

app.post("/api/appointments", async (req, res) => {
  const { scheduled_at, service, notes, user_id, professional_id } = req.body;
  if (user_id != null) {
    const [users] = await pool.query("SELECT id FROM users WHERE id = ?", [user_id]);
    if (users.length === 0) {
      return res.status(400).json({ error: "user_id no existe" });
    }
  }
  if (professional_id != null) {
    const [profs] = await pool.query("SELECT id FROM professional WHERE id = ?", [professional_id]);
    if (profs.length === 0) {
      return res.status(400).json({ error: "professional_id no existe" });
    }
  }

  const [result] = await pool.query(
    "INSERT INTO appointments (scheduled_at, service, notes, user_id, professional_id) VALUES (?, ?, ?, ?, ?)",
    [scheduled_at, service, notes, user_id, professional_id]
  );
  res.json({ id: result.insertId, scheduled_at, user_id, professional_id});
});

app.put("/api/appointments/:id", async (req, res) => {
  const { id } = req.params;
  const { scheduled_at, user_id, professional_id, service, status } = req.body;
  // Validate referenced user and professional exist (if provided)
  if (user_id != null) {
    const [users] = await pool.query("SELECT id FROM users WHERE id = ?", [user_id]);
    if (users.length === 0) {
      return res.status(400).json({ error: "user_id no existe" });
    }
  }
  if (professional_id != null) {
    const [profs] = await pool.query("SELECT id FROM professional WHERE id = ?", [professional_id]);
    if (profs.length === 0) {
      return res.status(400).json({ error: "professional_id no existe" });
    }
  }

  await pool.query("UPDATE appointments SET scheduled_at = ?, user_id = ?, professional_id = ?, service = ?, status = ? WHERE id = ?", [
    scheduled_at,
    user_id,
    professional_id,
    service,
    status,
    id
  ]);
  res.json({ id, scheduled_at, user_id, professional_id, service, status });
});

app.delete("/api/appointments/:id", async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM appointments WHERE id = ?", [id]);
  res.json({ message: "Appointment eliminado" });
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

// Inicio del servidor: inicializar DB y luego levantar Express
initDatabase()
  .then(() => {
    app.listen(3000, () => {
      console.log("Backend ejecutandose en el puerto 3000");
    });
  })
  .catch((err) => {
    console.error('Error inicializando la base de datos:', err);
    process.exit(1);
  });