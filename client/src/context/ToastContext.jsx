import { createContext, useContext, useState, useCallback, useMemo } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Tối đa 3 toast xếp chồng cùng lúc theo DIS-07
  const addToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type };

    setToasts((prev) => {
      // Tránh lặp lại đúng nội dung message giống hệt đang hiển thị
      if (prev.some((t) => t.message === message)) {
        return prev;
      }
      const updated = [...prev, newToast];
      if (updated.length > 3) {
        return updated.slice(updated.length - 3);
      }
      return updated;
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useMemo(
    () => ({
      // DIS-07: Thêm = xanh lục, Sửa = cyan, Xóa/Hủy = đỏ/hồng, Cảnh báo = vàng
      success: (msg, dur) => addToast(msg, "success", dur), // xanh lục (#10b981)
      info: (msg, dur) => addToast(msg, "info", dur),       // cyan / xanh lơ (#0284c7)
      danger: (msg, dur) => addToast(msg, "danger", dur),   // đỏ / hồng (#dc2626)
      warning: (msg, dur) => addToast(msg, "warning", dur), // vàng (#d97706)
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === "success" && "✓"}
              {t.type === "info" && "ℹ"}
              {t.type === "danger" && "✕"}
              {t.type === "warning" && "⚠"}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải được sử dụng bên trong ToastProvider");
  }
  return context.toast;
}
