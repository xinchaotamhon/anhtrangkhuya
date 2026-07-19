# Triển khai và cập nhật Ánh Trăng Khuya

Production hiện tại:

- URL: `https://anhtrangkhuya.xinchao-tamhon.workers.dev/`
- Nền tảng: Cloudflare Workers Static Assets
- Worker: `anhtrangkhuya`
- Nguồn được phép phát hành: chỉ thư mục sinh ra `dist/`

## Quy tắc an toàn bắt buộc

Không upload nguyên folder dự án. Folder gốc có tài liệu dự án, test, log và ảnh chẩn đoán; các tệp đó không thuộc website công khai.

Trước mỗi lần phát hành, tạo lại gói công khai:

```powershell
node tools/build_deploy.mjs
node tools/check_deploy_bundle.mjs
```

`dist/` được tạo từ một danh sách cho phép cố định. Không tự chép thêm ảnh nhật ký, `.atk-backup.json`, `.atk-share.json`, tài liệu Markdown hoặc tệp bí mật vào đó.

## Cách khuyên dùng: push Git rồi Cloudflare tự cập nhật

Repository hiện chưa có Git remote, nên `git push` chưa thể gửi code đi đâu. Chỉ cần thiết lập một lần:

1. Tạo một repository **private** trên GitHub hoặc GitLab.
2. Trong folder dự án, nối repository và đẩy branch `master`:

   ```powershell
   git remote add origin https://github.com/<TAI_KHOAN>/<REPOSITORY>.git
   git push -u origin master
   ```

3. Trong Cloudflare mở **Workers & Pages → anhtrangkhuya → Settings → Builds → Connect**.
4. Chọn repository và branch `master`.
5. Đặt build command là `npm run build` và deploy command là `npx wrangler deploy`.

Tham chiếu chính thức: [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) và [Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/).

Từ lần sau, quy trình cập nhật là:

```powershell
git add <các-tệp-đã-kiểm-tra>
git commit -m "Mô tả thay đổi"
git push
```

`git push` chỉ tự cập nhật website sau khi bước kết nối Cloudflare Builds ở trên đã hoàn tất.

## Cách thủ công bằng Wrangler

Khi npm/npx trên máy hoạt động và đã đăng nhập Cloudflare:

```powershell
node tools/build_deploy.mjs
npx wrangler deploy
```

`wrangler.jsonc` đã trỏ đến Worker hiện có và chỉ lấy tài nguyên từ `dist/`. Lần đăng nhập đầu có thể mở trình duyệt để xác nhận tài khoản Cloudflare.

Tham chiếu chính thức: [Workers Static Assets configuration](https://developers.cloudflare.com/workers/static-assets/binding/) và [Wrangler deploy](https://developers.cloudflare.com/workers/wrangler/commands/workers/#deploy).

## Kiểm tra sau khi phát hành

1. Mở production trong cửa sổ riêng tư và kiểm tra các tiêu đề tiếng Việt như “Tối nay”, “Thực hành điều tốt”, “Tiến độ”.
2. Tải lại trang một lần để service worker mới nắm quyền; bản sửa font dùng cache `anh-trang-khuya-v2-vietnamese-font`.
3. Xác nhận các URL runtime như `/styles.css` trả về 200.
4. Xác nhận các đường dẫn nội bộ như `/START_HERE.md`, `/README.md`, `/tests/model.test.js` và `/50-Evidence/EVIDENCE_INDEX.md` trả về 404.
5. Lưu một bản ghi thử, mở lịch sử, sau đó xóa bản ghi thử. Dữ liệu thật trong trình duyệt không bị thay thế khi deploy code mới.

Nếu bản mới có lỗi, mở **Worker → Deployments**, chọn bản tốt gần nhất và dùng **Rollback**.

Tham chiếu chính thức: [Cloudflare rollbacks](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).

## Không triển khai vẫn có thể dùng

- Trên máy có Node.js: chạy `node tools/serve.mjs`, rồi mở `http://127.0.0.1:4173`.
- Để chuyển sang thiết bị khác: xuất và nhập `.atk-backup.json`.
- Để chia sẻ câu hỏi/gợi ý mà không chia sẻ nhật ký: dùng `.atk-share.json`.

Chỉ cân nhắc backend khi xuất/nhập tệp thật sự trở thành trở ngại. Khi đó phải có quyết định riêng về đăng nhập, mã hóa, phân quyền, xóa tài khoản, backup phía server và chi phí sau free tier.
