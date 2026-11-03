/**
 * billing.js - Logic tính toán ngày thanh toán tiếp theo và chu kỳ
 * Tuân thủ nghiêm ngặt các quy tắc nghiệp vụ trong SRS SubTracker v1.0:
 * - BUS-01: Ngày thanh toán tiếp theo = ngày sớm nhất không nhỏ hơn today trong dãy startDate + k chu kỳ (k = 0, 1, 2...). Luôn cộng từ startDate gốc.
 * - BUS-02: Hàng tuần: cộng 7 * k ngày.
 * - BUS-03: Hàng tháng: cộng k tháng; nếu tháng đích thiếu ngày thì lấy ngày cuối tháng đó (clamp). Tháng kế tiếp vẫn dùng ngày D gốc.
 * - BUS-04: Hàng năm: cộng k năm; 29/02 thành 28/02 ở năm không nhuận.
 * - BUS-05: today theo Asia/Ho_Chi_Minh cắt về 00:00. Nếu trùng today thì daysLeft = 0.
 * - BUS-06: Nếu startDate >= today thì ngày thanh toán tiếp theo = startDate (k = 0).
 * - BUS-07: Gói cancelled không tính ngày thanh toán (trả về null).
 * - BUS-12: progress = clamp([0, 100], (today - prev) / (next - prev) * 100); k=0 thì prev = startDate - 1 chu kỳ.
 * - BUS-13: daysLeft = next - today; alertLevel = 'warning' nếu daysLeft < 3, ngược lại 'safe'.
 */

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(year, month) {
  // month: 1 - 12
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

/**
 * Phân tích ngày thành { year, month, day }
 * Hỗ trợ string (YYYY-MM-DD hoặc DD/MM/YYYY) và Date object
 */
function parseDateParts(input) {
  if (!input) return null;

  if (typeof input === "string") {
    const isoMatch = input.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return {
        year: parseInt(isoMatch[1], 10),
        month: parseInt(isoMatch[2], 10),
        day: parseInt(isoMatch[3], 10),
      };
    }
    const vnMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vnMatch) {
      return {
        year: parseInt(vnMatch[3], 10),
        month: parseInt(vnMatch[2], 10),
        day: parseInt(vnMatch[1], 10),
      };
    }
  }

  if (input instanceof Date) {
    // Chuyển sang múi giờ Asia/Ho_Chi_Minh
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.format(input); // "YYYY-MM-DD"
    const [y, m, d] = parts.split("-").map(Number);
    return { year: y, month: m, day: d };
  }

  return null;
}

