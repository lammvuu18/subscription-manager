/**
 * subscriptions.js - Tuyến đường quản lý gói đăng ký (UC-01 .. UC-05, FR-01 .. FR-05)
 * Tuân thủ nghiêm ngặt:
 * - BUS-17: Mỗi người dùng chỉ truy cập dữ liệu của mình (404 ERR-12 nếu không thuộc user)
 * - FR-06, FR-07, FR-08: Tự động tính các giá trị dẫn xuất (ngày thanh toán, số ngày còn lại, tiến độ, alertLevel)
 */

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const ERROR_CODES = require("../constants/errors");
const { authenticateToken } = require("../middleware/auth");
const { validateSubscription, validateStatus } = require("../middleware/validate");
const { calculateBillingSchedule } = require("../utils/billing");
const { toMonthlyVND, calculateExpenseSummary } = require("../utils/currency");

// Toàn bộ route subscriptions đều yêu cầu token xác thực
router.use(authenticateToken);

/**
 * Định dạng bản ghi subscription kèm các giá trị dẫn xuất theo SRS
 */
function enrichSubscription(subscription, exchangeRate = 25000, today = new Date()) {
  let startDateStr;
  if (subscription.start_date instanceof Date) {
    const d = subscription.start_date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    startDateStr = `${year}-${month}-${day}`;
  } else {
    startDateStr = String(subscription.start_date).slice(0, 10);
  }

  const numericAmount = Number(subscription.amount);

  // Tính lịch thanh toán tiếp theo (FR-06, FR-08)
  const schedule = calculateBillingSchedule(
    startDateStr,
    subscription.billing_cycle,
    today,
    subscription.status
  );

  // Tính chi phí quy đổi VNĐ / tháng (FR-07)
  const monthlyCostVND = toMonthlyVND(
    numericAmount,
    subscription.currency,
    subscription.billing_cycle,
    exchangeRate
  );

  return {
    id: subscription.id,
    user_id: subscription.user_id,
    service_name: subscription.service_name,
    amount: numericAmount,
    currency: subscription.currency,
    billing_cycle: subscription.billing_cycle,
    start_date: startDateStr,
    status: subscription.status,
    color: subscription.color || "#FF2D95",
    created_at: subscription.created_at,
    updated_at: subscription.updated_at,
    // Các giá trị dẫn xuất (Dẫn xuất: không lưu trong CSDL)
    nextBillingDate: schedule.nextBillingDate,
    formattedDate: schedule.formattedDate,
    formattedDateVN: schedule.formattedDateVN,
    daysLeft: schedule.daysLeft,
    progress: schedule.progress,
    alertLevel: schedule.alertLevel,
    isToday: schedule.isToday,
    isFuture: schedule.isFuture,
    monthlyCostVND: Math.round(monthlyCostVND),
    rawMonthlyCostVND: monthlyCostVND,
  };
}

