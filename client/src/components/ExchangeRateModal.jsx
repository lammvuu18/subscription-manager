import { useState, useEffect } from "react";
import { formatCurrencyVND } from "../utils/currency";

export default function ExchangeRateModal({
  isOpen,
  onClose,
  currentRate = 25000,
  onSave,
}) {
  const [rate, setRate] = useState(String(currentRate));
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setRate(String(currentRate || 25000));
    setError("");
    setIsSubmitting(false);
  }, [currentRate, isOpen]);

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

  // Tính ví dụ trực tiếp (SCR-04: ChatGPT 20$ -> X đ/tháng)
  const numRate = Number(rate);
  const exampleText =
    !isNaN(numRate) && numRate > 0
      ? `Ví dụ: ChatGPT 20,00 $ → ${formatCurrencyVND(20 * numRate)} / tháng`
      : "Ví dụ: ChatGPT 20,00 $ → — / tháng";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rate || isNaN(Number(rate))) {
      setError("Tỷ giá phải là số lớn hơn 0 và không quá 1.000.000. (ERR-14)");
      return;
    }

    const val = Number(rate);
    if (val <= 0 || val > 1000000) {
      setError("Tỷ giá phải là số lớn hơn 0 và không quá 1.000.000. (ERR-14)");
      return;
    }

    const parts = String(rate).split(".");
    if (parts.length > 1 && parts[1].length > 2) {
      setError("Tỷ giá tối đa 2 chữ số thập phân. (ERR-14)");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(val);
      onClose();
    } catch (err) {
      setError(err.message || "Không thể lưu tỷ giá; hãy thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Cấu hình tỷ giá quy đổi</h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-simple-form">
          <p className="modal-hint">Đơn vị chung: VNĐ (cố định)</p>

          <div className="rate-input-row">
            <span className="rate-prefix">1 USD =</span>
            <input
              type="number"
              min="1"
              max="1000000"
              step="0.01"
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setError("");
              }}
              disabled={isSubmitting}
              autoFocus
            />
            <span className="rate-suffix">VNĐ</span>
          </div>

          {error && <div className="field-error">{error}</div>}

          <p className="modal-subtext">
            Giá trị mặc định: 25.000. Thay đổi sẽ tính lại toàn bộ tổng chi phí và biểu đồ.
          </p>

          <div className="example-preview-box">{exampleText}</div>

          <div className="modal-actions">
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
              {isSubmitting ? "Đang lưu..." : "Lưu tỷ giá"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
