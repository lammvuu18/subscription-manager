const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { calculateBillingSchedule, getNextPaymentDate } = require("../src/utils/billing");

describe("Kiểm thử logic chu kỳ thanh toán (Billing Schedule)", () => {
  // ==========================================
  // NHÓM 1: 15 CA KIỂM THỬ CHUẨN TỪ BẢNG A-1 TRONG SRS
  // ==========================================
  describe("Bảng A-1: Các ca kiểm thử tham chiếu chuẩn từ SRS", () => {
    it("Ca 1: 31/01/2024 hàng tháng, today = 15/02/2026 (năm không nhuận) -> next = 28/02/2026, daysLeft = 13, safe, 54%", () => {
      const result = calculateBillingSchedule("2024-01-31", "monthly", "2026-02-15");
      assert.equal(result.nextBillingDate, "2026-02-28");
      assert.equal(result.daysLeft, 13);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 54);
    });

    it("Ca 2: 31/01/2024 hàng tháng, today = 01/03/2026 -> next = 31/03/2026, daysLeft = 30, safe, 3%", () => {
      const result = calculateBillingSchedule("2024-01-31", "monthly", "2026-03-01");
      assert.equal(result.nextBillingDate, "2026-03-31");
      assert.equal(result.daysLeft, 30);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 3);
    });

    it("Ca 3: 31/01/2024 hàng tháng, today = 10/02/2024 (năm nhuận) -> next = 29/02/2024, daysLeft = 19, safe, 34%", () => {
      const result = calculateBillingSchedule("2024-01-31", "monthly", "2024-02-10");
      assert.equal(result.nextBillingDate, "2024-02-29");
      assert.equal(result.daysLeft, 19);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 34);
    });

    it("Ca 4: 30/01/2024 hàng tháng, today = 15/02/2024 -> next = 29/02/2024, daysLeft = 14, safe, 53%", () => {
      const result = calculateBillingSchedule("2024-01-30", "monthly", "2024-02-15");
      assert.equal(result.nextBillingDate, "2024-02-29");
      assert.equal(result.daysLeft, 14);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 53);
    });

    it("Ca 5: 31/12/2023 hàng tháng, today = 01/04/2024 -> next = 30/04/2024, daysLeft = 29, safe, 3%", () => {
      const result = calculateBillingSchedule("2023-12-31", "monthly", "2024-04-01");
      assert.equal(result.nextBillingDate, "2024-04-30");
      assert.equal(result.daysLeft, 29);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 3);
    });

    it("Ca 6: 29/02/2024 hàng năm, today = 01/03/2025 -> next = 28/02/2026, daysLeft = 364, safe, 0%", () => {
      const result = calculateBillingSchedule("2024-02-29", "yearly", "2025-03-01");
      assert.equal(result.nextBillingDate, "2026-02-28");
      assert.equal(result.daysLeft, 364);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 0);
    });

    it("Ca 7: 29/02/2024 hàng năm, today = 01/03/2027 -> next = 29/02/2028 (nhuận), daysLeft = 365, safe, 0%", () => {
      const result = calculateBillingSchedule("2024-02-29", "yearly", "2027-03-01");
      assert.equal(result.nextBillingDate, "2028-02-29");
      assert.equal(result.daysLeft, 365);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 0);
    });

    it("Ca 8: 29/02/2024 hàng năm, today = 28/02/2028 -> next = 29/02/2028, daysLeft = 1, warning, 100%", () => {
      const result = calculateBillingSchedule("2024-02-29", "yearly", "2028-02-28");
      assert.equal(result.nextBillingDate, "2028-02-29");
      assert.equal(result.daysLeft, 1);
      assert.equal(result.alertLevel, "warning");
      assert.equal(result.progress, 100);
    });

    it("Ca 9: 01/12/2026 hàng tháng, today = 10/10/2026 (ngày tương lai) -> next = 01/01/2027, daysLeft = 83, safe, 0%", () => {
      const result = calculateBillingSchedule("2026-12-01", "monthly", "2026-10-10");
      assert.equal(result.nextBillingDate, "2027-01-01");
      assert.equal(result.daysLeft, 83);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 0);
      assert.equal(result.isFuture, true);
    });

    it("Ca 10: 10/09/2026 hàng tháng, today = 10/10/2026 (trùng ngày thanh toán) -> next = 10/10/2026, daysLeft = 0, warning, 100%", () => {
      const result = calculateBillingSchedule("2026-09-10", "monthly", "2026-10-10");
      assert.equal(result.nextBillingDate, "2026-10-10");
      assert.equal(result.daysLeft, 0);
      assert.equal(result.alertLevel, "warning");
      assert.equal(result.progress, 100);
      assert.equal(result.isToday, true);
    });

    it("Ca 11: 05/10/2026 hàng tuần, today = 10/10/2026 -> next = 12/10/2026, daysLeft = 2, warning, 71%", () => {
      const result = calculateBillingSchedule("2026-10-05", "weekly", "2026-10-10");
      assert.equal(result.nextBillingDate, "2026-10-12");
      assert.equal(result.daysLeft, 2);
      assert.equal(result.alertLevel, "warning");
      assert.equal(result.progress, 71);
    });

    it("Ca 12: 15/01/2026 hàng tháng, today = 12/10/2026 -> next = 15/10/2026, daysLeft = 3, safe, 90%", () => {
      const result = calculateBillingSchedule("2026-01-15", "monthly", "2026-10-12");
      assert.equal(result.nextBillingDate, "2026-10-15");
      assert.equal(result.daysLeft, 3);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 90);
    });

    it("Ca 13: 15/01/2026 hàng tháng, today = 13/10/2026 -> next = 15/10/2026, daysLeft = 2, warning, 93%", () => {
      const result = calculateBillingSchedule("2026-01-15", "monthly", "2026-10-13");
      assert.equal(result.nextBillingDate, "2026-10-15");
      assert.equal(result.daysLeft, 2);
      assert.equal(result.alertLevel, "warning");
      assert.equal(result.progress, 93);
    });

    it("Ca 14: 10/10/2026 hàng tháng, today = 10/10/2026 (vừa tạo hôm nay) -> next = 10/11/2026, daysLeft = 31, safe", () => {
      const result = calculateBillingSchedule("2026-10-10", "monthly", "2026-10-10");
      assert.equal(result.nextBillingDate, "2026-11-10");
      assert.equal(result.daysLeft, 31);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.isToday, false);
    });

    it("Ca 15: 31/12/2025 hàng tháng, today = 28/02/2026 (ngày cuối tháng 2) -> next = 28/02/2026, daysLeft = 0, warning, 100%", () => {
      const result = calculateBillingSchedule("2025-12-31", "monthly", "2026-02-28");
      assert.equal(result.nextBillingDate, "2026-02-28");
      assert.equal(result.daysLeft, 0);
      assert.equal(result.alertLevel, "warning");
      assert.equal(result.progress, 100);
      assert.equal(result.isToday, true);
    });
  });

  // ==========================================
  // NHÓM 2: CÁC CA KIỂM THỬ BỔ SUNG (ĐẠT TỔNG CỘNG ≥ 30 CA THEO NFR-08)
  // ==========================================
  describe("Bộ ca kiểm thử mở rộng (Biên, Năm nhuận, Chu kỳ đặc biệt)", () => {
    it("Ca 16: Hàng tuần bắt đầu đúng hôm nay -> next = today + 7 ngày", () => {
      const result = calculateBillingSchedule("2026-11-01", "weekly", "2026-11-01");
      assert.equal(result.nextBillingDate, "2026-11-08");
      assert.equal(result.daysLeft, 7);
      assert.equal(result.alertLevel, "safe");
    });

    it("Ca 17: Hàng tuần bắt đầu tương lai -> next = startDate + 7 ngày", () => {
      const result = calculateBillingSchedule("2026-11-10", "weekly", "2026-11-01");
      assert.equal(result.nextBillingDate, "2026-11-17");
      assert.equal(result.daysLeft, 16);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.isFuture, true);
    });

    it("Ca 18: Hàng tuần sau 4 chu kỳ", () => {
      const result = calculateBillingSchedule("2026-10-01", "weekly", "2026-10-23");
      // 01/10 + 7 = 08/10, + 7 = 15/10, + 7 = 22/10 < 23/10. + 7 = 29/10 >= 23/10.
      assert.equal(result.nextBillingDate, "2026-10-29");
      assert.equal(result.daysLeft, 6);
      assert.equal(result.alertLevel, "safe");
    });

    it("Ca 19: Hàng tháng ngày 31 nhảy qua các tháng 30 ngày (Tháng 4, 6, 9, 11)", () => {
      const result = calculateBillingSchedule("2026-01-31", "monthly", "2026-04-15");
      // Tháng 4 chỉ có 30 ngày -> 30/04/2026
      assert.equal(result.nextBillingDate, "2026-04-30");
      assert.equal(result.daysLeft, 15);
    });

    it("Ca 20: Hàng tháng ngày 31 tháng 4 sang tháng 5 phục hồi lại ngày 31 (BUS-03)", () => {
      const result = calculateBillingSchedule("2026-01-31", "monthly", "2026-05-01");
      // Tháng 5 có 31 ngày -> phải là 31/05/2026, không phải 30/05/2026
      assert.equal(result.nextBillingDate, "2026-05-31");
      assert.equal(result.daysLeft, 30);
    });

    it("Ca 21: Hàng năm ngày bắt đầu bình thường (15/08) qua nhiều năm", () => {
      const result = calculateBillingSchedule("2020-08-15", "yearly", "2026-01-01");
      assert.equal(result.nextBillingDate, "2026-08-15");
      assert.equal(result.alertLevel, "safe");
    });

    it("Ca 22: Hàng năm ngày bắt đầu hôm nay -> next = today + 1 năm", () => {
      const result = calculateBillingSchedule("2026-11-01", "yearly", "2026-11-01");
      assert.equal(result.nextBillingDate, "2027-11-01");
      assert.equal(result.daysLeft, 365);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.isToday, false);
    });

    it("Ca 23: Hàng năm ngày bắt đầu ở tương lai -> next = startDate + 1 năm", () => {
      const result = calculateBillingSchedule("2027-05-20", "yearly", "2026-11-01");
      assert.equal(result.nextBillingDate, "2028-05-20");
      assert.equal(result.daysLeft, 566);
      assert.equal(result.isFuture, true);
    });

    it("Ca 32: Tình huống người dùng báo lỗi - Ngày 04/11/2026, chu kỳ hàng tuần, hôm nay là 03/11/2026 -> next = 11/11/2026, daysLeft = 8", () => {
      const result = calculateBillingSchedule("2026-11-04", "weekly", "2026-11-03");
      assert.equal(result.nextBillingDate, "2026-11-11");
      assert.equal(result.daysLeft, 8);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 0);
    });

    it("Ca 33: Ngày 04/11/2026, chu kỳ hàng tháng, hôm nay là 03/11/2026 -> next = 04/12/2026, daysLeft = 31", () => {
      const result = calculateBillingSchedule("2026-11-04", "monthly", "2026-11-03");
      assert.equal(result.nextBillingDate, "2026-12-04");
      assert.equal(result.daysLeft, 31);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 0);
    });

    it("Ca 34: Ngày 04/11/2026, chu kỳ hàng năm, hôm nay là 03/11/2026 -> next = 04/11/2027, daysLeft = 366", () => {
      const result = calculateBillingSchedule("2026-11-04", "yearly", "2026-11-03");
      assert.equal(result.nextBillingDate, "2027-11-04");
      assert.equal(result.daysLeft, 366);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 0);
    });

    it("Ca 24: Gói trạng thái cancelled -> trả về null cho tất cả giá trị dẫn xuất", () => {
      const result = calculateBillingSchedule("2024-01-31", "monthly", "2026-02-15", "cancelled");
      assert.equal(result.nextBillingDate, null);
      assert.equal(result.daysLeft, null);
      assert.equal(result.progress, null);
      assert.equal(result.alertLevel, null);
      assert.equal(result.formattedDate, "—");
    });

    it("Ca 25: Ranh giới cảnh báo: còn đúng 3 ngày -> safe", () => {
      const result = calculateBillingSchedule("2026-10-01", "monthly", "2026-10-29");
      // Next date = 01/11/2026 (tháng 10 có 31 ngày: 29 -> 30 (1), 31 (2), 01 (3))
      assert.equal(result.nextBillingDate, "2026-11-01");
      assert.equal(result.daysLeft, 3);
      assert.equal(result.alertLevel, "safe");
    });

    it("Ca 26: Ranh giới cảnh báo: còn đúng 2 ngày -> warning", () => {
      const result = calculateBillingSchedule("2026-10-01", "monthly", "2026-10-30");
      assert.equal(result.nextBillingDate, "2026-11-01");
      assert.equal(result.daysLeft, 2);
      assert.equal(result.alertLevel, "warning");
    });

    it("Ca 27: Ranh giới cảnh báo: còn đúng 1 ngày -> warning", () => {
      const result = calculateBillingSchedule("2026-10-01", "monthly", "2026-10-31");
      assert.equal(result.nextBillingDate, "2026-11-01");
      assert.equal(result.daysLeft, 1);
      assert.equal(result.alertLevel, "warning");
    });

    it("Ca 28: Năm nhuận 2000 (chia hết cho 400) ngày 29/02", () => {
      const result = calculateBillingSchedule("2000-02-29", "yearly", "2000-03-01");
      assert.equal(result.nextBillingDate, "2001-02-28");
    });

    it("Ca 29: Năm không nhuận 2100 (chia hết cho 100 nhưng không chia hết cho 400)", () => {
      const result = calculateBillingSchedule("2096-02-29", "yearly", "2099-03-01");
      // Năm 2100 không nhuận -> 28/02/2100
      assert.equal(result.nextBillingDate, "2100-02-28");
    });

    it("Ca 30: Hỗ trợ định dạng ngày Việt Nam dd/MM/yyyy ở đầu vào", () => {
      const result = calculateBillingSchedule("31/01/2024", "monthly", "15/02/2026");
      assert.equal(result.nextBillingDate, "2026-02-28");
      assert.equal(result.daysLeft, 13);
      assert.equal(result.alertLevel, "safe");
      assert.equal(result.progress, 54);
    });

    it("Ca 31: getNextPaymentDate tương thích ngược với code cũ", () => {
      const nextDate = getNextPaymentDate("2024-01-31", "monthly", new Date("2026-02-15T00:00:00Z"));
      assert.equal(nextDate, "2026-02-28");
    });
  });
});