// GET /api/subscriptions (UC-05, FR-05, FR-11: Lấy danh sách gói, hỗ trợ filter & sort)
router.get("/", async (req, res) => {
  const { status, sort } = req.query;

  try {
    // 1. Lấy tỷ giá của user
    const settingsRes = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    const exchangeRate =
      settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].exchange_rate) : 25000;

    // 2. Truy vấn CSDL có lọc theo status nếu có (FR-11)
    let query = "SELECT * FROM subscriptions WHERE user_id = $1";
    const params = [req.user.id];

    if (status && status !== "all") {
      if (status === "active" || status === "cancelled") {
        query += " AND status = $2";
        params.push(status);
      }
    }

    query += " ORDER BY id DESC";

    const result = await pool.query(query, params);
    const today = new Date();

    // 3. Tính toán các trường dẫn xuất
    let enrichedList = result.rows.map((row) => enrichSubscription(row, exchangeRate, today));

    // 4. Sắp xếp danh sách theo tiêu chí (FR-11, sortBy)
    const sortBy = sort || "nextBillingDate";
    if (sortBy === "name") {
      enrichedList.sort((a, b) => a.service_name.localeCompare(b.service_name, "vi"));
    } else if (sortBy === "monthlyCost") {
      enrichedList.sort((a, b) => b.rawMonthlyCostVND - a.rawMonthlyCostVND);
    } else {
      // nextBillingDate: gói active xếp theo ngày gần nhất trước, gói cancelled xếp sau
      enrichedList.sort((a, b) => {
        if (a.status === "active" && b.status === "cancelled") return -1;
        if (a.status === "cancelled" && b.status === "active") return 1;
        if (a.status === "cancelled" && b.status === "cancelled") return 0;
        return (a.daysLeft ?? 999999) - (b.daysLeft ?? 999999);
      });
    }

    res.json(enrichedList);
  } catch (error) {
    console.error("Lỗi lấy danh sách gói đăng ký:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// POST /api/subscriptions (UC-01, FR-01: Thêm gói đăng ký mới)
router.post("/", validateSubscription, async (req, res) => {
  const { service_name, amount, currency, billing_cycle, start_date, status, color } =
    req.validatedData;

  try {
    // Lấy tỷ giá của user
    const settingsRes = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    const exchangeRate =
      settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].exchange_rate) : 25000;

    const result = await pool.query(
      `INSERT INTO subscriptions
       (user_id, service_name, amount, currency, billing_cycle, start_date, status, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.user.id, service_name, amount, currency, billing_cycle, start_date, status, color]
    );

    const enriched = enrichSubscription(result.rows[0], exchangeRate);
    res.status(201).json(enriched);
  } catch (error) {
    console.error("Lỗi thêm gói đăng ký:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// PUT /api/subscriptions/:id (UC-02, FR-02: Sửa gói đăng ký)
router.put("/:id", validateSubscription, async (req, res) => {
  const { id } = req.params;
  const { service_name, amount, currency, billing_cycle, start_date, status, color } =
    req.validatedData;

  try {
    // 1. Kiểm tra gói tồn tại và thuộc user hiện tại (BUS-17)
    const checkRes = await pool.query(
      "SELECT id FROM subscriptions WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json(ERROR_CODES.ERR_12);
    }

    // 2. Lấy tỷ giá của user
    const settingsRes = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    const exchangeRate =
      settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].exchange_rate) : 25000;

    // 3. Cập nhật
    const result = await pool.query(
      `UPDATE subscriptions
       SET service_name = $1, amount = $2, currency = $3,
           billing_cycle = $4, start_date = $5, status = $6,
           color = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [
        service_name,
        amount,
        currency,
        billing_cycle,
        start_date,
        status,
        color,
        id,
        req.user.id,
      ]
    );

    const enriched = enrichSubscription(result.rows[0], exchangeRate);
    res.json(enriched);
  } catch (error) {
    console.error("Lỗi cập nhật gói đăng ký:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// PATCH /api/subscriptions/:id/status (UC-04, FR-04: Đổi trạng thái Hủy / Kích hoạt lại)
router.patch("/:id/status", validateStatus, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Kiểm tra và cập nhật trạng thái
    const result = await pool.query(
      `SELECT * FROM subscriptions
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(ERROR_CODES.ERR_12);
    }
    result.rows[0].status = status;

    // Lấy tỷ giá và toàn bộ danh sách gói để tính tổng chi phí mới
    const settingsRes = await pool.query(
      "SELECT exchange_rate FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );
    const exchangeRate =
      settingsRes.rows.length > 0 ? Number(settingsRes.rows[0].exchange_rate) : 25000;

    const allSubsRes = await pool.query(
      "SELECT * FROM subscriptions WHERE user_id = $1",
      [req.user.id]
    );
    const newSummary = calculateExpenseSummary(allSubsRes.rows, exchangeRate);

    const enriched = enrichSubscription(result.rows[0], exchangeRate);

    res.json({
      subscription: enriched,
      summary: newSummary,
      message:
        status === "cancelled"
          ? `Đã hủy gói «${enriched.service_name}»`
          : `Đã kích hoạt lại gói «${enriched.service_name}»`,
    });
  } catch (error) {
    console.error("Lỗi đổi trạng thái gói đăng ký:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

// DELETE /api/subscriptions/:id (UC-03, FR-03: Xóa vĩnh viễn sau xác nhận)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM subscriptions WHERE id = $1 AND user_id = $2 RETURNING id, service_name",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json(ERROR_CODES.ERR_12);
    }

    res.json({
      message: `Đã xóa gói «${result.rows[0].service_name}» thành công`,
      id: Number(id),
    });
  } catch (error) {
    console.error("Lỗi xóa gói đăng ký:", error);
    res.status(500).json(ERROR_CODES.ERR_13);
  }
});

module.exports = router;
