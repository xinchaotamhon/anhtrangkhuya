# Bounded prompts for a lower-cost AI

These prompts are optional follow-up work. They deliberately exclude architecture, privacy boundaries, data migrations and scoring logic.

## Vietnamese copy review

```text
Bạn đang review câu chữ tiếng Việt cho PWA Ánh Trăng Khuya tại D:/mydata/my-project/AnhTrangKhuya.

Đọc START_HERE.md theo đúng thứ tự trước. Chỉ review nội dung hiển thị trong src/defaults.js và index.html. Mục tiêu: sửa lỗi chính tả, câu quá dài, từ dễ gây phán xét hoặc mơ hồ; giữ nguyên ý người dùng, ID, positiveAnswer, condition, type, schema và mọi logic.

Không đổi kiến trúc, scoring, định dạng backup/share, IndexedDB, CSP hay service worker. Trước khi sửa, lập danh sách đề xuất theo file/dòng. Sau khi sửa, chạy:
node --test tests/model.test.js
node tools/check_static_app.mjs
Chỉ báo hoàn thành khi cả hai pass và cập nhật evidence/state theo START_HERE.
```

## Expand suggestion vocabulary

```text
Bạn đang mở rộng thư viện gợi ý của PWA Ánh Trăng Khuya tại D:/mydata/my-project/AnhTrangKhuya.

Đọc START_HERE.md theo đúng thứ tự. Chỉ đề xuất tối đa 8 cảm xúc hoặc hình tượng mới trong src/defaults.js. Mỗi mục cần id duy nhất, kind đúng, order, label, định nghĩa tiếng Việt không mang tính chẩn đoán và một câu prompt hướng tới hành động/bối cảnh. Không sửa hoặc xóa mục hiện có, không đổi logic và không dùng nguồn có bản quyền dài dòng.

Cập nhật test đếm nội dung theo cách không khóa cứng sai mục tiêu, rồi chạy:
node --test tests/model.test.js
node tools/check_static_app.mjs
Ghi rõ mục nào thêm, lý do và kết quả gate.
```

## Deployment walkthrough only

```text
Hãy hướng dẫn owner triển khai PWA tĩnh D:/mydata/my-project/AnhTrangKhuya theo docs/DEPLOYMENT.md. Không sửa code, không thêm backend, không tải tệp *.atk-backup.json lên host và không yêu cầu token gửi trong chat. Ưu tiên Cloudflare Pages Direct Upload; dừng để owner tự đăng nhập/thực hiện thao tác tài khoản. Sau deploy, kiểm tra HTTPS, tải app, câu hỏi phụ, lưu một dữ liệu thử, export backup, xóa dữ liệu thử và import lại. Ghi observed/pass/fail, không suy đoán.
```
