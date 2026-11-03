/**
 * auth.js - Tuyến đường xác thực tài khoản (UC-08, UC-09, FR-12, FR-13)
 * Tuân thủ NFR-09: Bcrypt cost >= 10, JWT 60 phút, rate limit 5 lần sai/phút/IP (ERR-23)
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");
const ERROR_CODES = require("../constants/errors");
const { validateRegister, validateLogin } = require("../middleware/validate");
const { generateToken, authenticateToken } = require("../middleware/auth");

/**
 * Giới hạn đăng nhập: tối đa 5 lần mỗi phút từ 1 địa chỉ IP (ERR-23)
 */
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 5, // Tối đa 5 lần
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json(ERROR_CODES.ERR_23);
  },
});

// POST /api/auth/register (UC-08, FR-12)
router.post("/register", validateRegister, async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Kiểm tra email đã tồn tại chưa
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json(ERROR_CODES.ERR_16);
    }

    // 2. Băm mật khẩu bằng bcrypt (cost = 10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Bắt đầu transaction tạo user và settings mặc định
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
        [email, passwordHash]
      );
      const newUser = userResult.rows[0];

      // Tạo cấu hình tỷ giá mặc định 25.000 VNĐ / USD cho user
      await client.query(
        "INSERT INTO user_settings (user_id, exchange_rate) VALUES ($1, 25000.00)",
        [newUser.id]
      );

      await client.query("COMMIT");

      // 4. Sinh JWT token và trả kết quả
      const token = generateToken(newUser);

      return res.status(201).json({
        message: "Đăng ký tài khoản thành công",
        user: {
          id: newUser.id,
          email: newUser.email,
        },
        token,
        exchangeRate: 25000,
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Lỗi đăng ký tài khoản:", error);
    return res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// POST /api/auth/login (UC-09, FR-13)
router.post("/login", loginLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Tìm user theo email
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      // ERR-15: Không chỉ rõ sai email hay sai mật khẩu
      return res.status(401).json(ERROR_CODES.ERR_15);
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json(ERROR_CODES.ERR_15);
    }

    // Lấy tỷ giá của user
    const settingsRes = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [user.id]
    );
    const exchangeRate =
      settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].exchange_rate) : 25000;

    const token = generateToken(user);

    return res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        email: user.email,
      },
      token,
      exchangeRate,
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// GET /api/auth/me (Lấy thông tin tài khoản hiện tại)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query("SELECT id, email, created_at FROM users WHERE id = $1", [
      req.user.id,
    ]);
    if (userRes.rows.length === 0) {
      return res.status(401).json(ERROR_CODES.ERR_19);
    }

    const settingsRes = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    const exchangeRate =
      settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].exchange_rate) : 25000;

    res.json({
      user: userRes.rows[0],
      exchangeRate,
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin phiên:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

module.exports = router;
