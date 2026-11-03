const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../src/app");
const pool = require("../src/config/db");

describe("Kiểm thử tích hợp Backend REST API (Auth, Subscriptions, Settings, Summary)", () => {
  let server;
  let baseUrl;
  let testUserToken;
  let testUserId;
  const testEmail = `test_${Date.now()}@subtracker.test`;
  const testPassword = "Password123";

  before(async () => {
    process.env.DEV_BYPASS_AUTH = "false";
    // Khởi động server trên ephemeral port ngẫu nhiên
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    // Dọn dẹp dữ liệu test và đóng server
    if (testUserId) {
      await pool.query("DELETE FROM users WHERE id = $1", [testUserId]);
    }
    await new Promise((resolve) => server.close(resolve));
  });

  // ==========================================
  // 1. KIỂM THỬ XÁC THỰC (AUTH: REGISTER & LOGIN)
  // ==========================================
  describe("Tuyến đường /api/auth", () => {
    it("Đăng ký thất bại nếu email sai định dạng (ERR-17)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "invalid-email",
          password: "Password123",
          confirmPassword: "Password123",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.code, "ERR-17");
    });

    it("Đăng ký thất bại nếu mật khẩu thiếu số hoặc chữ (ERR-18)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "passwordonly",
          confirmPassword: "passwordonly",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.code, "ERR-18");
    });

    it("Đăng ký thất bại nếu xác nhận mật khẩu không khớp (ERR-22)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@test.com",
          password: "Password123",
          confirmPassword: "DifferentPassword123",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.code, "ERR-22");
    });

    it("Đăng ký tài khoản thành công và trả về JWT token (FR-12, UC-08)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          confirmPassword: testPassword,
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 201);
      assert.ok(data.token);
      assert.equal(data.user.email, testEmail);

      testUserToken = data.token;
      testUserId = data.user.id;
    });

    it("Đăng ký trùng email thất bại (ERR-16)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          confirmPassword: testPassword,
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.code, "ERR-16");
    });

    it("Đăng nhập sai mật khẩu thất bại (ERR-15)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "WrongPassword999",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 401);
      assert.equal(data.code, "ERR-15");
    });

    it("Đăng nhập thành công trả về token mới (FR-13, UC-09)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(data.token);
      assert.equal(data.user.email, testEmail);
    });

    it("Truy cập API khi không có token bị từ chối 401 (ERR-19)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions`);
      const data = await res.json();
      assert.equal(res.status, 401);
      assert.equal(data.code, "ERR-19");
    });
  });

  // ==========================================
  // 2. KIỂM THỬ CẤU HÌNH TỶ GIÁ (SETTINGS)
  // ==========================================
  describe("Tuyến đường /api/settings/exchange-rate (FR-10, UC-07)", () => {
    it("Lấy tỷ giá mặc định ban đầu là 25000", async () => {
      const res = await fetch(`${baseUrl}/api/settings/exchange-rate`, {
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.exchangeRate, 25000);
    });

    it("Cập nhật tỷ giá mới hợp lệ (26.000)", async () => {
      const res = await fetch(`${baseUrl}/api/settings/exchange-rate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({ exchangeRate: 26000 }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.exchangeRate, 26000);
    });

    it("Cập nhật tỷ giá âm hoặc không hợp lệ báo lỗi (ERR-14)", async () => {
      const res = await fetch(`${baseUrl}/api/settings/exchange-rate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({ exchangeRate: -100 }),
      });
      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.code, "ERR-14");
    });
  });

  // ==========================================
  // 3. KIỂM THỬ QUẢN LÝ GÓI ĐĂNG KÝ (SUBSCRIPTIONS)
  // ==========================================
  describe("Tuyến đường /api/subscriptions (CRUD & Status)", () => {
    let createdSubId;

    it("Thêm gói thất bại nếu tên rỗng (ERR-01)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          service_name: "   ",
          amount: 260000,
          currency: "VND",
          billing_cycle: "monthly",
          start_date: "2024-01-31",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.code, "ERR-01");
    });

    it("Thêm gói thất bại nếu số tiền nhỏ hơn hoặc bằng 0 (ERR-04)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          service_name: "Netflix",
          amount: 0,
          currency: "VND",
          billing_cycle: "monthly",
          start_date: "2024-01-31",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 400);
      assert.equal(data.code, "ERR-04");
    });

    it("Thêm gói đăng ký mới thành công kèm giá trị dẫn xuất (FR-01, UC-01)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          service_name: "Netflix",
          amount: 260000,
          currency: "VND",
          billing_cycle: "monthly",
          start_date: "2024-01-31",
          status: "active",
          color: "#FF2D95",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 201);
      assert.equal(data.service_name, "Netflix");
      assert.ok(data.nextBillingDate);
      assert.ok(data.monthlyCostVND);

      createdSubId = data.id;
    });

    it("Lấy danh sách gói đăng ký của user hiện tại (FR-05, UC-05)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions`, {
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(data));
      assert.equal(data.length, 1);
      assert.equal(data[0].id, createdSubId);
    });

    it("Đổi trạng thái sang 'cancelled' thành công (FR-04, UC-04)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/${createdSubId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.subscription.status, "cancelled");
      assert.equal(data.subscription.nextBillingDate, null);
      assert.ok(data.summary);
    });

    it("Đổi trạng thái kích hoạt lại sang 'active' thành công", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/${createdSubId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({ status: "active" }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.subscription.status, "active");
      assert.ok(data.subscription.nextBillingDate);
    });

    it("Sửa thông tin gói thành công (FR-02, UC-02)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/${createdSubId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({
          service_name: "Netflix Premium",
          amount: 300000,
          currency: "VND",
          billing_cycle: "monthly",
          start_date: "2024-01-31",
          status: "active",
        }),
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.service_name, "Netflix Premium");
      assert.equal(data.amount, 300000);
    });

    it("Lấy tổng chi phí và biểu đồ /api/summary (FR-07, FR-09)", async () => {
      const res = await fetch(`${baseUrl}/api/summary`, {
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.activeCount, 1);
      assert.equal(data.totalMonthlyRounded, 300000);
      assert.ok(data.chartData.length > 0);
    });

    it("Xóa gói đăng ký thành công (FR-03, UC-03)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/${createdSubId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 200);
      assert.equal(data.id, createdSubId);
    });

    it("Thao tác trên gói đã xóa báo lỗi 404 (ERR-12)", async () => {
      const res = await fetch(`${baseUrl}/api/subscriptions/${createdSubId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${testUserToken}` },
      });
      const data = await res.json();
      assert.equal(res.status, 404);
      assert.equal(data.code, "ERR-12");
    });
  });
});
