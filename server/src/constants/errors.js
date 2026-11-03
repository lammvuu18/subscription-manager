/**
 * errors.js - Bảng mã lỗi chuẩn của hệ thống SubTracker v1.0
 * Tham chiếu trực tiếp Bảng 2-20 trong SRS SubTracker v1.0
 */

const ERROR_CODES = {
  ERR_01: {
    code: "ERR-01",
    field: "name",
    status: 400,
    message: "Vui lòng nhập tên dịch vụ.",
  },
  ERR_02: {
    code: "ERR-02",
    field: "name",
    status: 400,
    message: "Tên dịch vụ tối đa 100 ký tự.",
  },
  ERR_03: {
    code: "ERR-03",
    field: "amount",
    status: 400,
    message: "Vui lòng nhập số tiền hợp lệ.",
  },
  ERR_04: {
    code: "ERR-04",
    field: "amount",
    status: 400,
    message: "Số tiền phải lớn hơn 0.",
  },
  ERR_05: {
    code: "ERR-05",
    field: "amount",
    status: 400,
    message: "Số tiền không được vượt quá 1.000.000.000.",
  },
  ERR_06: {
    code: "ERR-06",
    field: "amount",
    status: 400,
    message: "VNĐ chỉ nhận số nguyên; USD tối đa 2 chữ số thập phân.",
  },
  ERR_07: {
    code: "ERR-07",
    field: "currency",
    status: 400,
    message: "Loại tiền tệ không được hỗ trợ.",
  },
  ERR_08: {
    code: "ERR-08",
    field: "billingCycle",
    status: 400,
    message: "Vui lòng chọn chu kỳ thanh toán hợp lệ.",
  },
  ERR_09: {
    code: "ERR-09",
    field: "startDate",
    status: 400,
    message: "Ngày bắt đầu không hợp lệ.",
  },
  ERR_10: {
    code: "ERR-10",
    field: "startDate",
    status: 400,
    message: "Ngày bắt đầu phải từ 01/01/2000 đến 5 năm kể từ hôm nay.",
  },
  ERR_11: {
    code: "ERR-11",
    field: "status",
    status: 400,
    message: "Trạng thái không hợp lệ.",
  },
  ERR_12: {
    code: "ERR-12",
    field: "id",
    status: 404,
    message: "Gói đăng ký không tồn tại hoặc đã bị xóa.",
  },
  ERR_13: {
    code: "ERR-13",
    status: 500,
    message: "Không thể kết nối máy chủ. Vui lòng thử lại.",
  },
  ERR_14: {
    code: "ERR-14",
    field: "exchangeRate",
    status: 400,
    message: "Tỷ giá phải là số lớn hơn 0 và không quá 1.000.000.",
  },
  ERR_15: {
    code: "ERR-15",
    status: 401,
    message: "Email hoặc mật khẩu không đúng.",
  },
  ERR_16: {
    code: "ERR-16",
    field: "email",
    status: 400,
    message: "Email này đã được đăng ký.",
  },
  ERR_17: {
    code: "ERR-17",
    field: "email",
    status: 400,
    message: "Vui lòng nhập email hợp lệ.",
  },
  ERR_18: {
    code: "ERR-18",
    field: "password",
    status: 400,
    message: "Mật khẩu gồm 8–64 ký tự, có ít nhất một chữ cái và một chữ số.",
  },
  ERR_19: {
    code: "ERR-19",
    status: 401,
    message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  },
  ERR_20: {
    code: "ERR-20",
    status: 200,
    message: "Chưa có gói đăng ký nào. Hãy thêm gói đầu tiên của bạn.",
  },
  ERR_21: {
    code: "ERR-21",
    status: 200,
    message: "Chưa có dữ liệu chi tiêu để hiển thị biểu đồ.",
  },
  ERR_22: {
    code: "ERR-22",
    field: "confirmPassword",
    status: 400,
    message: "Mật khẩu xác nhận không khớp.",
  },
  ERR_23: {
    code: "ERR-23",
    status: 429,
    message: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 1 phút.",
  },
};

module.exports = ERROR_CODES;
