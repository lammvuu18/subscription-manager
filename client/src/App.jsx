import { getNextPaymentDate } from "./utils/billing";
import { useEffect, useState } from "react";
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
} from "./api/subscriptions";
import "./App.css";

const emptyForm = {
  service_name: "",
  amount: "",
  currency: "VND",
  billing_cycle: "monthly",
  start_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10),
  status: "active",
};

function App() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function loadSubscriptions() {
    try {
      setSubscriptions(await getSubscriptions());
      setError("");
    } catch {
      setError("Không thể kết nối backend. Hãy kiểm tra server.");
    }
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const data = {
      ...form,
      amount: Number(form.amount),
    };

    try {
      if (editingId !== null) {
        await updateSubscription(editingId, data);
      } else {
        await createSubscription(data);
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadSubscriptions();
    } catch {
      setError("Không thể lưu dữ liệu; hãy kiểm tra thông tin nhập.");
    }
  }

  function handleEdit(subscription) {
    setEditingId(subscription.id);
    setForm({
      service_name: subscription.service_name,
      amount: subscription.amount,
      currency: subscription.currency,
      billing_cycle: subscription.billing_cycle,
      start_date: String(subscription.start_date).slice(0, 10),
      status: subscription.status,
    });
  }

  async function handleDelete(id) {
    if (!window.confirm("Bạn có chắc muốn xóa gói đăng ký này?")) return;

    try {
      await deleteSubscription(id);
      await loadSubscriptions();
    } catch {
      setError("Không thể xóa gói đăng ký.");
    }
  }

  const money = (amount, currency) =>
    `${Number(amount).toLocaleString("vi-VN")} ${currency}`;

  return (
    <main className="container">
      <h1>SubTracker</h1>
      <p>Quản lý các gói đăng ký định kỳ của bạn</p>

      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>{editingId !== null ? "Sửa gói đăng ký" : "Thêm gói đăng ký"}</h2>

        <form onSubmit={handleSubmit}>
          <label>
            Tên dịch vụ
            <input
              name="service_name"
              value={form.service_name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Số tiền
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Tiền tệ
            <select name="currency" value={form.currency} onChange={handleChange}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </label>

          <label>
            Chu kỳ thanh toán
            <select
              name="billing_cycle"
              value={form.billing_cycle}
              onChange={handleChange}
            >
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
              <option value="yearly">Hàng năm</option>
            </select>
          </label>

          <label>
            Ngày bắt đầu
            <input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Trạng thái
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Đang hoạt động</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </label>

          <div className="actions">
            <button type="submit">
              {editingId !== null ? "Lưu thay đổi" : "Thêm dịch vụ"}
            </button>
            {editingId !== null && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Hủy sửa
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Danh sách đăng ký ({subscriptions.length})</h2>

        {subscriptions.length === 0 ? (
          <p>Chưa có gói đăng ký nào.</p>
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
                {subscriptions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.service_name}</td>
                    <td>{money(item.amount, item.currency)}</td>
                    <td>{item.billing_cycle}</td>
                    <td>{String(item.start_date).slice(0, 10)}</td>
                    <td>
                      {item.status === "active"
                        ? getNextPaymentDate(item.start_date, item.billing_cycle)
                        : "—"}
                    </td>
                    <td>{item.status === "active" ? "Đang hoạt động" : "Đã hủy"}</td>
                    <td>
                      <button onClick={() => handleEdit(item)}>Sửa</button>{" "}
                      <button
                        className="danger"
                        onClick={() => handleDelete(item.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;