const express = require('express');
const cors = require('cors');
require('dotenv').config();

//Importar rutas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const lotRoutes = require('./routes/lot.routes');
const movimientoRoutes = require('./routes/movimientos.routes');
const clientRoutes = require('./routes/client.routes');
const sowingRoutes = require('./routes/sowing.routes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/lot', lotRoutes)
app.use('/api/lot/:lote_id/movimiento', movimientoRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sowings', sowingRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ mensaje: "API FloraCore" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});