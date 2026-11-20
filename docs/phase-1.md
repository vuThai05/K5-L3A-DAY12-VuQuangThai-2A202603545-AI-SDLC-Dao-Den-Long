# Phase 1: yêu cầu, quyết định và nghiệm thu

Nguồn: PRD-0 / Test Contract v1.0 trong `saved_resource.html` do học viên cung cấp.
Chỉ triển khai Phase 1. Những phase sau chưa được phát hành.

## Kế hoạch trước khi code

1. Logic thuần JavaScript chạy 60 Hz, tuning lấy từ contract; kiểm tra scenario và inputs.
2. CLI JSONL, kiểm thử theo các tình huống nhỏ và so sánh hai lần chạy.
3. Three.js chỉ hiển thị và chuyển input vào logic chung; chơi đủ vòng, HUD và chơi lại.
4. Chạy verify, build, lưu output thật; ghi rõ phần UI chưa kiểm chứng nếu thiếu browser.

## Giả định chỗ PRD chưa chốt

- Đảo tròn bán kính 30 m, biên chặn nhân vật, không phạt rơi (`fall_enabled=false`).
- 5 đèn L1…L5 ở vòng bán kính 19 m. Mỗi đèn cần 10 đom đóm, nạp từng phần bằng E.
- Mây tốc độ 6 m/s, mang tối đa 20; nhặt tự động trong 1.5 m (XZ), kể cả đang nhảy.
- Space nhảy, E nạp, Q tỏa sáng; hành động chỉ ở cạnh nhấn, giữ nút không lặp.
- Nhảy chỉ phục vụ di chuyển/hiển thị, không miễn sát thương đo trên XZ.
- Q tốn 3 đom đóm, bán kính 7 m; choáng 3 s, đẩy 3 m, hồi 1 s. Không đủ thì không kích hoạt.
- Bóng Mực tốc độ 2.4 m/s; chạm trong 1 m mất 1/3 máu; bất tử 2 s, rơi floor(carried*0.25) đom đóm.
- Đom đóm rơi có thể nhặt lại khi hết bất tử; không mất thêm điểm khi rơi.
- Đèn sáng tạo vùng an toàn 5 m: Bóng Mực không vào được, Mây không bị chạm trong vùng này.
- 100 đom đóm ban đầu, bổ sung 3 con mỗi 2 s; 3 Bóng Mực ban đầu, thêm mỗi 12 s đến tối đa 12.
- 300 s mỗi đêm; hết giờ là thua (dawn). Thứ tự: di chuyển → nhặt → nạp → pulse → Bóng Mực → kết thúc.
- Khi thắng cộng floor(giây còn lại)*2 + máu còn lại*50. Mỗi lần nhặt +10, đèn +100, mỗi con choáng +20.
- Cùng bước thắp đèn cuối và hết giờ: thắng; hết máu ưu tiên thua. Scenario không phát sự kiện/điểm.
- Scenario.time_left_s điều chỉnh đồng hồ đầu lượt; thời gian giảm đúng mỗi bước 1/60 s.
- Đèn deposited đủ cost khi dựng scenario được xem là sáng. `lit:true` tối thiểu đủ cost.
- Nút không có hiệu lực trong tick 0 snapshot; trạng thái kết thúc được đánh giá sau bước đầu tiên.

## Tiêu chí nghiệm thu

| Yêu cầu | Kiểm chứng |
|---|---|
| Di chuyển theo camera, tốc độ không tăng khi đi chéo, nhảy | Node tests, chơi thử UI |
| Nhặt có giới hạn, nạp một phần, đủ 5 đèn thắng | Node tests + win.jsonl |
| Đuổi/chạm, bất tử, rơi đom đóm, vùng an toàn, pulse | Node tests + pulse.jsonl / loss.jsonl |
| Hết giờ thua; điểm và chơi lại | Node tests; UI reset dùng Game mới |
| Tick 0, giữ input, cạnh nhấn, JSONL, exit 2 | CLI integration tests |
| Cùng seed/scenario/input giống từng byte | verify so sánh output CLI hai lần |
| Cài/chạy ≤3 lệnh, có build web dùng offline sau cài | npm ci; npm run build; npm start |

## Nhật ký AI / retro

- Codex đọc README, GUIDE, RULES, RUBRIC và HTML, lập giả định rồi triển khai lõi chung + UI.
- Harness: AGENTS.md, verify script trả lỗi khi test/build lỗi, GitHub Actions trên push/PR.
- Kỹ năng dùng: Ponytail (giữ ít dependency); Sites tham khảo cách preview game web cục bộ.
- Ước tính cho lượt triển khai Phase 1: khoảng 20–30 nghìn token gồm đọc tài liệu, sinh mã và kiểm chứng; đây là ước lượng thủ công, không phải usage từ nhà cung cấp. Không có số đo chi phí API thực tế của phiên.
- Tiết kiệm: dùng Node test runner, HTTP server từ thư viện chuẩn; chỉ một dependency Three.js; một lõi gameplay dùng chung cho UI và CLI.
- Lỗi trong quá trình kiểm chứng: test pulse ban đầu để một Bóng Mực ngoài bán kính tiếp tục đuổi và làm rơi túi, khiến kỳ vọng số đom đóm sai. Tách tình huống pulse bằng vùng đèn an toàn; giữ test sát thương riêng, không đổi gameplay để làm xanh test.
- Khi rà soát phát hiện chỉ tọa độ được làm tròn theo contract, đã giữ nguyên độ chính xác đồng hồ trong snapshot.
- Không tuyên bố đạt hidden tests hoặc kiểm chứng Linux khi chưa chạy trên máy tương ứng.

## Kết quả và phần cần kiểm tra trực tiếp

- `npm run verify`: 16 tests về logic, CLI, HTTP/module; build web và các scenario thắng/thua/pulse/dawn.
- Scenario thắng dùng vị trí 5 đèn mặc định, 10 đom đóm mỗi đèn, tắt sinh ngẫu nhiên để kiểm chứng đúng đường đi/nạp/thắng. Đây là test contract, không phải bằng chứng chơi cân bằng ở màn ngẫu nhiên.
- Output của scenario thắng và màn có sinh ngẫu nhiên được so sánh từng byte qua hai lần chạy; report và JSONL sinh thật trong `docs/proof/phase-1/`.
- Đã thử preview Edge nhưng browser access host không khả dụng. Chưa có ảnh/video chơi thật, chưa xác nhận WebGL, âm thanh, cảm giác điều khiển hoặc FPS. Cần người chơi mở localhost để kiểm tra trực tiếp.
- CI Ubuntu được cấu hình nhưng chưa có kết quả remote trong phiên này. Không có reviewer độc lập trong lượt này.
- Nếu làm lại: khóa quy ước thời gian/điểm/thứ tự xử lý bằng scenario nhỏ trước khi dựng cảnh. Giữ renderer độc lập giúp thay đồ họa mà không tác động contract.
