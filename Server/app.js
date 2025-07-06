const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public'))); // sirve tu index.html

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión a MongoDB:', err));

// Esquema de transacción
const transaccionSchema = new mongoose.Schema({
  tipo: String,
  fecha: String,
  banco: String,
  valor: Number,
  descripcion: String,
  comprobante: String,
});

const Transaccion = mongoose.model('Transaccion', transaccionSchema);

// Rutas API
app.get('/api/transacciones', async (req, res) => {
  const transacciones = await Transaccion.find().sort({ _id: -1 });
  res.json(transacciones);
});

app.post('/api/transacciones', async (req, res) => {
  try {
    const nueva = new Transaccion(req.body);
    await nueva.save();
    res.status(201).json(nueva);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar transacción' });
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
