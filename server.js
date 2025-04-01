const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de la base de datos
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bootcampgym_db"
});

// Conectar a MySQL
db.connect((err) => {
    if (err) {
        console.error("❌ Error de conexión a MySQL:", err);
        return;
    }
    console.log("✅ Conectado a la base de datos MySQL");
});

// Utilizar el envoltorio de promesas de mysql2
const query = db.promise().query.bind(db.promise());

// Endpoint para obtener clientes con tipo de membresía
app.get("/clientes", async (req, res) => {
    try {
        const sql = `
            SELECT c.usuarioID, c.identificacion, c.nombres, c.apellidos, 
                   DATE_FORMAT(c.nacimiento, '%Y-%m-%d') AS nacimiento, 
                   c.correo, c.telefono, c.direccion, c.rh, 
                   DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha, 
                   m.tipomembresia AS tipo_membresia
            FROM clientes c
            LEFT JOIN membresias m ON c.membresia_id = m.id
        `;
        const [results] = await query(sql);
        res.json(results);
    } catch (err) {
        console.error("❌ Error al obtener clientes con membresía:", err);
        res.status(500).json({ error: "Error al obtener clientes con membresía", details: err.message });
    }
});

// Endpoint para insertar cliente y contacto de emergencia en una sola transacción
app.post("/agregar-cliente-contacto", async (req, res) => {
    const { cliente, contacto } = req.body;

    if (!cliente || !contacto) {
        return res.status(400).json({ mensaje: "❌ Datos incompletos." });
    }

    try {
        // Formatear fechas a YYYY-MM-DD
        cliente.nacimiento = cliente.nacimiento.split("T")[0];
        cliente.fecha = cliente.fecha.split("T")[0];

        // Iniciar transacción
        await query("START TRANSACTION");

        // Insertar el cliente en la tabla 'clientes'
        const [clienteResult] = await query(
            "INSERT INTO clientes (identificacion, nombres, apellidos, nacimiento, correo, telefono, direccion, rh, fecha, membresia_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [cliente.identificacion, cliente.nombres, cliente.apellidos, cliente.nacimiento, cliente.correo, cliente.telefono, cliente.direccion, cliente.rh, cliente.fecha, cliente.membresia_id]
        );

        const usuarioID = clienteResult.insertId; // ID del cliente recién insertado

        // Insertar el contacto de emergencia en la tabla 'contactoemergencia'
        await query(
            "INSERT INTO contactoemergencia (usuarioID, nombres, apellidos, correo, telefono, direccion, parentesco) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [usuarioID, contacto.nombres, contacto.apellidos, contacto.correo, contacto.telefono, contacto.direccion, contacto.parentesco]
        );

        // Confirmar transacción
        await query("COMMIT");

        res.json({ mensaje: "✅ Cliente y contacto de emergencia guardados correctamente." });

    } catch (error) {
        // Si hay error, revertir la transacción
        await query("ROLLBACK");
        console.error("❌ Error en la transacción:", error);
        res.status(500).json({ mensaje: "❌ Error en el servidor." });
    }
});

// Endpoint para obtener todas las membresías
app.get("/membresias", async (req, res) => {
    try {
        const sql = "SELECT id, tipomembresia, precio, duracion, descripcion FROM membresias";
        const [results] = await query(sql);
        res.json(results);
    } catch (err) {
        console.error("❌ Error al obtener membresías:", err);
        res.status(500).json({ error: "Error al obtener membresías" });
    }
});

// Endpoint para agregar una nueva membresía
app.post("/agregar-membresia", async (req, res) => {
    try {
        const { tipomembresia, precio, duracion, descripcion } = req.body;
        const sql = "INSERT INTO membresias (tipomembresia, precio, duracion, descripcion) VALUES (?, ?, ?, ?)";
        const [result] = await query(sql, [tipomembresia, precio, duracion, descripcion]);
        res.json({ mensaje: "✅ Membresía guardada correctamente", id: result.insertId });
    } catch (err) {
        console.error("❌ Error al guardar membresía:", err);
        res.status(500).json({ error: "Error al guardar membresía" });
    }
});

// Endpoint para obtener membresías con ID y tipo
app.get("/api/memberships", async (req, res) => {
    try {
        const sql = "SELECT id, tipomembresia FROM membresias";
        const [results] = await query(sql);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Iniciar el servidor en el puerto 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
