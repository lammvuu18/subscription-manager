-- =====================================================================
-- SubTracker Database Schema & Migration v1.0
-- Hệ quản trị CSDL: PostgreSQL
-- Tuân thủ: SRS SubTracker v1.0 (FR-15, NFR-07, NFR-09, BUS-17)
-- =====================================================================

-- 1. BẢNG NGƯỜI DÙNG (users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);


-- 2. BẢNG CẤU HÌNH NGƯỜI DÙNG (user_settings)
-- Lưu tỷ giá USD -> VNĐ của từng người dùng (mặc định 25.000)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    exchange_rate NUMERIC(12, 2) NOT NULL DEFAULT 25000.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 3. BẢNG GÓI ĐĂNG KÝ (subscriptions)
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly',
    start_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'active',
    color VARCHAR(7) DEFAULT '#FF2D95',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration: Tự động bổ sung các cột nếu bảng đã tồn tại từ phiên bản cũ
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#FF2D95';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Tạo tài khoản mẫu ban@example.com (theo đặc tả SRS SCR-01 / SCR-03) nếu chưa có
-- Mật khẩu mặc định: Matkhau123
INSERT INTO users (email, password_hash)
VALUES ('ban@example.com', '$2b$10$8z81fD3ZktEZAVyM0cBpses7K3wgsnaoc4G/Oh/8mYoYEg4a28uHy')
ON CONFLICT (email) DO NOTHING;

-- Cấu hình tỷ giá cho user mẫu
INSERT INTO user_settings (user_id, exchange_rate)
SELECT id, 25000.00 FROM users WHERE email = 'ban@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Tự động gán các subscription cũ chưa có user_id vào user mẫu
UPDATE subscriptions
SET user_id = (SELECT id FROM users WHERE email = 'ban@example.com')
WHERE user_id IS NULL;

-- Sau khi gán, đặt ràng buộc NOT NULL cho user_id
ALTER TABLE subscriptions ALTER COLUMN user_id SET NOT NULL;

-- 4. INDEX NFR-07: Tối ưu cho truy vấn lấy danh sách gói theo người dùng và trạng thái
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
