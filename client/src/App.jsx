import { useState, useEffect, useCallback } from "react";
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  changeSubscriptionStatus,
  deleteSubscription,
  getExchangeRate,
  updateExchangeRate,
  logoutUser,
} from "./api/subscriptions";
import { calculateBillingSchedule } from "./utils/billing";
import { toMonthlyVND, formatCurrencyVND } from "./utils/currency";
import Dashboard from "./components/Dashboard";
import SubscriptionModal from "./components/SubscriptionModal";
import ExchangeRateModal from "./components/ExchangeRateModal";
import AuthModal from "./components/AuthModal";
import { ToastProvider, useToast } from "./context/ToastContext";
import "./App.css";

function AppContent() {
  const toast = useToast();

  const [subscriptions, setSubscriptions] = useState([]);
  const [exchangeRate, setExchangeRate] = useState(25000);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("dashboard"); // 'dashboard' | 'manage'

  // Modal states
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Khởi tạo kiểm tra user trong localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("subtracker_user");
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }, []);

  // Tải danh sách và tỷ giá
  const loadData = useCallback(async () => {
    try {
      const [subs, rateData] = await Promise.all([
        getSubscriptions(),
        getExchangeRate().catch(() => ({ exchangeRate: 25000 })),
      ]);
      setSubscriptions(subs);
      if (rateData && rateData.exchangeRate) {
        setExchangeRate(Number(rateData.exchangeRate));
      }
    } catch (err) {
      if (err.status === 401 || err.code === "ERR-19") {
        setCurrentUser(null);
        toast.warning("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. (ERR-19)");
        try {
          const guestSubs = await getSubscriptions();
          setSubscriptions(guestSubs);
        } catch {
          // Bỏ qua nếu lỗi mạng thực sự
        }
      } else {
        toast.warning("Không thể kết nối máy chủ. Vui lòng thử lại. (ERR-13)");
      }
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Thêm mới hoặc cập nhật gói đăng ký (UC-01, UC-02)
  const handleSaveSubscription = async (formData) => {
    if (editingSub && editingSub.id) {
      await updateSubscription(editingSub.id, formData);
      // DIS-07: Sửa = cyan / xanh lơ
      toast.info(`Đã cập nhật gói «${formData.service_name}»`);
    } else {
      await createSubscription(formData);
      // DIS-07: Thêm = xanh lục
      toast.success(`Đã thêm gói «${formData.service_name}»`);
    }
    await loadData();
  };

  // Mở modal thêm mới
  const handleOpenAddModal = () => {
    setEditingSub(null);
    setSubModalOpen(true);
  };

  // Mở modal sửa
  const handleOpenEditModal = (sub) => {
    setEditingSub(sub);
    setSubModalOpen(true);
  };

  // Đổi trạng thái 1-click Hủy / Kích hoạt lại (UC-04, FR-04)
  const handleToggleStatus = async (sub) => {
    const newStatus = sub.status === "active" ? "cancelled" : "active";
    const monthlyCost = toMonthlyVND(
      sub.amount,
      sub.currency,
      sub.billing_cycle,
      exchangeRate
    );
    const costFormatted = formatCurrencyVND(monthlyCost);

    try {
      await changeSubscriptionStatus(sub.id, newStatus);
      await loadData();

      if (newStatus === "cancelled") {
        // DIS-07: Hủy = đỏ/hồng
        toast.danger(`Đã hủy gói «${sub.service_name}» — giảm ${costFormatted}/tháng`);
      } else {
        // Kích hoạt lại = xanh lục
        toast.success(`Đã kích hoạt lại gói «${sub.service_name}» — tăng ${costFormatted}/tháng`);
      }
    } catch (err) {
      toast.warning(err.message || "Không thể đổi trạng thái");
    }
  };

  // Xóa gói đăng ký (UC-03, FR-03, DIS-08)
  const handleDelete = async (sub) => {
    if (!window.confirm(`Xóa gói «${sub.service_name}»? Hành động này không thể hoàn tác.`)) {
      return;
    }
    try {
      await deleteSubscription(sub.id);
      await loadData();
      // DIS-07: Xóa = đỏ/hồng
      toast.danger(`Đã xóa gói «${sub.service_name}»`);
    } catch (err) {
      toast.warning("Không thể xóa gói đăng ký. (ERR-12)");
    }
  };

  // Cập nhật tỷ giá (UC-07, FR-10)
  const handleSaveRate = async (newRate) => {
    await updateExchangeRate(newRate);
    setExchangeRate(newRate);
    // DIS-07: Cập nhật tỷ giá = cyan
    toast.info(`Đã cập nhật tỷ giá: 1 USD = ${formatCurrencyVND(newRate)}`);
    await loadData();
  };

  // Đăng xuất
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    toast.info("Đã đăng xuất tài khoản.");
  };

  // Đăng nhập thành công
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    toast.success(`Đăng nhập thành công! Chào mừng ${user.email}`);
    loadData();
  };

  const money = (amount, currency) =>
    `${Number(amount).toLocaleString("vi-VN")} ${currency}`;

  return (
    <div className="app-layout">
      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-brand">SubTracker</div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item${tab === "dashboard" ? " nav-active" : ""}`}
            onClick={() => setTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`nav-item${tab === "manage" ? " nav-active" : ""}`}
            onClick={() => setTab("manage")}
          >
            Quản lý dịch vụ
          </button>
        </nav>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="main-content">
        {/* Top bar toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            background: "white",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              Tỷ giá quy đổi:{" "}
              <strong style={{ color: "#0f172a" }}>
                1 USD = {formatCurrencyVND(exchangeRate)}
              </strong>
            </span>
            <button
              type="button"
              className="secondary-btn"
              style={{ padding: "4px 10px", fontSize: "12px" }}
              onClick={() => setRateModalOpen(true)}
            >
              ⚙ Đổi tỷ giá
            </button>
          </div>

          <div className="header-actions">
            {currentUser ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="user-badge">{currentUser.email}</span>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: "5px 10px", fontSize: "12px" }}
                  onClick={handleLogout}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setAuthModalOpen(true)}
              >
                Đăng nhập / Đăng ký
              </button>
            )}
          </div>
        </div>

        {/* DASHBOARD TAB */}
        {tab === "dashboard" && <Dashboard subscriptions={subscriptions} />}

        {/* MANAGE TAB */}
        {tab === "manage" && (
          <>
            <div
              className="page-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 className="page-title">Quản lý dịch vụ</h2>
                <p className="page-sub">
                  Danh sách chi tiết các gói đăng ký định kỳ
                </p>
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={handleOpenAddModal}
              >
                + Thêm gói đăng ký
              </button>
            </div>

            <section className="panel">
              <h3 className="panel-title">
                Danh sách đăng ký ({subscriptions.length})
              </h3>
              {subscriptions.length === 0 ? (
                <p style={{ color: "#64748b" }}>
                  Chưa có gói đăng ký nào. Hãy thêm gói đầu tiên của bạn. (ERR-20)
                </p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Dịch vụ</th>
                        <th>Chi phí</th>
                        <th>Chu kỳ</th>
                        <th>Ngày bắt đầu</th>
                        <th>Thanh toán tiếp theo</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((item) => {
                        let nextDateDisplay = "—";
                        let statusColor = "#6b7280";
                        if (item.status === "active") {
                          try {
                            const sched = calculateBillingSchedule(
                              item.start_date,
                              item.billing_cycle,
                              new Date(),
                              "active"
                            );
                            nextDateDisplay = `${sched.formattedDateVN} (${sched.isToday ? "Hôm nay" : `còn ${sched.daysLeft} ngày`})`;
                            statusColor = "#10b981";
                          } catch {
                            nextDateDisplay = "—";
                          }
                        }

                        return (
                          <tr
                            key={item.id}
                            style={{
                              opacity: item.status === "cancelled" ? 0.65 : 1,
                              backgroundColor:
                                item.status === "cancelled" ? "#fbfbfb" : "transparent",
                            }}
                          >
                            <td>
                              <strong style={{ color: "#1e293b" }}>
                                {item.service_name}
                              </strong>
                            </td>
                            <td>{money(item.amount, item.currency)}</td>
                            <td>
                              {item.billing_cycle === "weekly"
                                ? "Hàng tuần"
                                : item.billing_cycle === "yearly"
                                ? "Hàng năm"
                                : "Hàng tháng"}
                            </td>
                            <td>{String(item.start_date).slice(0, 10)}</td>
                            <td>{nextDateDisplay}</td>
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  color: statusColor,
                                  background:
                                    item.status === "active"
                                      ? "#ecfdf5"
                                      : "#f3f4f6",
                                }}
                              >
                                {item.status === "active"
                                  ? "Đang hoạt động"
                                  : "Đã hủy"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  style={{ padding: "4px 8px", fontSize: "12px" }}
                                  onClick={() => handleOpenEditModal(item)}
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  className="secondary-btn"
                                  style={{
                                    padding: "4px 8px",
                                    fontSize: "12px",
                                    color:
                                      item.status === "active"
                                        ? "#b91c1c"
                                        : "#047857",
                                  }}
                                  onClick={() => handleToggleStatus(item)}
                                >
                                  {item.status === "active"
                                    ? "Hủy gói"
                                    : "Kích hoạt"}
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  style={{ padding: "4px 8px", fontSize: "12px" }}
                                  onClick={() => handleDelete(item)}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ===== MODALS ===== */}
      <SubscriptionModal
        isOpen={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        onSave={handleSaveSubscription}
        initialData={editingSub}
        exchangeRate={exchangeRate}
      />

      <ExchangeRateModal
        isOpen={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        currentRate={exchangeRate}
        onSave={handleSaveRate}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