function formatDateISO(year, month, day) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function formatDateVN(year, month, day) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${d}/${m}/${year}`;
}

const MS_PER_DAY = 86400000;

/**
 * Tính candidate và prevDate cho chu kỳ monthly với bước lặp k
 */
function getMonthlyStep(startY, startM, startD, k) {
  const totalMonths = (startY * 12 + (startM - 1)) + k;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
  const maxDays = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(startD, maxDays);

  return {
    year: targetYear,
    month: targetMonth,
    day: targetDay,
    utc: Date.UTC(targetYear, targetMonth - 1, targetDay),
  };
}

/**
 * Tính candidate và prevDate cho chu kỳ yearly với bước lặp k
 */
function getYearlyStep(startY, startM, startD, k) {
  const targetYear = startY + k;
  const targetMonth = startM;
  const maxDays = getDaysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(startD, maxDays);

  return {
    year: targetYear,
    month: targetMonth,
    day: targetDay,
    utc: Date.UTC(targetYear, targetMonth - 1, targetDay),
  };
}

/**
 * Hàm tính toán chi tiết chu kỳ thanh toán
 * @param {string|Date} startDateInput - Ngày bắt đầu
 * @param {'weekly'|'monthly'|'yearly'} cycle - Chu kỳ
 * @param {string|Date} [todayInput=new Date()] - Ngày hiện tại (Asia/Ho_Chi_Minh)
 * @param {'active'|'cancelled'} [status='active'] - Trạng thái gói
 * @returns {object} Chi tiết ngày thanh toán tiếp theo
 */
function calculateBillingSchedule(startDateInput, cycle, todayInput = new Date(), status = "active") {
  if (status === "cancelled") {
    return {
      nextBillingDate: null,
      formattedDate: "—",
      formattedDateVN: "—",
      daysLeft: null,
      progress: null,
      alertLevel: null,
      status: "cancelled",
    };
  }

  const startParts = parseDateParts(startDateInput);
  const todayParts = parseDateParts(todayInput);

  if (!startParts || !todayParts) {
    throw new Error("Ngày không hợp lệ");
  }

  const utcStart = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
  const utcToday = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);

  let nextStep;
  let prevStep;
  let k = 0;

  if (cycle === "weekly") {
    if (utcStart >= utcToday) {
      // Bắt đầu hôm nay hoặc trong tương lai: chu kỳ thanh toán tiếp theo là startDate + 7 ngày
      k = 1;
      const nextUtc = utcStart + 7 * MS_PER_DAY;
      const prevUtc = utcStart;
      const nextDateObj = new Date(nextUtc);
      const prevDateObj = new Date(prevUtc);
      nextStep = {
        year: nextDateObj.getUTCFullYear(),
        month: nextDateObj.getUTCMonth() + 1,
        day: nextDateObj.getUTCDate(),
        utc: nextUtc,
      };
      prevStep = {
        year: prevDateObj.getUTCFullYear(),
        month: prevDateObj.getUTCMonth() + 1,
        day: prevDateObj.getUTCDate(),
        utc: prevUtc,
      };
    } else {
      const daysDiff = (utcToday - utcStart) / MS_PER_DAY;
      k = Math.ceil(daysDiff / 7);
      const nextUtc = utcStart + k * 7 * MS_PER_DAY;
      const prevUtc = utcStart + (k - 1) * 7 * MS_PER_DAY;
      const nextDateObj = new Date(nextUtc);
      const prevDateObj = new Date(prevUtc);
      nextStep = {
        year: nextDateObj.getUTCFullYear(),
        month: nextDateObj.getUTCMonth() + 1,
        day: nextDateObj.getUTCDate(),
        utc: nextUtc,
      };
      prevStep = {
        year: prevDateObj.getUTCFullYear(),
        month: prevDateObj.getUTCMonth() + 1,
        day: prevDateObj.getUTCDate(),
        utc: prevUtc,
      };
    }
  } else if (cycle === "monthly") {
    if (utcStart >= utcToday) {
      // Bắt đầu hôm nay hoặc trong tương lai: chu kỳ tiếp theo là startDate + 1 tháng
      k = 1;
      nextStep = getMonthlyStep(startParts.year, startParts.month, startParts.day, 1);
      prevStep = getMonthlyStep(startParts.year, startParts.month, startParts.day, 0);
    } else {
      k = 1;
      let candidate = getMonthlyStep(startParts.year, startParts.month, startParts.day, k);
      while (candidate.utc < utcToday) {
        k++;
        candidate = getMonthlyStep(startParts.year, startParts.month, startParts.day, k);
      }
      nextStep = candidate;
      prevStep = getMonthlyStep(startParts.year, startParts.month, startParts.day, k - 1);
    }
  } else if (cycle === "yearly") {
    if (utcStart >= utcToday) {
      // Bắt đầu hôm nay hoặc trong tương lai: chu kỳ tiếp theo là startDate + 1 năm
      k = 1;
      nextStep = getYearlyStep(startParts.year, startParts.month, startParts.day, 1);
      prevStep = getYearlyStep(startParts.year, startParts.month, startParts.day, 0);
    } else {
      k = 1;
      let candidate = getYearlyStep(startParts.year, startParts.month, startParts.day, k);
      while (candidate.utc < utcToday) {
        k++;
        candidate = getYearlyStep(startParts.year, startParts.month, startParts.day, k);
      }
      nextStep = candidate;
      prevStep = getYearlyStep(startParts.year, startParts.month, startParts.day, k - 1);
    }
  } else {
    throw new Error(`Chu kỳ không hợp lệ: ${cycle}`);
  }

  // Tính số ngày còn lại (daysLeft)
  const daysLeft = Math.round((nextStep.utc - utcToday) / MS_PER_DAY);

  // Tính mức cảnh báo (alertLevel - BUS-13)
  const alertLevel = daysLeft < 3 ? "warning" : "safe";

  // Tính tiến độ (progress - BUS-12)
  let rawProgress;
  if (daysLeft === 0) {
    rawProgress = 100;
  } else if (utcToday <= utcStart) {
    rawProgress = 0;
  } else {
    const totalCycleMs = nextStep.utc - prevStep.utc;
    const elapsedMs = utcToday - prevStep.utc;
    rawProgress = totalCycleMs > 0 ? (elapsedMs / totalCycleMs) * 100 : 0;
  }
  const clampedProgress = Math.max(0, Math.min(100, Math.round(rawProgress)));

  const nextBillingDate = formatDateISO(nextStep.year, nextStep.month, nextStep.day);
  const formattedDateVN = formatDateVN(nextStep.year, nextStep.month, nextStep.day);

  return {
    nextBillingDate, // "YYYY-MM-DD"
    formattedDate: nextBillingDate,
    formattedDateVN, // "DD/MM/YYYY"
    daysLeft,
    progress: clampedProgress,
    alertLevel,
    isToday: daysLeft === 0,
    isFuture: utcStart > utcToday,
    status: "active",
  };
}

/**
 * Hàm tương thích ngược với code cũ: trả về chuỗi "YYYY-MM-DD"
 */
function getNextPaymentDate(startDate, cycle, today = new Date()) {
  const result = calculateBillingSchedule(startDate, cycle, today, "active");
  return result.nextBillingDate;
}

module.exports = {
  isLeapYear,
  getDaysInMonth,
  parseDateParts,
  formatDateISO,
  formatDateVN,
  calculateBillingSchedule,
  getNextPaymentDate,
};
