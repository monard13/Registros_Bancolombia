const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../Public')));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error de conexión a MongoDB:', err));

const transaccionSchema = new mongoose.Schema({
  tipo: String,
  fecha: String,
  banco: String,
  valor: Number,
  descripcion: String,
  comprobante: String,
  estado: {
    type: String,
    default: 'confirmado'
  }
});

const Transaccion = mongoose.model('Transaccion', transaccionSchema);

// Ruta para OBTENER todas las transacciones
app.get('/api/transacciones', async (req, res) => {
  const transacciones = await Transaccion.find().sort({ _id: -1 });
  res.json(transacciones);
});

// Ruta para CREAR una nueva transacción
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

// --- ¡NUEVA RUTA PARA EDITAR! ---
app.put('/api/transacciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, comprobante } = req.body;

    const transaccion = await Transaccion.findById(id);
    if (!transaccion) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    // Actualizar campos
    transaccion.descripcion = descripcion;
    transaccion.comprobante = comprobante;

    // Si es un ingreso y ahora tiene un comprobante, se confirma
    if (transaccion.tipo === 'Ingreso' && (comprobante && comprobante.trim() !== '')) {
      transaccion.estado = 'confirmado';
    }

    await transaccion.save();
    res.json(transaccion);

  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la transacción' });
  }
});


// Ruta para ELIMINAR una transacción
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