/**
 * summary.js - Tuyến đường tổng hợp chi phí và biểu đồ (FR-07, FR-09, Phụ lục B)
 * Tính tổng chi phí/tháng, /năm, số tiền tiết kiệm và chuẩn bị dữ liệu biểu đồ
 */

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const ERROR_CODES = require("../constants/errors");
const { authenticateToken } = require("../middleware/auth");
const { calculateExpenseSummary, toMonthlyVND } = require("../utils/currency");

router.use(authenticateToken);

// GET /api/summary
router.get("/", async (req, res) => {
  try {
    // 1. Lấy tỷ giá của user
    const settingsRes = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    const exchangeRate =
      settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].exchange_rate) : 25000;

    // 2. Lấy danh sách subscriptions của user
    const subsRes = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY id DESC",
      [req.user.id]
    );
    const subscriptions = subsRes.rows;

    // 3. Tính toán tổng chi phí bằng module currency.js chuẩn
    const summary = calculateExpenseSummary(subscriptions, exchangeRate);

    // 4. Chuẩn bị dữ liệu cho biểu đồ chi tiêu (chỉ tính các gói active - BUS-16)
    const activeSubs = subscriptions.filter((s) => s.status === "active");
    const chartItems = activeSubs.map((s) => {
      const monthlyCost = toMonthlyVND(s.amount, s.currency, s.billing_cycle, exchangeRate);
      const percent =
        summary.totalMonthly > 0
          ? Number(((monthlyCost / summary.totalMonthly) * 100).toFixed(1))
          : 0;

      return {
        id: s.id,
        service_name: s.service_name,
        color: s.color || "#FF2D95",
        monthlyCostVND: Math.round(monthlyCost),
        rawMonthlyCostVND: monthlyCost,
        percent,
      };
    });

    res.json({
      ...summary,
      exchangeRate,
      chartData: chartItems,
      isEmpty: subscriptions.length === 0,
      hasActive: activeSubs.length > 0,
    });
  } catch (error) {
    console.error("Lỗi lấy tổng chi phí:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

module.exports = router;
