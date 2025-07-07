const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session'); // <-- NUEVA DEPENDENCIA

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Para leer datos de formularios

// --- CONFIGURACIÓN DE SESIÓN ---
app.use(session({
  secret: process.env.SESSION_SECRET, // Una clave secreta para firmar la sesión
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' } // En producción (Render), la cookie será segura
}));


// --- MIDDLEWARE DE AUTENTICACIÓN ---
const isLoggedIn = (req, res, next) => {
  if (req.session.isLoggedIn) {
    return next(); // Si ha iniciado sesión, continúa
  }
  res.redirect('/login.html'); // Si no, redirige a la página de login
};

// Servir archivos estáticos (login.html, css, etc.)
app.use(express.static(path.join(__dirname, '../Public')));

// --- RUTAS PÚBLICAS (LOGIN/LOGOUT) ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Compara con las variables de entorno
  if (username === process.env.APP_USER && password === process.env.APP_PASSWORD) {
    req.session.isLoggedIn = true; // Marca la sesión como iniciada
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

// --- PÁGINA PRINCIPAL PROTEGIDA ---
// Ahora la raíz '/' está protegida por isLoggedIn
app.get('/', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, '../Public/index.html'));
});


// --- RUTAS DE LA API PROTEGIDAS ---
const transaccionSchema = new mongoose.Schema({ /* ... (sin cambios) */ });
const Transaccion = mongoose.model('Transaccion', transaccionSchema);

// Todas las rutas de la API ahora usan isLoggedIn
app.get('/api/transacciones', isLoggedIn, async (req, res) => { /* ... (sin cambios) */ });
app.post('/api/transacciones', isLoggedIn, async (req, res) => { /* ... (sin cambios) */ });
app.put('/api/transacciones/:id', isLoggedIn, async (req, res) => { /* ... (sin cambios) */ });
app.delete('/api/transacciones/:id', isLoggedIn, async (req, res) => { /* ... (sin cambios) */ });


// --- El resto del código de rutas y servidor ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión a MongoDB:', err));
app.listen(PORT, () => console.log(`Servidor activo en http://localhost:${PORT}`));