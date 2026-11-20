# Đảo Đèn Lồng v1.0.0 — bản phát hành nháp

Game 3D ba đêm: gom đom đóm, giữ đèn có dầu tới bình minh, né Bóng Mực/Gió Lạc.
Contract 1.3 giữ gameplay chuẩn của Ticket-02/03 và thêm benchmark, soak, bảng điểm và accessibility.

## Chạy gói đã build

Giải nén ZIP, cài Node.js 22+, mở terminal trong thư mục dao-den-long-v1.0.0:

```sh
node scripts/serve.js
```

Mở http://localhost:5173. Gói đã gồm Three.js và tài nguyên, không cần npm install để chơi.
Mã nguồn đầy đủ, headless, benchmark/soak và hướng dẫn có trong ZIP.

## Kiểm chứng

Test tự động, HTTP/module, datastore/export và DOM stub được chạy; output gameplay so với Phase 3 giống từng byte.
Soak 10 đêm được đo thật, lưu tại docs/proof/phase-4/soak.json.

## Còn chờ học viên tự kiểm tra trước khi công bố chính thức

- GPU benchmark với cửa sổ thật: `npm run bench -- --seed 42 --duration 30 --out docs/proof/phase-4/bench.json`.
- Ảnh chơi thật/GIF đưa vào README và video demo MP4 dưới 5 phút.
- Chơi thử UI/đổi phím/bảng điểm, kiểm tra trên máy chấm và xác nhận ngưỡng FPS/load.
- Thêm các bằng chứng này vào Git, cập nhật gói ZIP và notes, rồi chuyển draft thành public Release.

Không có số FPS, ảnh hoặc video giả trong bản nháp. vsync_off=false; peak_mem_mb=null vì bản web không đo RSS toàn browser đáng tin cậy.
