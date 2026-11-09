require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./src/config/database');
const testRoutes =  require('./src/routes/test')
const productRoutes = require('./src/routes/productRoutes');
const laundryRoutes = require('./src/routes/laundryRoutes');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* Middleware */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* Root route */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Laundry API is running',
    endpoints: {
      customers: '/api/laundry/customers',
      services: '/api/laundry/services',
      orders: '/api/laundry/orders',
    },
  });
});

/* Routes */
app.use('/api/test', testRoutes)
app.use('/api/products', productRoutes);
app.use('/api/laundry', laundryRoutes);

/* 404 */
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

/* Start */
(async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
  });
})();