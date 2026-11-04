/**
 * currency.js - Logic quy đổi tiền tệ và tính tổng chi phí (Frontend ESM)
 * Tuân thủ nghiêm ngặt các quy tắc nghiệp vụ trong SRS SubTracker v1.0 (BUS-08 đến BUS-11, DIS-06)
 */

export const DEFAULT_EXCHANGE_RATE = 25000;

export function toMonthlyVND(amount, currency, billingCycle, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    return 0;
  }

  const amountInVND = currency === "USD" ? numericAmount * exchangeRate : numericAmount;

  if (billingCycle === "weekly") {
    return amountInVND * 4;
  }
  if (billingCycle === "yearly") {
    return amountInVND / 12;
  }
  return amountInVND;
}

export function toYearlyVND(amount, currency, billingCycle, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  return toMonthlyVND(amount, currency, billingCycle, exchangeRate) * 12;
}

export function calculateExpenseSummary(subscriptions = [], exchangeRate = DEFAULT_EXCHANGE_RATE) {
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
      totalMonthlyRaw += monthlyCost;
      activeCount++;
    }
  }

  const totalYearlyRaw = totalMonthlyRaw * 12;

  return {
    totalMonthly: totalMonthlyRaw,
    totalYearly: totalYearlyRaw,
    savedMonthly: savedMonthlyRaw,
    activeCount,
    cancelledCount,
    totalMonthlyRounded: Math.round(totalMonthlyRaw),
    totalYearlyRounded: Math.round(totalYearlyRaw),
    savedMonthlyRounded: Math.round(savedMonthlyRaw),
    formattedTotalMonthly: formatCurrencyVND(totalMonthlyRaw),
    formattedTotalYearly: formatCurrencyVND(totalYearlyRaw),
    formattedSavedMonthly: formatCurrencyVND(savedMonthlyRaw),
  };
}

export function formatCurrencyVND(amount) {
  const rounded = Math.round(Number(amount) || 0);
  return `${rounded.toLocaleString("en-US")} ₫`;
}

export function formatOriginalCurrency(amount, currency) {
  const num = Number(amount) || 0;
  if (currency === "USD") {
    const formatted = num.toLocaleString("vi-VN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} $`;
  }
  return formatCurrencyVND(num);
}
