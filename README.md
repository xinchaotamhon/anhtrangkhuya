# Ánh Trăng Khuya

Một PWA local-first để phản tư mỗi tối. Không tài khoản, không analytics, không backend; dữ liệu nằm trong IndexedDB của trình duyệt cho tới khi người dùng chủ động xuất tệp.

## Chạy trên máy

Yêu cầu Node.js 20 trở lên. Cách không phụ thuộc npm:

```powershell
node tools/serve.mjs
```

Sau đó mở `http://127.0.0.1:4173`. Có thể mở trực tiếp `index.html` để dùng chế độ portable cơ bản, nhưng cài đặt PWA và cache offline cần HTTP/HTTPS.

## Kiểm tra

```powershell
node --test tests/model.test.js
node tools/check_static_app.mjs
```

Gate tích lũy của dự án:

```powershell
python tools/run_gates.py --tier smoke
```

## Đóng gói bản công khai

```powershell
node tools/build_deploy.mjs
```

Lệnh này tạo `dist/` chỉ gồm 10 tệp cần để chạy ứng dụng. Chỉ triển khai `dist/`; không kéo-thả hoặc phát hành nguyên folder dự án vì folder gốc còn có tài liệu nội bộ, test và bằng chứng chẩn đoán.

## Dữ liệu

- `.atk-backup.json`: bản sao lưu đầy đủ, có dữ liệu riêng tư.
- `.atk-share.json`: chỉ có câu hỏi/gợi ý để chia sẻ giữa hai bản app.

Chi tiết hợp đồng file ở [docs/SHARE_FORMAT.md](docs/SHARE_FORMAT.md). Không commit các tệp runtime này vào repository.

## Triển khai

Production hiện dùng Cloudflare Workers Static Assets với Worker `anhtrangkhuya`. Cấu hình được ghim trong `wrangler.jsonc`; thư mục output duy nhất là `dist/`. Có thể nối Worker với một GitHub/GitLab repository riêng tư để mỗi lần push tự build và deploy, hoặc chạy Wrangler thủ công. HTTPS là bắt buộc để service worker và trải nghiệm cài app hoạt động đầy đủ.

Hướng dẫn không kỹ thuật hơn nằm ở [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
