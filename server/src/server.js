/**
 * server.js - Điểm khởi động HTTP Server của SubTracker
 */

require("dotenv").config();
const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

// Kiểm tra kết nối CSDL khi khởi động
pool
  .query("SELECT NOW()")
  .then((res) => {
    console.log("✅ Kết nối PostgreSQL thành công lúc:", res.rows[0].now);
  })
  .catch((err) => {
    console.warn("⚠️ Cảnh báo: Chưa kết nối được PostgreSQL:", err.message);
    console.warn("   Hãy đảm bảo PostgreSQL đã chạy và bảng được khởi tạo qua schema.sql.");
  });

app.listen(PORT, () => {
  console.log(`🚀 SubTracker Backend Server đang chạy tại: http://localhost:${PORT}`);
});
