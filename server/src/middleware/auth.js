/**
 * auth.js - Middleware xác thực người dùng qua JWT
 * Tuân thủ NFR-09: Token JWT hết hạn sau 60 phút; mọi API yêu cầu token hợp lệ.
 */

const jwt = require("jsonwebtoken");
const ERROR_CODES = require("../constants/errors");

const JWT_SECRET = process.env.JWT_SECRET || "subtracker_super_secret_jwt_key_2026";
const JWT_EXPIRES_IN = "60m";

/**
 * Tạo token JWT với thời hạn 60 phút
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Middleware bắt buộc có token hợp lệ
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    // Nếu trong quá trình phát triển/kiểm thử chưa đăng nhập, hỗ trợ fallback user nếu có cờ DEV_BYPASS_AUTH
    if (process.env.DEV_BYPASS_AUTH === "true") {
      req.user = { id: 1, email: "dev@subtracker.local" };
      return next();
    }
    return res.status(401).json(ERROR_CODES.ERR_19);
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json(ERROR_CODES.ERR_19);
    }
    req.user = {
      id: decoded.userId,
      email: decoded.email,
    };
    next();
  });
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  generateToken,
  authenticateToken,
};
