/**
 * validate.js - Middleware kiểm tra dữ liệu đầu vào theo Bảng 2-A (VAL-01 .. VAL-12)
 * Trả về đúng mã lỗi và thông báo theo Bảng 2-20 (ERR-01 .. ERR-23)
 */

const ERROR_CODES = require("../constants/errors");
const { isLeapYear, getDaysInMonth, parseDateParts } = require("../utils/billing");

/**
 * Helper kiểm tra định dạng email (VAL-09)
 */
function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  // Regex kiểm tra định dạng email tiêu chuẩn
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Helper kiểm tra mật khẩu: 8–64 ký tự, có ít nhất một chữ cái và một chữ số (VAL-10)
 */
function isValidPassword(password) {
  if (typeof password !== "string") return false;
  if (password.length < 8 || password.length > 64) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
}

/**
 * Validate Đăng ký tài khoản (VAL-09, VAL-10, VAL-11)
 */
function validateRegister(req, res, next) {
  const { email, password, confirmPassword } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json(ERROR_CODES.ERR_17);
  }

  if (!isValidPassword(password)) {
    return res.status(400).json(ERROR_CODES.ERR_18);
  }

  if (password !== confirmPassword) {
    return res.status(400).json(ERROR_CODES.ERR_22);
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

/**
 * Validate Đăng nhập (VAL-09)
 */
function validateLogin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    return res.status(401).json(ERROR_CODES.ERR_15);
  }

  req.body.email = email.trim().toLowerCase();
  next();
}

/**
 * Validate Gói đăng ký (VAL-01 .. VAL-08)
 */
function validateSubscription(req, res, next) {
  const {
    service_name,
    name,
    amount,
    currency = "VND",
    billing_cycle,
    billingCycle,
    start_date,
    startDate,
    status = "active",
    color,
  } = req.body;

  // 1. Tên dịch vụ (VAL-01)
  const rawName = (service_name || name || "").trim();
  if (!rawName) {
    return res.status(400).json(ERROR_CODES.ERR_01);
  }
  if (rawName.length > 100) {
    return res.status(400).json(ERROR_CODES.ERR_02);
  }

  // 2. Loại tiền tệ (VAL-04)
  const cur = String(currency).toUpperCase();
  if (cur !== "VND" && cur !== "USD") {
    return res.status(400).json(ERROR_CODES.ERR_07);
  }

  // 3. Số tiền (VAL-02, VAL-03)
  if (amount === undefined || amount === null || amount === "" || isNaN(Number(amount))) {
    return res.status(400).json(ERROR_CODES.ERR_03);
  }
  const numAmount = Number(amount);
  if (numAmount < 0) {
    return res.status(400).json(ERROR_CODES.ERR_04);
  }
  if (numAmount > 1000000000) {
    return res.status(400).json(ERROR_CODES.ERR_05);
  }
  if (cur === "VND") {
    // VNĐ chỉ nhận số nguyên
    if (!Number.isInteger(numAmount)) {
      return res.status(400).json(ERROR_CODES.ERR_06);
    }
  } else if (cur === "USD") {
    // USD tối đa 2 chữ số thập phân
    const parts = String(amount).split(".");
    if (parts.length > 1 && parts[1].length > 2) {
      return res.status(400).json(ERROR_CODES.ERR_06);
    }
  }

  // 4. Chu kỳ thanh toán (VAL-05)
  const cycle = billing_cycle || billingCycle;
  if (!["weekly", "monthly", "yearly"].includes(cycle)) {
    return res.status(400).json(ERROR_CODES.ERR_08);
  }

  // 5. Ngày bắt đầu (VAL-06, VAL-07)
  const dateStr = start_date || startDate;
  if (!dateStr || typeof dateStr !== "string") {
    return res.status(400).json(ERROR_CODES.ERR_09);
  }
  const dateParts = parseDateParts(dateStr);
  if (!dateParts) {
    return res.status(400).json(ERROR_CODES.ERR_09);
  }
  const { year, month, day } = dateParts;
  const maxDayInMonth = getDaysInMonth(year, month);
  if (day < 1 || day > maxDayInMonth) {
    return res.status(400).json(ERROR_CODES.ERR_09);
  }

  // Giới hạn ngày từ 01/01/2000 đến hôm nay + 5 năm (VAL-07)
  const utcDate = Date.UTC(year, month - 1, day);
  const minDate = Date.UTC(2000, 0, 1);
  const now = new Date();
  const maxDate = Date.UTC(now.getFullYear() + 5, now.getMonth(), now.getDate());

  if (utcDate < minDate || utcDate > maxDate) {
    return res.status(400).json(ERROR_CODES.ERR_10);
  }

  // 6. Trạng thái (VAL-08)
  if (!["active", "cancelled"].includes(status)) {
    return res.status(400).json(ERROR_CODES.ERR_11);
  }

  // Chuẩn hóa vào req.validatedData
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  const formattedIsoDate = `${year}-${m}-${d}`;

  // Màu thẻ neon mặc định hoặc chuẩn hóa
  const validColors = ["#FF2D95", "#00F0FF", "#B026FF", "#E0FF00", "#39FF14", "#FF7700"];
  const assignedColor = validColors.includes(color) ? color : "#FF2D95";

  req.validatedData = {
    service_name: rawName,
    amount: numAmount,
    currency: cur,
    billing_cycle: cycle,
    start_date: formattedIsoDate,
    status,
    color: assignedColor,
  };

  next();
}

/**
 * Validate đổi trạng thái gói (VAL-08)
 */
function validateStatus(req, res, next) {
  const { status } = req.body;
  if (!status || !["active", "cancelled"].includes(status)) {
    return res.status(400).json(ERROR_CODES.ERR_11);
  }
  next();
}

/**
 * Validate Cấu hình tỷ giá (VAL-12)
 */
function validateExchangeRate(req, res, next) {
  const { exchangeRate, exchange_rate } = req.body;
  const rateVal = exchangeRate !== undefined ? exchangeRate : exchange_rate;

  if (rateVal === undefined || rateVal === null || rateVal === "" || isNaN(Number(rateVal))) {
    return res.status(400).json(ERROR_CODES.ERR_14);
  }

  const numRate = Number(rateVal);
  if (numRate <= 0 || numRate > 1000000) {
    return res.status(400).json(ERROR_CODES.ERR_14);
  }

  // Tối đa 2 chữ số thập phân
  const parts = String(rateVal).split(".");
  if (parts.length > 1 && parts[1].length > 2) {
    return res.status(400).json(ERROR_CODES.ERR_14);
  }

  req.validatedExchangeRate = numRate;
  next();
}

module.exports = {
  isValidEmail,
  isValidPassword,
  validateRegister,
  validateLogin,
  validateSubscription,
  validateStatus,
  validateExchangeRate,
};
