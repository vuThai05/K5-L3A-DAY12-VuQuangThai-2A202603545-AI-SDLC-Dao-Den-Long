# Checklist người dùng tự test

1. `npm start`, mở http://localhost:5173 ở cửa sổ 1280×720. Kiểm tra đọc được mọi chữ, focus bàn phím, bảng phím và hướng dẫn.
2. Thử nhảy/lướt/pulse/nạp/châm dầu; đèn yếu và tắt, thắp lại; pause/resume nhanh, retry/về menu. Kiểm tra cả ba đêm theo thời gian chuẩn.
3. Trong cài đặt: đổi cả 9 hành động, thử phím trùng, reset, mù màu, giảm chuyển động và chữ lớn; đóng/mở lại game xác nhận lưu.
4. Khi thua/thắng Đêm 3: nhập tên, lưu, xem top10 và export. Đóng server/mở lại xác nhận dữ liệu còn trên disk.
5. Pause → Lưu ảnh đảo (PNG), chép ảnh thật vào docs/demo/screenshot.png, thêm `![Game thực tế](docs/demo/screenshot.png)` ở đầu README. Có thể dùng screenshot OS để chụp cả HUD.
6. Chạy `npm run bench -- --seed 42 --duration 30 --out docs/proof/phase-4/bench.json`, giữ cửa sổ hiện trước trong khoảng 33 s. Kiểm tra FPS/load trên máy thật.
7. Quay video MP4 dưới 5 phút: đoạn chơi thực, test/headless và benchmark. Lưu docs/demo/demo.mp4 hoặc đính kèm Release; đưa link thật ở đầu README.
8. Commit bằng chứng thật, chạy verify/build/package, cập nhật Release nháp với ZIP mới rồi công bố. Không sửa tay JSON benchmark hoặc dùng ảnh/video khác mã nộp.

Theo yêu cầu người dùng, Codex không thực hiện các bước mở game/ghi hình này trong phiên.
