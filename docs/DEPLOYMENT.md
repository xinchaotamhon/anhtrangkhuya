# Triển khai và chia sẻ Ánh Trăng Khuya

## Lựa chọn mặc định: Cloudflare Pages Direct Upload

Phù hợp khi muốn có một đường link HTTPS mà không cần repository công khai.

1. Đăng nhập Cloudflare, mở **Workers & Pages**.
2. Chọn **Create application** → **Get started** → **Drag and drop your files**.
3. Kéo cả folder dự án hoặc một file ZIP của folder vào vùng upload.
4. Đặt tên dự án và chọn **Deploy site**.
5. Mở đường link `*.pages.dev`, kiểm tra một câu hỏi phụ, lưu thử một ngày rồi xóa dữ liệu thử.
6. Trên điện thoại, dùng menu trình duyệt → **Thêm vào màn hình chính**.

Không đặt các tệp `.atk-backup.json` hoặc `.atk-share.json` vào folder upload. Website được công khai, nhưng nhật ký vẫn chỉ nằm trong trình duyệt của từng người vì bản này không có backend.

## Lựa chọn dùng Git: GitHub Pages

Phù hợp khi muốn cập nhật website theo mỗi lần push và chấp nhận source repository công khai ở gói GitHub Free.

1. Tạo repository và push code dự án; không push tệp sao lưu runtime.
2. Mở **Settings** → **Pages**.
3. Chọn publish từ branch chứa `index.html` ở root.
4. Đợi GitHub cấp đường link HTTPS và mở để kiểm tra.

## Không triển khai

- Trên máy có Node.js: chạy `node tools/serve.mjs`, rồi mở `http://127.0.0.1:4173`.
- Để chuyển sang thiết bị khác: mở một bản app khác và nhập `.atk-backup.json`.
- Để chia sẻ câu hỏi/gợi ý mà không chia sẻ nhật ký: dùng `.atk-share.json`.

## Khi nào mới cần backend

Chỉ thêm dịch vụ đồng bộ khi việc xuất/nhập tệp thật sự trở thành trở ngại. Khi đó cần một ADR mới về đăng nhập, mã hóa, phân quyền, xóa tài khoản, backup phía server và chi phí sau free tier. Không gắn database trực tiếp vào bản tĩnh mà chưa có các ranh giới này.
