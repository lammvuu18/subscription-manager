/**
 * settings.js - Tuyến đường cấu hình tỷ giá (UC-07, FR-10)
 * Tuân thủ VAL-12, ERR-14: Tỷ giá > 0, <= 1.000.000, tối đa 2 chữ số thập phân.
 */

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const ERROR_CODES = require("../constants/errors");
const { authenticateToken } = require("../middleware/auth");
const { validateExchangeRate } = require("../middleware/validate");

// Tất cả route trong settings đều yêu cầu token
router.use(authenticateToken);

// GET /api/settings/exchange-rate
router.get("/exchange-rate", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );

    const exchangeRate =
      result.rows.length > 0 ? Number(result.rows[0].exchange_rate) : 25000;

    res.json({ exchangeRate });
  } catch (error) {
    console.error("Lỗi lấy tỷ giá:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// PUT /api/settings/exchange-rate (UC-07, FR-10)
router.put("/exchange-rate", validateExchangeRate, async (req, res) => {
  const newRate = req.validatedExchangeRate;

  try {
    const result = await pool.query(
      `INSERT INTO user_settings (user_id, exchange_rate, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET exchange_rate = EXCLUDED.exchange_rate, updated_at = CURRENT_TIMESTAMP
       RETURNING exchange_rate`,
      [req.user.id, newRate]
    );

    res.json({
      message: "Đã cập nhật tỷ giá thành công",
      exchangeRate: Number(result.rows[0].exchange_rate),
    });
  } catch (error) {
    console.error("Lỗi cập nhật tỷ giá:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

module.exports = router;
