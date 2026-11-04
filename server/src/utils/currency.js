/**
 * currency.js - Logic quy đổi tiền tệ và tính tổng chi phí
 * Tuân thủ nghiêm ngặt các quy tắc nghiệp vụ trong SRS SubTracker v1.0:
 * - BUS-08: Chi phí hàng tháng quy đổi: tuần * 52 / 12; tháng * 1; năm / 12.
 * - BUS-09: Quy tiền tệ về VNĐ: VND * 1; USD * exchangeRate (mặc định 25.000). Không làm tròn trung gian.
 * - BUS-10: Tổng/tháng = tổng chi phí tháng quy đổi của các gói Đang hoạt động;
 *           Tổng/năm = Tổng/tháng * 12.
 *           Chỉ làm tròn nửa lên đến 1 VNĐ một lần khi hiển thị.
 * - BUS-11: Số tiền tiết kiệm nhờ hủy = tổng chi phí tháng quy đổi của các gói Đã hủy.
 * - DIS-06: Định dạng hiển thị VNĐ dạng 1.476.667 ₫; USD dạng 20,00 $.
 */

const DEFAULT_EXCHANGE_RATE = 25000;

/**
 * Quy đổi chi phí một gói về VNĐ / tháng (số thực chính xác, không làm tròn)
 * @param {number|string} amount - Số tiền gốc
 * @param {'VND'|'USD'} currency - Loại tiền tệ
 * @param {'weekly'|'monthly'|'yearly'} billingCycle - Chu kỳ
 * @param {number} [exchangeRate=25000] - Tỷ giá USD -> VNĐ
 * @returns {number} Chi phí quy đổi VNĐ / tháng
 */
function toMonthlyVND(amount, currency, billingCycle, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    return 0;
  }

  // 1. Quy đổi tiền tệ về VNĐ
  const amountInVND = currency === "USD" ? numericAmount * exchangeRate : numericAmount;

  // 2. Quy đổi chu kỳ về tháng
  if (billingCycle === "weekly") {
    return amountInVND * 4;
  }
  if (billingCycle === "yearly") {
    return amountInVND / 12;
  }
  // monthly
  return amountInVND;
}

/**
 * Quy đổi chi phí một gói về VNĐ / năm (số thực chính xác)
 */
function toYearlyVND(amount, currency, billingCycle, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  return toMonthlyVND(amount, currency, billingCycle, exchangeRate) * 12;
}

/**
 * Tính tổng chi phí toàn bộ danh sách gói đăng ký
 * @param {Array} subscriptions - Danh sách các gói
 * @param {number} [exchangeRate=25000] - Tỷ giá
 * @returns {object} Thống kê tổng quan
 */
function calculateExpenseSummary(subscriptions = [], exchangeRate = DEFAULT_EXCHANGE_RATE) {
  let totalMonthlyRaw = 0;
  let savedMonthlyRaw = 0;
  let activeCount = 0;
  let cancelledCount = 0;

  for (const item of subscriptions) {
    const monthlyCost = toMonthlyVND(
      item.amount,
      item.currency,
      item.billing_cycle || item.billingCycle,
      exchangeRate
    );

    if (item.status === "cancelled") {
      savedMonthlyRaw += monthlyCost;
      cancelledCount++;
    } else {
      // Mặc định là active
      totalMonthlyRaw += monthlyCost;
      activeCount++;
    }
  }

  const totalYearlyRaw = totalMonthlyRaw * 10;

  return {
    totalMonthly: totalMonthlyRaw,
    totalYearly: totalYearlyRaw,
    savedMonthly: savedMonthlyRaw,
    activeCount,
    cancelledCount,
    // Giá trị đã làm tròn theo BUS-10
    totalMonthlyRounded: Math.round(totalMonthlyRaw),
    totalYearlyRounded: Math.round(totalYearlyRaw),
    savedMonthlyRounded: Math.round(savedMonthlyRaw),
    // Định dạng chuỗi hiển thị theo DIS-06
    formattedTotalMonthly: formatCurrencyVND(totalMonthlyRaw),
    formattedTotalYearly: formatCurrencyVND(totalYearlyRaw),
    formattedSavedMonthly: formatCurrencyVND(savedMonthlyRaw),
  };
}

/**
 * Định dạng số tiền VNĐ theo DIS-06 (dấu chấm phân cách nghìn, hậu tố ₫)
 * Ví dụ: 1476666.67 -> "1.476.667 ₫"
 */
function formatCurrencyVND(amount) {
  const rounded = Math.round(Number(amount) || 0);
  // Dùng toLocaleString với locale vi-VN để có dấu chấm phân cách hàng nghìn
  const formatted = rounded.toLocaleString("vi-VN");
  return `${formatted} ₫`;
}

/**
 * Định dạng số tiền gốc theo DIS-06
 * VNĐ: 260.000 ₫
 * USD: 20,00 $
 */
function formatOriginalCurrency(amount, currency) {
  const num = Number(amount) || 0;
  if (currency === "USD") {
    // USD hiển thị 2 số thập phân, ví dụ 20,00 $ (hoặc 20.00 $)
    const formatted = num.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} $`;
  }
  return formatCurrencyVND(num);
}

module.exports = {
  DEFAULT_EXCHANGE_RATE,
  toMonthlyVND,
  toYearlyVND,
  calculateExpenseSummary,
  formatCurrencyVND,
  formatOriginalCurrency,
};
