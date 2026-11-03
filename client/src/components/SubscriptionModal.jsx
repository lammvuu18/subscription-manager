import { useState, useEffect } from "react";
import { calculateBillingSchedule } from "../utils/billing";
import { toMonthlyVND, formatCurrencyVND } from "../utils/currency";

export default function SubscriptionModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  exchangeRate = 25000,
}) {
  const isEdit = Boolean(initialData && initialData.id);

  const getTodayISO = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const defaultForm = {
    service_name: "",
    amount: "",
    currency: "VND",
    billing_cycle: "monthly",
    start_date: getTodayISO(),
    status: "active",
  };

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        service_name: initialData.service_name || "",
        amount: initialData.amount !== undefined ? String(initialData.amount) : "",
        currency: initialData.currency || "VND",
        billing_cycle: initialData.billing_cycle || "monthly",
        start_date: initialData.start_date
          ? String(initialData.start_date).slice(0, 10)
          : getTodayISO(),
        status: initialData.status || "active",
      });
    } else {
      setForm(defaultForm);
    }
    setErrors({});
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Preview ngày thanh toán tiếp theo và chi phí quy đổi
  let previewText = null;
  try {
    if (form.start_date && form.amount && Number(form.amount) > 0) {
      const schedule = calculateBillingSchedule(
        form.start_date,
        form.billing_cycle,
        new Date(),
        form.status
      );

      const monthlyVND = toMonthlyVND(
        Number(form.amount),
        form.currency,
        form.billing_cycle,
        exchangeRate
      );

      if (form.status === "cancelled") {
        previewText = "Gói đã hủy · Không tính vào tổng chi phí";
      } else {
        const daysText = schedule.isToday ? "Hôm nay" : `còn ${schedule.daysLeft} ngày`;
        previewText = `${schedule.formattedDateVN} (${daysText}) · ≈ ${formatCurrencyVND(monthlyVND)} / tháng`;
      }
    }
  } catch {
    previewText = null;
  }

  const validateForm = () => {
    const newErrors = {};

    const nameTrimmed = form.service_name.trim();
    if (!nameTrimmed) {
      newErrors.service_name = "Vui lòng nhập tên dịch vụ.";
    } else if (nameTrimmed.length > 100) {
      newErrors.service_name = "Tên dịch vụ tối đa 100 ký tự.";
    }

    if (form.amount === "" || isNaN(Number(form.amount))) {
      newErrors.amount = "Vui lòng nhập số tiền hợp lệ.";
    } else {
      const numAmount = Number(form.amount);
      if (numAmount <= 0) {
        newErrors.amount = "Số tiền phải lớn hơn 0.";
      } else if (numAmount > 1000000000) {
        newErrors.amount = "Số tiền không được vượt quá 1.000.000.000.";
      } else if (form.currency === "VND" && !Number.isInteger(numAmount)) {
        newErrors.amount = "VNĐ chỉ nhận số nguyên.";
      } else if (form.currency === "USD") {
        const parts = String(form.amount).split(".");
        if (parts.length > 1 && parts[1].length > 2) {
          newErrors.amount = "USD tối đa 2 chữ số thập phân.";
        }
      }
    }

    if (!form.start_date) {
      newErrors.start_date = "Ngày bắt đầu không hợp lệ.";
    } else {
      const parts = form.start_date.split("-").map(Number);
      if (parts.length === 3) {
        const [y, m, d] = parts;
        const utcDate = Date.UTC(y, m - 1, d);
        const minDate = Date.UTC(2000, 0, 1);
        const now = new Date();
        const maxDate = Date.UTC(now.getFullYear() + 5, now.getMonth(), now.getDate());

        if (utcDate < minDate || utcDate > maxDate) {
          newErrors.start_date = "Ngày bắt đầu phải từ 01/01/2000 đến 5 năm tới.";
        }
      } else {
        newErrors.start_date = "Ngày bắt đầu không hợp lệ.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...form,
        service_name: form.service_name.trim(),
        amount: Number(form.amount),
      });
      onClose();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err.message || "Không thể lưu dữ liệu; hãy thử lại.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEdit ? "Sửa gói đăng ký" : "Thêm gói đăng ký"}
          </h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {errors.form && <div className="modal-error-banner">{errors.form}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Hàng 1: Tên dịch vụ (full width) */}
          <div className="form-group full-width">
            <label htmlFor="service_name">Tên dịch vụ</label>
            <input
              id="service_name"
              type="text"
              name="service_name"
              placeholder="Ví dụ: Netflix, Spotify..."
              value={form.service_name}
              onChange={handleChange}
              disabled={isSubmitting}
              autoFocus
            />
            {errors.service_name && (
              <span className="field-error">{errors.service_name}</span>
            )}
          </div>

          {/* Hàng 2, Cột 1: Số tiền */}
          <div className="form-group">
            <label htmlFor="amount">Số tiền</label>
            <input
              id="amount"
              type="number"
              name="amount"
              min="0"
              step={form.currency === "VND" ? "1" : "0.01"}
              placeholder={form.currency === "VND" ? "260000" : "9.99"}
              value={form.amount}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </div>

          {/* Hàng 2, Cột 2: Loại tiền tệ */}
          <div className="form-group">
            <label htmlFor="currency">Loại tiền tệ</label>
            <select
              id="currency"
              name="currency"
              value={form.currency}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="VND">VNĐ</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Hàng 3, Cột 1: Chu kỳ thanh toán */}
          <div className="form-group">
            <label htmlFor="billing_cycle">Chu kỳ thanh toán</label>
            <select
              id="billing_cycle"
              name="billing_cycle"
              value={form.billing_cycle}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
              <option value="yearly">Hàng năm</option>
            </select>
          </div>

          {/* Hàng 3, Cột 2: Ngày bắt đầu */}
          <div className="form-group">
            <label htmlFor="start_date">Ngày bắt đầu</label>
            <input
              id="start_date"
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {errors.start_date && (
              <span className="field-error">{errors.start_date}</span>
            )}
          </div>

          {/* Hàng 4: Trạng thái (full width) */}
          <div className="form-group full-width">
            <label htmlFor="status">Trạng thái</label>
            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="active">Đang hoạt động</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>

          {/* Hàng 5: Xem trước trực tiếp */}
          {previewText && (
            <div className="preview-box full-width">
              <span className="preview-label">Xem trước ngày thanh toán tiếp theo:</span>
              <strong className="preview-val">{previewText}</strong>
            </div>
          )}

          {/* Hàng 6: Nút hành động */}
          <div className="modal-actions full-width">
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Lưu gói"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
