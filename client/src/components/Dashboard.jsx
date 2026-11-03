import { useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { calculateBillingSchedule, parseDateParts } from "../utils/billing";
import {
  toMonthlyVND,
  toYearlyVND,
  formatCurrencyVND,
} from "../utils/currency";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);
ChartJS.defaults.font.family =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function money(amount) {
  return formatCurrencyVND(amount);
}

function cycleLabel(cycle) {
  if (cycle === "weekly") return "tuần";
  if (cycle === "monthly") return "tháng";
  return "năm";
}

// Bảng màu chuẩn từ 3 ảnh bảng màu người dùng cung cấp (Pastel Morning Breeze, Sunwashed Yellow, Petal Rouge, Dewy Blue)
const COLORS = [
  "#7FA8D6", // Morning Breeze (Ảnh 3)
  "#FFE08A", // Sunwashed Yellow (Ảnh 3)
  "#E27396", // Petal Rouge (Ảnh 4)
  "#A8C6E7", // Dewy Blue (Ảnh 3)
  "#B3DEE2", // Light Blue (Ảnh 4)
  "#EB9AB2", // Pink Mist (Ảnh 4)
  "#99C3E4", // Soft Sky Blue (Ảnh 2)
  "#FFF2B2", // Buttercup Sky (Ảnh 3)
  "#C1E4F3", // Pale Baby Blue (Ảnh 2)
  "#ECF2D8", // Beige Sage (Ảnh 4)
];

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={{ borderTopColor: accent }}>
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color: accent }}>{value}</p>
    </div>
  );
}

