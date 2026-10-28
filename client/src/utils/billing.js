
function parseDate(dateString) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthlyDate(year, month, anchorDay) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(anchorDay, lastDay));
}

export function getNextPaymentDate(startDate, cycle, today = new Date()) {
  const start = parseDate(startDate);
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  if (start >= current) return dateToString(start);

  if (cycle === "weekly") {
    const days = Math.ceil((current - start) / 86400000);
    const weeks = Math.ceil(days / 7);
    start.setDate(start.getDate() + weeks * 7);
    return dateToString(start);
  }

  if (cycle === "monthly") {
    const anchorDay = start.getDate();
    let year = current.getFullYear();
    let month = current.getMonth();
    let candidate = monthlyDate(year, month, anchorDay);

    if (candidate < current) {
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
      candidate = monthlyDate(year, month, anchorDay);
    }

    return dateToString(candidate);
  }

  if (cycle === "yearly") {
    const month = start.getMonth();
    const day = start.getDate();
    let year = current.getFullYear();
    let candidate = monthlyDate(year, month, day);

    if (candidate < current) {
      candidate = monthlyDate(year + 1, month, day);
    }

    return dateToString(candidate);
  }

  throw new Error("Chu kỳ thanh toán không hợp lệ");
}
