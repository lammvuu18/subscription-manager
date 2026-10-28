const API_URL = "http://localhost:5000/api/subscriptions";

export async function getSubscriptions() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error("Không thể tải danh sách");
  return response.json();
}

export async function createSubscription(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Không thể thêm gói đăng ký");
  return response.json();
}

export async function updateSubscription(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Không thể cập nhật gói đăng ký");
  return response.json();
}

export async function deleteSubscription(id) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Không thể xóa gói đăng ký");
  return response.json();
}