const express = require('express');
const cors = require('cors');

const clusterRoutes = require('./routes/clusterRoutes');
const ingestRoutes = require('./routes/ingestRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/', clusterRoutes);
app.use('/ingest', ingestRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the News Pulse API',
    status: 'online',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'API route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
