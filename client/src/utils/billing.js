/**
 * billing.js - Logic tính toán ngày thanh toán tiếp theo và chu kỳ (Frontend ESM)
 * Tuân thủ nghiêm ngặt các quy tắc nghiệp vụ trong SRS SubTracker v1.0 (BUS-01 đến BUS-07, BUS-12, BUS-13)
 */

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year, month) {
  // month: 1 - 12
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }
  return 31;
}

export function parseDateParts(input) {
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
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.format(input);
    const [y, m, d] = parts.split("-").map(Number);
    return { year: y, month: m, day: d };
  }

  return null;
}

export function formatDateISO(year, month, day) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function formatDateVN(year, month, day) {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${d}/${m}/${year}`;
}

const MS_PER_DAY = 86400000;

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
 * Tính chi tiết chu kỳ thanh toán
 */
export function calculateBillingSchedule(startDateInput, cycle, todayInput = new Date(), status = "active") {
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

  const daysLeft = Math.round((nextStep.utc - utcToday) / MS_PER_DAY);
  const alertLevel = daysLeft < 3 ? "warning" : "safe";

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
    nextBillingDate,
    formattedDate: nextBillingDate,
    formattedDateVN,
    daysLeft,
    progress: clampedProgress,
    alertLevel,
    isToday: daysLeft === 0,
    isFuture: utcStart > utcToday,
    status: "active",
  };
}

/**
 * Hàm tương thích ngược: trả về chuỗi "YYYY-MM-DD"
 */
export function getNextPaymentDate(startDate, cycle, today = new Date()) {
  const result = calculateBillingSchedule(startDate, cycle, today, "active");
  return result.nextBillingDate;
}
