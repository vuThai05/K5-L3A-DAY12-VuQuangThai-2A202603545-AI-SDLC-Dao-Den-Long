# ADR-003: Vòng đời nhiên liệu và kết thúc ở bình minh

Trạng thái: Chấp nhận cho Phase 3.

Ticket-03 thay luật đèn sáng vĩnh viễn và thắng ngay khi thắp đủ đèn của Ticket-02.

- Giữ mô phỏng chung UI/CLI. Đèn lưu fuelUnits nguyên, lit, deposited, ever_lit, relit_count.
- Một đơn vị nguyên = 1/60 fuel: mỗi bước sáng trừ 1, thêm 5 mỗi Bóng đang hút. Refuel thêm 600/con, chặn 6000; chỉ output làm tròn 1 số.
- Hết dầu ở bước 2: tắt, deposited=0, giữ ever_lit, phát lantern_out một lần. Thắp lại cần 5, lần đầu 10.
- Mỗi lần thắp thành công tăng capacity; dựng scenario không tính. capacity=min(20,10+2*successful_lights).
- Vùng an toàn đọc lit && fuelUnits>=1800. Mọi nơi safe/repel/spawn/renderer dùng cùng điều kiện.
- Thắng/thua ở cuối tick: no_flames trước, hết giờ mới so ceil(0.6*n); bỏ all_lit. Bonus floor(fuelUnits/60), không dùng dầu làm tròn hiển thị.
- Drain là trạng thái AI, không phải cờ UI. Hút ở bước 2 từ trạng thái cuối tick trước; nạp/vùng an toàn/pulse vẫn theo thứ tự Ticket-02.

Không giữ điểm và điều kiện thắng cũ trong mã Phase 3. Tag/bằng chứng cũ tái lập phiên bản cũ.
Các test thay thế ghi trong CHANGELOG; test không đổi luật vẫn chạy. Test phải phân biệt dầu thực dưới 30 với số hiển thị 30.0.
