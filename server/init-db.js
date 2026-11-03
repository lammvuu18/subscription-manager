/**
 * init-db.js - Tự động thực thi schema.sql để khởi tạo hoặc nâng cấp bảng trong PostgreSQL
 */

const fs = require("fs");
const path = require("path");
const pool = require("./src/config/db");

async function initDB() {
  const schemaPath = path.join(__dirname, "schema.sql");
  console.log("Đang đọc file schema từ:", schemaPath);

  try {
    const sql = fs.readFileSync(schemaPath, "utf-8");
    console.log("Đang thực thi các câu lệnh SQL vào CSDL...");
    await pool.query(sql);
    console.log("✅ Khởi tạo và cập nhật CSDL PostgreSQL thành công!");
  } catch (error) {
    console.error("❌ Lỗi khởi tạo CSDL:", error);
  } finally {
    await pool.end();
  }
}

initDB();
