# Phase 2 — Ticket-02 « Ba hòn đảo », Contract 1.1

Nguồn: `phase2.pdf` do học viên cung cấp, 8 trang. Thông số mới thay toàn bộ tuning tự chọn Phase 1.

## Kế hoạch / thay đổi yêu cầu

1. Khai báo ba bản đồ chuẩn và collision địa hình dùng chung UI/headless.
2. Chuẩn hóa 60 Hz, thời gian, thứ tự xử lý, lướt/nhảy/rơi, spawn, điểm, AI và vật phẩm.
3. Nâng CLI/snapshot/scenario/input lên 1.1, thêm pause và sim_tick độc lập.
4. UI: chuỗi ba đêm, lời Ông Đăng, pause/settings lưu cục bộ, HUD/palette/âm thanh.
5. Thay kỳ vọng các test Phase 1 bị ticket thay đổi; giữ regression phần tick/input/CLI/tất định.
6. Kiểm chứng gameplay theo scenario, CLI từng đêm, hai lần chạy giống byte, benchmark 21.600 tick ≤30 s.

## Giả định phần ticket chưa xác định

- Góc tọa độ điểm vòng tròn dùng x=r*cos(a), z=r*sin(a). Điểm được chọn bằng PRNG seeded từ danh sách hợp lệ.
- Đêm 3 không nêu điểm xuất phát, chọn (0,0,-30) trên tầng 0 để không nằm trong tháp; Đêm 1/2 tại (0,0,0), nhìn +Z.
- Không tự chuyển đêm trong headless: mỗi lệnh chạy một đêm theo contract. UI cộng điểm chỉ những đêm thắng.
- `score.per_mote=10` từ 1.1 là mỗi con **nạp**, nhặt không có điểm; per_stun=5.
- Bóng Mực chuẩn có tâm cao 0.8 m trên đất; cảnh scenario chỉ định pos được tôn trọng. Kiểm tra hit dùng chênh Y giữa chân Mây và tâm Bóng.
- Wander 2 m/s, spawning 30 tick, chase theo ngưỡng XZ 12/18 m; các giá trị chưa quy định được giữ trong ghi chép.
- Đẩy ra vùng an toàn ngay trong tick thắp đèn (nhỏ hơn giới hạn 30 tick); bỏ sát thương ở vùng sáng.
- Bóng Mực không rơi, không nhảy qua vực/vách; không thêm AI tìm đường ngoài yêu cầu.
- Scenario trạng thái timer dùng đơn vị tick; motes mặc định kind=random, ttl_s=null; dropped TTL 8 s.
- Pause có hiệu lực ở cạnh nhấn: tick tiếp tục, sim_tick chỉ tăng khi đang playing; resume cho chạy gameplay ngay bước đó.
- Hiệu lực N tick gồm tick kích hoạt; timer giảm ở đầu bước sau. Trong 12 tick dash, giữ Y và vận tốc Y để tiếp tục sau dash.
- Thực thể sinh cuối bước chỉ được nhặt/chạm từ bước sau. Đom đóm rơi do hit/pulse Gió Lạc cũng nhặt từ tick sau.
- Ngoài số liệu chuẩn, các thông số/giả định chưa được công bố ở phase tiếp theo không được suy đoán.

## Truy vết kiểm chứng

Tests sẽ kiểm tra bản đồ/tầng/dốc/bục nhảy, thời điểm spawn, lướt/bùa, pause, rơi/hồi sinh,
điểm/nạp/tie-break, pulse 3D/đẩy theo thời gian, AI/recoil/Gió Lạc và tính tất định/CLI.
Bằng chứng mới ở `docs/proof/phase-2/`; giữ nguyên bằng chứng lịch sử `phase-1/`.

## Regression và nhật ký AI

- Thay các kỳ vọng Phase 1 theo ticket: túi 20→10, bán kính nhặt 1.5→1 và chênh Y, tương tác 3→2,
  safe 5→6, shade 2.4→4/4.5, pulse XZ tức thời→3D/đẩy 15 tick, gravity -18→-20,
  điểm khi nhặt→khi nạp, đảo 30→40 m và có rơi. Giữ test camera, cạnh nhấn, tick 0, schema, CLI, tất định và HTTP.
- Lỗi phát hiện: di chuyển Bóng Mực tự đặt tâm lại về đất, làm hỏng scenario pulse cao. Đã giữ độ lệch Y của scenario khi theo địa hình.
- Test bùa có kỳ vọng lệch một tick do đếm thiếu bước kích hoạt; đã đối chiếu số bước và sửa kỳ vọng, giữ nguyên timer gameplay.
- DOM test phát hiện bấm Resume ngay sau pause có thể mất cạnh nhấn. UI giữ lệnh chờ tới khi cạnh cũ đã nhả, không bỏ click.
- Rà soát thêm: snapshot vel.y phải bằng 0 khi dash giữ độ cao; tách vận tốc Y cất giữ để tiếp tục sau dash; dash theo hướng phóng của bục khi đang bay.
- Dùng Codex + Ponytail cho code, PDF để đọc/render kiểm tra ticket. Bộ PDF chỉ nằm trong `tmp/` bị ignore, không phải dependency game.
- Ước tính thủ công 25–40 nghìn token cho lượt Phase 2 (đọc spec, code và kiểm chứng); không có usage/chi phí API chính xác.
- Tiết kiệm: không thêm dependency game; tái dùng mô phỏng chung; kiểm chứng bằng Node chuẩn và DOM stub, không giả lập bằng chứng ảnh.

## Kết quả / bàn giao

- `npm run verify` đạt **34/34** test. Build web thành công; output cả ba đêm giống từng byte ở hai lần chạy.
- Benchmark chạy CLI Đêm 3 đủ 21.600 tick, sinh ngẫu nhiên chuẩn, Mây trú tại L1 để tránh thua sớm, tắt gió.
  Thời gian đo thật, cấu hình Node/platform và SHA256 ở `docs/proof/phase-2/report.json`; đây không phải đo FPS hay trường hợp xấu nhất.
- Luồng menu → lời Ông Đăng → chơi → thắng → đêm tiếp → Bình Minh/tổng điểm, retry, pause và lưu volume đã được kiểm tra bằng handler UI với DOM stub.
  Cách này không thay cho browser/WebGL hay thao tác người chơi thật.
- Đã thử Edge nhưng browser access host không khả dụng; sau đó học viên yêu cầu **không cần preview, tự test**. Không tiếp tục preview.
- Chưa có ảnh/video Phase 2, chưa đo FPS, chưa có kết quả CI Linux và chưa có reviewer độc lập. Các giới hạn này không được ghi thành đạt.
- Harness cập nhật Contract 1.1 và quy tắc tick/pause; CI chạy verify và lưu bằng chứng Phase 2, không sửa output lịch sử Phase 1.
