const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

const app = express();

// Connect to database
connectDB().catch((err) => {
  console.error('Failed to connect to database on startup');
});

// ======================
// ✅ CORS CONFIG (FIXED)
// ======================
const allowedOrigins = [
  "http://localhost:3000",
  "https://ams-attendance-management.web.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed for this origin"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Handle preflight requests
app.options("*", cors());

// ======================
// ✅ MIDDLEWARE
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ======================
// ✅ ROUTES
// ======================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));

// ======================
// ✅ HEALTH CHECK
// ======================
app.get('/', (req, res) => {
  res.send('Backend is working');
});
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

// ======================
// ✅ ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

// ======================
// ✅ START SERVER
// ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});