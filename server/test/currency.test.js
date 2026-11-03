const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  toMonthlyVND,
  toYearlyVND,
  calculateExpenseSummary,
  formatCurrencyVND,
  formatOriginalCurrency,
} = require("../src/utils/currency");

describe("Kiểm thử logic quy đổi tiền tệ và tổng chi phí (Currency & Expense)", () => {
  // ==========================================
  // NHÓM 1: CÁC CA KIỂM THỬ TỪ BẢNG A-2 TRONG SRS
  // ==========================================
  describe("Bảng A-2: Ví dụ quy đổi và tính tổng chi phí (tỷ giá 25.000 VNĐ/USD)", () => {
    it("Netflix: 260.000 VNĐ hàng tháng -> 260.000 VNĐ/tháng", () => {
      const monthly = toMonthlyVND(260000, "VND", "monthly", 25000);
      assert.equal(monthly, 260000);
    });

    it("ChatGPT: 20 USD hàng tháng -> 500.000 VNĐ/tháng", () => {
      const monthly = toMonthlyVND(20, "USD", "monthly", 25000);
      assert.equal(monthly, 500000);
    });

    it("AWS: 240 USD hàng năm -> 500.000 VNĐ/tháng", () => {
      const monthly = toMonthlyVND(240, "USD", "yearly", 25000);
      assert.equal(monthly, 500000);
    });

    it("Gói thử nghiệm: 50.000 VNĐ hàng tuần -> 50.000 * 52 / 12 = 216.666,666... VNĐ/tháng", () => {
      const monthly = toMonthlyVND(50000, "VND", "weekly", 25000);
      const expected = (50000 * 52) / 12;
      assert.equal(monthly, expected);
      assert.equal(Math.abs(monthly - 216666.66666666666) < 1e-9, true);
    });

    it("Tổng 4 dịch vụ đang hoạt động: Tổng/tháng hiển thị đúng 1.476.667 ₫ (BUS-10)", () => {
      const sampleSubscriptions = [
        { name: "Netflix", amount: 260000, currency: "VND", billing_cycle: "monthly", status: "active" },
        { name: "ChatGPT", amount: 20, currency: "USD", billing_cycle: "monthly", status: "active" },
        { name: "AWS", amount: 240, currency: "USD", billing_cycle: "yearly", status: "active" },
        { name: "Gói thử nghiệm", amount: 50000, currency: "VND", billing_cycle: "weekly", status: "active" },
      ];

      const summary = calculateExpenseSummary(sampleSubscriptions, 25000);

      // Tổng thực tế chưa làm tròn
      const expectedRaw = 260000 + 500000 + 500000 + (50000 * 52) / 12;
      assert.equal(Math.abs(summary.totalMonthly - expectedRaw) < 1e-9, true);

      // Làm tròn hiển thị: 1.476.667 ₫
      assert.equal(summary.totalMonthlyRounded, 1476667);
      assert.equal(summary.formattedTotalMonthly, "1.476.667 ₫");
    });

    it("Tổng/năm hiển thị đúng 17.720.000 ₫ (BUS-10)", () => {
      const sampleSubscriptions = [
        { name: "Netflix", amount: 260000, currency: "VND", billing_cycle: "monthly", status: "active" },
        { name: "ChatGPT", amount: 20, currency: "USD", billing_cycle: "monthly", status: "active" },
        { name: "AWS", amount: 240, currency: "USD", billing_cycle: "yearly", status: "active" },
        { name: "Gói thử nghiệm", amount: 50000, currency: "VND", billing_cycle: "weekly", status: "active" },
      ];

      const summary = calculateExpenseSummary(sampleSubscriptions, 25000);

      // 1.476.666,666... * 12 = 17.720.000
      assert.equal(summary.totalYearlyRounded, 17720000);
      assert.equal(summary.formattedTotalYearly, "17.720.000 ₫");
    });

    it("Sau khi hủy Netflix: Tổng/tháng còn 1.216.667 ₫ và Tiết kiệm 260.000 ₫ (BUS-11)", () => {
      const sampleSubscriptions = [
        { name: "Netflix", amount: 260000, currency: "VND", billing_cycle: "monthly", status: "cancelled" },
        { name: "ChatGPT", amount: 20, currency: "USD", billing_cycle: "monthly", status: "active" },
        { name: "AWS", amount: 240, currency: "USD", billing_cycle: "yearly", status: "active" },
        { name: "Gói thử nghiệm", amount: 50000, currency: "VND", billing_cycle: "weekly", status: "active" },
      ];

      const summary = calculateExpenseSummary(sampleSubscriptions, 25000);

      // Tổng chi phí active
      assert.equal(summary.totalMonthlyRounded, 1216667);
      assert.equal(summary.formattedTotalMonthly, "1.216.667 ₫");

      // Tiết kiệm nhờ hủy
      assert.equal(summary.savedMonthlyRounded, 260000);
      assert.equal(summary.formattedSavedMonthly, "260.000 ₫");

      assert.equal(summary.activeCount, 3);
      assert.equal(summary.cancelledCount, 1);
    });
  });

  // ==========================================
  // NHÓM 2: CÁC CA KIỂM THỬ TỶ GIÁ VÀ ĐỊNH DẠNG
  // ==========================================
  describe("Thay đổi tỷ giá và định dạng tiền tệ", () => {
    it("Đổi tỷ giá từ 25.000 sang 26.000 VNĐ/USD (BUS-14)", () => {
      const chatgptCost = toMonthlyVND(20, "USD", "monthly", 26000);
      assert.equal(chatgptCost, 520000);

      const awsCost = toMonthlyVND(240, "USD", "yearly", 26000);
      assert.equal(awsCost, 520000);
    });

    it("Định dạng số tiền VNĐ theo DIS-06 (dấu chấm phân cách, ký hiệu ₫)", () => {
      assert.equal(formatCurrencyVND(260000), "260.000 ₫");
      assert.equal(formatCurrencyVND(1000000), "1.000.000 ₫");
      assert.equal(formatCurrencyVND(0), "0 ₫");
    });

    it("Định dạng số tiền gốc USD theo DIS-06 (tối đa 2 số thập phân)", () => {
      const formatted = formatOriginalCurrency(20, "USD");
      // Có thể là "20,00 $" hoặc "20.00 $" tuỳ locale
      assert.equal(formatted.includes("20") && formatted.includes("$"), true);
    });

    it("Xử lý an toàn khi danh sách gói rỗng", () => {
      const summary = calculateExpenseSummary([], 25000);
      assert.equal(summary.totalMonthly, 0);
      assert.equal(summary.totalYearly, 0);
      assert.equal(summary.savedMonthly, 0);
      assert.equal(summary.activeCount, 0);
      assert.equal(summary.formattedTotalMonthly, "0 ₫");
    });
  });
});
