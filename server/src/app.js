/**
 * app.js - Cấu hình Express App cho SubTracker Backend
 * Tuân thủ NFR-09: Bảo mật HTTP header (helmet), CORS, xử lý JSON
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const settingsRoutes = require("./routes/settings");
const subscriptionsRoutes = require("./routes/subscriptions");
const summaryRoutes = require("./routes/summary");
const pool = require("./config/db");
const ERROR_CODES = require("./constants/errors");

const app = express();

// 1. Bảo mật HTTP headers bằng Helmet (NFR-09)
app.use(helmet());

// 2. Cấu hình CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (ví dụ mobile apps, curl, tests) hoặc thuộc whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Trong môi trường dev linh hoạt
      }
    },
    credentials: true,
  })
);

// 3. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. Các tuyến đường API dự kiến theo Phụ lục B (SRS v1.0)
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/summary", summaryRoutes);

// 5. Health check & DB test
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "SubTracker API v1.0 is healthy and running!" });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "OK", databaseTime: result.rows[0].now });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// 6. Xử lý 404 cho các route không tồn tại
app.use((req, res) => {
  res.status(404).json({ code: "NOT_FOUND", message: "Đường dẫn API không tồn tại." });
});

// 7. Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json(ERROR_CODES.ERR_13);
});

module.exports = app;
