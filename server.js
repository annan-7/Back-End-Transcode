const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');

// Import routes
const uploadRoutes = require('./routes/upload');
const transcodeRoutes = require('./routes/transcode');
const statusRoutes = require('./routes/status');

const app = express();
const PORT = process.env.PORT || 3000;

// Create necessary directories
const dirs = [
  'uploads',
  'transcoded',
  'temp'
];

dirs.forEach(dir => {
  fs.ensureDirSync(dir);
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for transcoded videos
app.use('/videos', express.static(path.join(__dirname, 'transcoded')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/transcode', transcodeRoutes);
app.use('/api/status', statusRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Transcoding API server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`📁 Transcoded directory: ${path.join(__dirname, 'transcoded')}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app; 