export default function Dashboard({ subscriptions }) {
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'cancelled'
  const [sortBy, setSortBy] = useState("nextBillingDate");
  // Yêu cầu: Mặc định là 'byService' (Theo gói), 'forecast' (6 tháng tới) là lựa chọn thứ 2
  const [barMetric, setBarMetric] = useState("byService");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 6;

  const active = subscriptions.filter((s) => s.status === "active");
  const cancelled = subscriptions.filter((s) => s.status === "cancelled");

  const totalMonthly = active.reduce(
    (sum, s) => sum + toMonthlyVND(s.amount, s.currency, s.billing_cycle),
    0
  );
  const totalYearly = totalMonthly * 12;
  const savedMonthly = cancelled.reduce(
    (sum, s) => sum + toMonthlyVND(s.amount, s.currency, s.billing_cycle),
    0
  );

  const today = new Date();

  // Donut chart: Tỷ trọng chi tiêu (%)
  const chartData = {
    labels: active.map((s) => s.service_name),
    datasets: [
      {
        data: active.map((s) =>
          Math.round(toMonthlyVND(s.amount, s.currency, s.billing_cycle))
        ),
        backgroundColor: COLORS.slice(0, active.length),
        borderColor: "#f8fafc",
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${money(ctx.raw)}/tháng`,
        },
      },
    },
  };

  // Dự báo chi tiêu 6 tháng tới (bắt đầu từ tháng hiện tại)
  const forecastMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthNum = d.getMonth() + 1;
    const yearShort = String(d.getFullYear()).slice(-2);
    const label = `Thg ${monthNum}/${yearShort}`;

    const total = active.reduce((sum, s) => {
      if (s.billing_cycle === "monthly") {
        return sum + toMonthlyVND(s.amount, s.currency, "monthly");
      }
      if (s.billing_cycle === "weekly") {
        return sum + toMonthlyVND(s.amount, s.currency, "weekly");
      }
      if (s.billing_cycle === "yearly") {
        const parts = parseDateParts(s.start_date);
        if (parts && parts.month === monthNum) {
          const rate = s.currency === "USD" ? 25000 : 1;
          return sum + Number(s.amount) * rate;
        }
        return sum;
      }
      return sum;
    }, 0);

    return { label, total: Math.round(total), isCurrent: i === 0 };
  });

  const forecastChartData = {
    labels: forecastMonths.map((m) => m.label),
    datasets: [
      {
        label: "Chi phí dự kiến",
        data: forecastMonths.map((m) => m.total),
        backgroundColor: forecastMonths.map((m) =>
          m.isCurrent ? "#5B8EC9" : "#A8D0EF"
        ),
        borderRadius: 4,
        borderSkipped: false,
        hoverBackgroundColor: "#4779B3",
      },
    ],
  };

  // So sánh chi phí các dịch vụ đang hoạt động (theo VNĐ/tháng)
  const byServiceChartData = {
    labels: active.map((s) => s.service_name),
    datasets: [
      {
        label: "Chi phí / tháng",
        data: active.map((s) =>
          Math.round(toMonthlyVND(s.amount, s.currency, s.billing_cycle))
        ),
        backgroundColor: COLORS.slice(0, active.length),
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${money(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: {
            family:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            size: 10,
          },
          color: "#64748b",
        },
      },
      y: {
        border: { dash: [4, 4] },
        grid: { color: "#f1f5f9" },
        ticks: {
          font: {
            family:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            size: 10,
          },
          color: "#94a3b8",
          callback: (value) => {
            if (value >= 1000000) return (value / 1000000).toFixed(1) + " tr";
            if (value >= 1000) return (value / 1000).toFixed(0) + "k";
            return value;
          },
        },
      },
    },
  };

  // Tính lịch và chi phí quy đổi cho toàn bộ subscriptions
  const enrichedSubscriptions = subscriptions.map((s) => {
    let schedule = {
      nextBillingDate: null,
      daysLeft: null,
      progress: null,
      alertLevel: null,
      isToday: false,
    };
    try {
      schedule = calculateBillingSchedule(s.start_date, s.billing_cycle, today, s.status);
    } catch {
      // Bỏ qua lỗi parse
    }
    const monthlyCost = toMonthlyVND(s.amount, s.currency, s.billing_cycle);
    return {
      ...s,
      schedule,
      monthlyCost,
    };
  });

  // 1. Lọc theo trạng thái
  const filteredList = enrichedSubscriptions.filter((s) => {
    if (statusFilter === "active") return s.status === "active";
    if (statusFilter === "cancelled") return s.status === "cancelled";
    return true;
  });

  // 2. Sắp xếp danh sách
  const sortedList = [...filteredList].sort((a, b) => {
    if (sortBy === "nextBillingDate") {
      if (a.status === "active" && b.status === "cancelled") return -1;
      if (a.status === "cancelled" && b.status === "active") return 1;
      if (a.status === "cancelled" && b.status === "cancelled") return 0;
      return (a.schedule.daysLeft ?? 999999) - (b.schedule.daysLeft ?? 999999);
    }
    if (sortBy === "nextBillingDateDesc") {
      if (a.status === "active" && b.status === "cancelled") return -1;
      if (a.status === "cancelled" && b.status === "active") return 1;
      if (a.status === "cancelled" && b.status === "cancelled") return 0;
      return (b.schedule.daysLeft ?? -1) - (a.schedule.daysLeft ?? -1);
    }
    if (sortBy === "costDesc") {
      return b.monthlyCost - a.monthlyCost;
    }
    if (sortBy === "costAsc") {
      return a.monthlyCost - b.monthlyCost;
    }
    if (sortBy === "nameAsc") {
      return a.service_name.localeCompare(b.service_name, "vi");
    }
    if (sortBy === "nameDesc") {
      return b.service_name.localeCompare(a.service_name, "vi");
    }
    return 0;
  });

  // 3. Phân trang tối đa 6 dịch vụ / trang
  const totalItems = sortedList.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const paginatedItems = sortedList.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-sub">Tổng quan tài chính đăng ký của bạn</p>
      </div>

      {/* ===== 4 stat cards được chia theo cùng grid với phần dưới để thẳng hàng 100% ===== */}
      <div className="stat-row">
        {/* Box Tổng chi phí / tháng: Cột trái (thẳng hàng tuyệt đối với box Donut bên dưới) */}
        <div className="stat-left">
          <StatCard
            label="Tổng chi phí / tháng"
            value={money(totalMonthly)}
            accent="#5B8EC9"
          />
        </div>

        {/* 3 box còn lại: Cột phải (thẳng hàng tuyệt đối với box Dịch vụ của bạn) */}
        <div className="stat-right">
          <StatCard
            label="Tổng chi phí / năm"
            value={money(totalYearly)}
            accent="#D99419"
          />
          <StatCard
            label="Gói đang hoạt động"
            value={`${active.length} gói`}
            accent="#10b981"
          />
          <StatCard
            label="Tiết kiệm nhờ hủy / tháng"
            value={money(savedMonthly)}
            accent="#E27396"
          />
        </div>
      </div>

      {/* ===== Charts + Service cards row ===== */}
      <div className="dash-bottom">
        {/* Cột trái: gồm 2 panel biểu đồ */}
        <div className="dash-left-col">
          {/* Panel 1: Biểu đồ Donut Tỷ trọng chi tiêu */}
          <div className="panel chart-panel">
            <div className="chart-header-row">
              <h3 className="panel-title" style={{ margin: 0 }}>Tỷ trọng chi tiêu</h3>
              <span className="chart-badge">Hàng tháng</span>
            </div>

            {active.length === 0 ? (
              <p className="empty-text">Chưa có dịch vụ đang hoạt động</p>
            ) : (
              <>
                <div className="donut-container">
                  <Doughnut data={chartData} options={chartOptions} />
                  <div className="donut-center">
                    <span className="donut-center-label">Tổng / tháng</span>
                    <span className="donut-center-value">{money(totalMonthly)}</span>
                  </div>
                </div>

                <ul className="chart-legend">
                  {active.map((s, i) => {
                    const sCost = toMonthlyVND(s.amount, s.currency, s.billing_cycle);
                    const pct =
                      totalMonthly > 0
                        ? ((sCost / totalMonthly) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <li key={s.id} className="legend-item">
                        <span
                          className="legend-dot"
                          style={{ background: COLORS[i % COLORS.length] }}
                        />
                        <span className="legend-name" title={s.service_name}>
                          {s.service_name}
                        </span>
                        <span className="legend-pct">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {/* Panel 2: Biểu đồ Cột theo dõi */}
          <div className="panel chart-panel-secondary">
            <div className="chart-header-row">
              <h3 className="panel-title" style={{ margin: 0 }}>
                {barMetric === "byService" ? "Chi phí từng gói" : "Dự báo chi phí"}
              </h3>
              <div className="mini-toggle-group">
                <button
                  type="button"
                  className={`mini-toggle-btn ${barMetric === "byService" ? "active" : ""}`}
                  onClick={() => setBarMetric("byService")}
                  title="So sánh chi phí VNĐ theo từng gói"
                >
                  Theo gói
                </button>
                <button
                  type="button"
                  className={`mini-toggle-btn ${barMetric === "forecast" ? "active" : ""}`}
                  onClick={() => setBarMetric("forecast")}
                  title="Dự báo chi tiêu 6 tháng tới"
                >
                  6 tháng tới
                </button>
              </div>
            </div>

            {active.length === 0 ? (
              <p className="empty-text">Chưa có dữ liệu để vẽ biểu đồ</p>
            ) : (
              <div className="bar-chart-container">
                <Bar
                  data={barMetric === "byService" ? byServiceChartData : forecastChartData}
                  options={barOptions}
                />
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Dịch vụ của bạn */}
        <div className="panel service-panel">
          {/* Header gồm Tiêu đề, Nút Lọc và Dropdown Sắp xếp trên cùng 1 đường thẳng */}
          <div className="service-panel-header">
            <h3 className="panel-title service-title">Dịch vụ của bạn</h3>

            <div className="service-controls">
              {/* Nút lọc trạng thái */}
              <div className="filter-group">
                <button
                  type="button"
                  className={`filter-btn ${statusFilter === "all" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                >
                  Tất cả ({subscriptions.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${statusFilter === "active" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("active");
                    setCurrentPage(1);
                  }}
                >
                  Đang hoạt động ({active.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${statusFilter === "cancelled" ? "active" : ""}`}
                  onClick={() => {
                    setStatusFilter("cancelled");
                    setCurrentPage(1);
                  }}
                >
                  Đã hủy ({cancelled.length})
                </button>
              </div>

              {/* Thanh lựa chọn đổ xuống Sắp xếp ở ngoài cùng bên phải */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="sort-select"
                aria-label="Tiêu chí sắp xếp"
              >
                <option value="nextBillingDate">Sắp xếp: Ngày TT gần nhất</option>
                <option value="nextBillingDateDesc">Sắp xếp: Ngày TT xa nhất</option>
                <option value="costDesc">Sắp xếp: Chi phí cao nhất</option>
                <option value="costAsc">Sắp xếp: Chi phí thấp nhất</option>
                <option value="nameAsc">Sắp xếp: Tên A → Z</option>
                <option value="nameDesc">Sắp xếp: Tên Z → A</option>
              </select>
            </div>
          </div>

          {subscriptions.length === 0 ? (
            <p className="empty-text">Chưa có gói đăng ký nào</p>
          ) : paginatedItems.length === 0 ? (
            <p className="empty-text">Không có dịch vụ nào khớp với bộ lọc</p>
          ) : (
            <>
              {/* Grid tối đa 6 thẻ */}
              <div className="service-cards-grid">
                {paginatedItems.map((s) => {
                  if (s.status === "cancelled") {
                    return (
                      <div key={s.id} className="service-card cancelled-card">
                        <div className="sc-header">
                          <span className="sc-name">{s.service_name}</span>
                          <span className="sc-badge cancelled-badge">Đã hủy</span>
                        </div>
                        <div className="sc-amount">
                          {Number(s.amount).toLocaleString("vi-VN")} {s.currency} /{" "}
                          {cycleLabel(s.billing_cycle)}
                        </div>
                        <div className="sc-approx">Đã hủy</div>
                        <div className="sc-next">Thanh toán tiếp: —</div>
                        <div className="sc-days-cancelled">Không tính vào tổng</div>
                      </div>
                    );
                  }

                  // Active
                  const { nextBillingDate, daysLeft, progress, alertLevel, isToday } = s.schedule;
                  const barPct = progress ?? 0;
                  const barColor = alertLevel === "warning" ? "#ef4444" : "#10b981";
                  const approx =
                    s.currency === "USD"
                      ? toMonthlyVND(s.amount, s.currency, s.billing_cycle)
                      : null;
                  const daysDisplay = isToday
                    ? "Hôm nay (0 ngày)"
                    : `còn ${daysLeft ?? 0} ngày`;

                  return (
                    <div key={s.id} className="service-card">
                      <div className="sc-header">
                        <span className="sc-name">{s.service_name}</span>
                        <span className="sc-badge active-badge">Đang hoạt động</span>
                      </div>
                      <div className="sc-amount">
                        {Number(s.amount).toLocaleString("vi-VN")} {s.currency} /{" "}
                        {cycleLabel(s.billing_cycle)}
                      </div>
                      {approx && (
                        <div className="sc-approx">≈ {money(approx)} / tháng</div>
                      )}
                      <div className="sc-next">Thanh toán tiếp: {nextBillingDate}</div>
                      <div className="sc-bar-wrap">
                        <div
                          className="sc-bar"
                          style={{ width: `${barPct}%`, background: barColor }}
                        />
                      </div>
                      <div className="sc-days" style={{ color: barColor }}>
                        {daysDisplay}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Thanh phân trang (nếu có trên 6 dịch vụ) */}
              {totalPages > 1 && (
                <div className="pagination-bar">
                  <span className="pagination-info">
                    Hiển thị {startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, totalItems)} / {totalItems} dịch vụ
                  </span>
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="page-btn"
                      disabled={validPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      aria-label="Trang trước"
                    >
                      ‹
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`page-btn ${validPage === num ? "active-page" : ""}`}
                        onClick={() => setCurrentPage(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="page-btn"
                      disabled={validPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      aria-label="Trang sau"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
