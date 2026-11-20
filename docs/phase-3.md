# Phase 3 — Đèn cạn dầu / Contract 1.2

Nguồn: Ticket-03 trong phase3.pdf, 5 trang, do học viên cung cấp. Học viên tự test, không chạy preview.

## Kế hoạch và tiêu chí nghiệm thu

1. Dầu nguyên theo 1/60 đơn vị: hao + hút ở bước 2, tắt trước di chuyển/tương tác.
2. Châm dầu khi sáng, thắp lại với 5 đom đóm; giữ ever_lit và relit_count.
3. Wander tìm đèn yếu, drain đứng yên; thoát theo đèn/Mây/pulse; chỉ fuel ≥30 mới an toàn.
4. Chỉ thắng ở bình minh khi đủ ceil(0.6*n) đèn và còn sống. Điểm mới, sức chứa tăng theo lần thắp.
5. Thanh dầu, nhấp nháy 1 Hz, hình xẹp/vết rách; lưu cài đặt mù màu.
6. Cập nhật test cũ bị thay luật, thêm test biên và CLI/tất định; giữ regression không đổi.

## Quy ước và giả định

- Scenario fuel được lượng tử hóa round(fuel*60); nội bộ không làm tròn khi hao/hút/châm. Output 1 chữ số thập phân.
- fuel_drain ghi mỗi 60 bước hút thực tế của mỗi Bóng; pause giữ bộ đếm, rời drain đặt lại.
- Hút bước 2 dùng trạng thái/target/vị trí cuối bước trước. Bắt đầu drain bước 8 hút từ bước sau; pulse bước 7 dừng hút ở bước sau.
- Đẩy khỏi vùng an toàn ngay bước 6, trong giới hạn 30 tick. Đúng 30 còn vùng sáng; hao xuống dưới 30 mất vùng sáng ngay.
- Scenario lit=true mặc định fuel=100, ever_lit=true; đèn dựng sẵn không tăng điểm/lần thắp/capacity. successful_lights được đặt riêng để dựng test.
- Đêm 240/270/300 s, headless chỉ chạy một đêm. Các luật khác giữ Phase 2.
- Giữ nguyên bằng chứng Phase 1/2; bằng chứng mới ở docs/proof/phase-3/.

## Truy vết kiểm chứng

Test dầu chính xác 100 giây, ceil/cap refuel, relight/điểm/capacity, biên 30,
nhiều Bóng hút cộng dồn, lantern_out trước tương tác, các nhánh drain và pulse bonus,
tick bình minh, pause, schema/CLI và lưu cài đặt. DOM stub không thay kiểm tra hình ảnh.

## Kết quả và nhật ký AI

- `npm run verify` đạt **52/52** test, build thành công. Mô phỏng và CLI kiểm tra cùng mã; output cả ba đêm, fuel-cycle và drain giống từng byte qua hai lần chạy.
- Scenario thắng dùng vị trí đèn Đêm 1 chuẩn, 10 đom đóm mỗi đèn, tắt sinh ngẫu nhiên và rút đêm còn 40 s để kiểm tra đường đi/nạp rồi chờ bình minh. Không dùng nó làm bằng chứng cân bằng toàn đêm.
- Benchmark chạy đủ 18.000 tick (300 s Đêm 3 mới), Mây ở tầng 2, L1 có sẵn dầu và được phép cạn, sinh ngẫu nhiên bật, tắt gió. Thời gian thực tế/máy/Node ghi ở docs/proof/phase-3/report.json; không phải đo FPS hoặc trường hợp xấu nhất.
- DOM stub kiểm tra chuyển đêm, không thắng sớm, retry, pause và lưu/đọc lại cài đặt mù màu. Không chứng minh hình ảnh, độ dễ đọc, chất lượng nhạc hay thao tác chơi thật.
- Không chạy preview/browser theo yêu cầu học viên; học viên tự kiểm tra. Chưa có ảnh/video hoặc kết quả CI Linux của Phase 3 trong phiên này; không tuyên bố hidden tests đạt.
- Các test đỏ ban đầu là kỳ vọng điểm cũ bị Ticket-03 thay (25 thay 50; bonus bình minh thay thời gian). Đã cập nhật kỳ vọng kèm lý do trong CHANGELOG, không skip test.
- Rà soát thêm điều kiện không gây sát thương trong tick bị đẩy khỏi vùng an toàn; thêm regression cho Mây đứng ngay ngoài mép sáng. Giữ dầu thực để xét ngưỡng dù hiển thị làm tròn 30.0.
- AI dùng: Codex/Ponytail, đọc PDF từ công cụ đã cài trong tmp. Không thêm dependency cho game.
- Ước tính thủ công 20–30 nghìn token cho đọc ticket, triển khai và kiểm chứng; không có số usage/chi phí API chính xác. Tiết kiệm bằng logic chung và sửa đúng các test bị thay luật, giữ bằng chứng lịch sử.
- Bài học: đổi luật cốt lõi phải có ADR, changelog và test biên thứ tự tick; không chỉ sửa HUD hoặc đổi số trong contract.
