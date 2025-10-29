# Cinema Booking System - Website Đặt Vé Xem Phim

Hệ thống đặt vé xem phim với Supabase backend, có đăng nhập admin, realtime updates và cấu trúc mã rõ ràng.

## Cấu trúc dự án

```
tothaian/
├── index.html              # Entry point
├── styles.css              # CSS chung
├── app.js                  # Khởi tạo app và routing
├── supabase.config.js      # Config Supabase (URL + Anon Key)
├── supabase.sql            # SQL schema cho Supabase
│
├── lib/                    # Core libraries
│   ├── utils.js            # Utilities, helpers
│   ├── router.js           # Router đơn giản
│   ├── store.js            # Centralized data store
│   └── supabase.js         # Supabase client, Auth, Realtime
│
├── pages/                  # Các trang
│   ├── home.js             # Trang chủ
│   ├── catalog.js          # Danh mục phim
│   ├── showtimes.js        # Lịch chiếu
│   ├── cart.js             # Giỏ vé
│   ├── tickets.js           # Vé của tôi
│   ├── admin.js            # Trang quản trị
│   └── login.js            # Đăng nhập admin
│
└── components/             # Reusable components
    ├── movie-card.js       # Card phim
    ├── seat-map.js         # Sơ đồ ghế
    └── seat-picker-modal.js # Modal chọn ghế
```

## Tính năng

### Người dùng
- ✅ Danh mục phim: đang chiếu/sắp chiếu, lọc theo thể loại, rạp
- ✅ Lịch chiếu: theo phim hoặc theo rạp, chọn ngày
- ✅ Sơ đồ ghế: thường/VIP/đôi/xe lăn, hiển thị trạng thái (trống/đang giữ/đã bán)
- ✅ Giữ chỗ 10 phút với countdown
- ✅ Giỏ vé: áp mã giảm giá, thanh toán
- ✅ Vé điện tử với QR code

### Quản trị (Admin)
- ✅ Đăng nhập với Supabase Auth
- ✅ Quản lý phim, rạp, phòng, suất chiếu, giá ghế, mã giảm giá

### Backend
- ✅ Supabase làm database
- ❌ Realtime đã tắt theo yêu cầu (không cần trả phí). App nạp dữ liệu theo lần tải trang hoặc thao tác.
- ✅ Không còn mockdata, tất cả dữ liệu từ Supabase

## Thiết lập

### 1. Tạo Supabase Project
- Truy cập https://supabase.com
- Tạo project mới
- Lấy Project URL và anon public key từ Settings → API

### 2. Chạy SQL Schema
- Mở SQL Editor trong Supabase
- Copy và chạy nội dung file `supabase.sql`
- Schema sẽ tạo tất cả bảng và RLS policies

### 3. Tạo tài khoản Admin
Trong SQL Editor, chạy:
```sql
-- Tạo user admin (thay email và password)
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('admin@example.com', crypt('yourpassword', gen_salt('bf')), now(), now(), now())
ON CONFLICT DO NOTHING;
```

Hoặc dùng UI: Authentication → Users → Add user

### 4. Cấu hình
Mở `supabase.config.js` và điền:
```javascript
window.SUPABASE_URL = "https://your-project-id.supabase.co";
window.SUPABASE_ANON_KEY = "your-anon-key";
```

### 5. Chạy ứng dụng
Mở `index.html` trong trình duyệt hoặc dùng local server:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve

# Truy cập http://localhost:8000
```

## Lưu ý quan trọng

- **RLS Policies**: File SQL tạo policy "public read/write" cho demo. Trong production, nên:
  - Chỉ cho phép authenticated users mới được insert/update/delete
  - Admin routes nên check session trước khi render
  - Hạn chế quyền truy cập theo role
  
- Realtime đã được tắt, không cần bật Replication trên Supabase.

- **CORS**: Nếu deploy lên domain khác, cần config CORS trong Supabase Settings

## Phát triển thêm

- Thêm authentication cho user thông thường
- Gửi email biên nhận khi thanh toán thành công
- Thống kê doanh thu, ghế bán được
- Export báo cáo
- Tích hợp thanh toán thật (Stripe, VNPay, v.v.)

