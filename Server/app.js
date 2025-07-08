const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración de Sesión
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Middleware de Autenticación
const isLoggedIn = (req, res, next) => {
  if (req.session.isLoggedIn) {
    return next();
  }
  res.redirect('/login.html');
};

// Servir archivos estáticos (login.html, css, etc.)
app.use(express.static(path.join(__dirname, '../Public')));

// Rutas Públicas (Login/Logout)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.APP_USER && password === process.env.APP_PASSWORD) {
    req.session.isLoggedIn = true;
    res.redirect('/'); // Redirige a la página principal de la app
  } else {
    res.send('Usuario o contraseña incorrectos. <a href="/login.html">Intentar de nuevo</a>');
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

// --- PÁGINA PRINCIPAL PROTEGIDA (CORREGIDA) ---
// Ahora la raíz '/' está protegida y sirve el archivo app.html
app.get('/', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, '../Public/app.html'));
});

// --- RUTAS DE LA API (YA PROTEGIDAS) ---
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

app.get('/api/transacciones', isLoggedIn, async (req, res) => {
  const transacciones = await Transaccion.find().sort({ _id: -1 });
  res.json(transacciones);
});

app.post('/api/transacciones', isLoggedIn, async (req, res) => {
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

app.put('/api/transacciones/:id', isLoggedIn, async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, comprobante } = req.body;
    const transaccion = await Transaccion.findById(id);
    if (!transaccion) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }
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

app.delete('/api/transacciones/:id', isLoggedIn, async (req, res) => {
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