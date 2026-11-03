/**
 * subscriptions.js - Client API Service
 * Tích hợp đầy đủ các tuyến đường: Subscriptions, Summary, Settings, Auth
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/subscriptions";
const SERVER_URL = API_BASE_URL.replace(/\/subscriptions\/?$/, "");

function getAuthHeaders() {
  const token = localStorage.getItem("subtracker_token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleApiResponse(response, defaultErrMsg = "Lỗi hệ thống") {
  if (response.status === 401) {
    localStorage.removeItem("subtracker_token");
    localStorage.removeItem("subtracker_user");
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.message || "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    err.status = 401;
    err.code = "ERR-19";
    throw err;
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.message || defaultErrMsg);
    err.status = response.status;
    err.code = errorData.code;
    throw err;
  }
  return response.json();
}

// 1. Quản lý gói đăng ký (Subscriptions)
export async function getSubscriptions(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.sort) query.append("sort", params.sort);

  const url = `${API_BASE_URL}${query.toString() ? `?${query.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(response, "Không thể tải danh sách");
}

export async function createSubscription(data) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleApiResponse(response, "Không thể thêm gói đăng ký");
}

export async function updateSubscription(id, data) {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleApiResponse(response, "Không thể cập nhật gói đăng ký");
}

export async function changeSubscriptionStatus(id, status) {
  const response = await fetch(`${API_BASE_URL}/${id}/status`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleApiResponse(response, "Không thể đổi trạng thái gói đăng ký");
}

export async function deleteSubscription(id) {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleApiResponse(response, "Không thể xóa gói đăng ký");
}

// 2. Thống kê chi phí & biểu đồ (Summary)
export async function getSummary() {
  const response = await fetch(`${SERVER_URL}/summary`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(response, "Không thể tải dữ liệu tổng quan");
}

// 3. Cấu hình tỷ giá (Settings)
export async function getExchangeRate() {
  const response = await fetch(`${SERVER_URL}/settings/exchange-rate`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse(response, "Không thể lấy thông tin tỷ giá");
}

export async function updateExchangeRate(exchangeRate) {
  const response = await fetch(`${SERVER_URL}/settings/exchange-rate`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ exchangeRate }),
  });
  return handleApiResponse(response, "Không thể cập nhật tỷ giá");
}

// 4. Xác thực tài khoản (Auth)
export async function loginUser(email, password) {
  const response = await fetch(`${SERVER_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Đăng nhập thất bại");
  }
  if (data.token) {
    localStorage.setItem("subtracker_token", data.token);
    localStorage.setItem("subtracker_user", JSON.stringify(data.user));
  }
  return data;
}

export async function registerUser(email, password, confirmPassword) {
  const response = await fetch(`${SERVER_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, confirmPassword }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Đăng ký thất bại");
  }
  if (data.token) {
    localStorage.setItem("subtracker_token", data.token);
    localStorage.setItem("subtracker_user", JSON.stringify(data.user));
  }
  return data;
}

export function logoutUser() {
  localStorage.removeItem("subtracker_token");
  localStorage.removeItem("subtracker_user");
}
