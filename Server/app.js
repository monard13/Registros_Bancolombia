const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares Esenciales ---
app.use(cors());
app.use(bodyParser.json());
// La siguiente línea es la clave para que el login funcione
app.use(bodyParser.urlencoded({ extended: true })); 

// Servir archivos estáticos PÚBLICOS (login.html, css, etc.)
// La página de login y sus estilos son públicos y no necesitan autenticación.
app.use(express.static(path.join(__dirname, '../Public')));

// --- Configuración de Sesión ---
// Debe ir después de los middlewares básicos y antes de las rutas que la usan.
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// --- Rutas Públicas de Autenticación ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.APP_USER && password === process.env.APP_PASSWORD) {
    req.session.isLoggedIn = true;
    res.redirect('/'); // Redirige a la página principal de la app
  } else {
    // Envía un script para mostrar una alerta y redirigir
    res.send('<script>alert("Usuario o contraseña incorrectos."); window.location.href="/login.html";</script>');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login.html');
  });
});

// --- Middleware de Autenticación (El "Guardia de Seguridad") ---
// Este middleware se aplicará a TODAS las rutas definidas después de él.
const isLoggedIn = (req, res, next) => {
  if (req.session.isLoggedIn) {
    return next();
  }
  res.redirect('/login.html');
};

// --- A partir de aquí, TODAS las rutas están protegidas ---
app.use(isLoggedIn);

// --- Rutas Protegidas ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../Public/app.html'));
});

// --- API (ya protegida por el app.use(isLoggedIn) de arriba) ---
const transaccionSchema = new mongoose.Schema({
  tipo: String,
  fecha: String,
  banco: String,
  valor: Number,
  descripcion: String,
  comprobante: String,
  estado: { type: String, default: 'confirmado' }
});
const Transaccion = mongoose.model('Transaccion', transaccionSchema);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión a MongoDB:', err));

app.get('/api/transacciones', async (req, res) => {
  const transacciones = await Transaccion.find().sort({ _id: -1 });
  res.json(transacciones);
});

app.post('/api/transacciones', async (req, res) => {
  try {
    const datosTransaccion = req.body;
    if (datosTransaccion.tipo === 'Ingreso' && (!datosTransaccion.comprobante || datosTransaccion.comprobante.trim() === '')) {
      datosTransaccion.estado = 'pendiente';
    } else {
      datosTransaccion.estado = 'confirmado';
    }
    const nueva = new Transaccion(datosTransaccion);
    await nueva.save();
    res.status(201).json(nueva);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar transacción' });
  }
});

app.put('/api/transacciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, comprobante } = req.body;
    const transaccion = await Transaccion.findById(id);
    if (!transaccion) return res.status(404).json({ error: 'Transacción no encontrada' });
    transaccion.descripcion = descripcion;
    transaccion.comprobante = comprobante;
    if (transaccion.tipo === 'Ingreso' && (comprobante && comprobante.trim() !== '')) {
      transaccion.estado = 'confirmado';
    }
    await transaccion.save();
    res.json(transaccion);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la transacción' });
  }
});

app.delete('/api/transacciones/:id', async (req, res) => {
  try {
    await Transaccion.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar transacción' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});