# Retro — bốn phase Đảo Đèn Lồng

## Kết quả và giới hạn

Phase 1 xây lõi game dùng chung giữa browser và headless, với 16 test đạt. Phase 2 chuẩn hóa ba bản đồ,
dash, gió, Gió Lạc/Bùa Gió, pause và luồng chuyển đêm; bộ kiểm chứng tăng lên 34 test. Phase 3 thay luật
đèn sáng vĩnh viễn bằng fuel, refuel/relight và thắng ở bình minh; 52 test đạt. Phase 4 giữ nguyên đầu ra
gameplay của Phase 3, thêm benchmark/soak, lưu bảng điểm, remap và khả năng tiếp cận.

Số đo thật nằm trong docs/proof/ theo phase, không sửa output bằng tay. Bộ test kiểm tra input, tick 0,
pause/sim_tick, schema và các nhánh thắng/thua. Các test dùng DOM stub chỉ kiểm tra handler và luồng,
không chứng minh đồ họa, chất lượng âm thanh hay cảm giác điều khiển. Người học yêu cầu tự chơi thử,
vì vậy không chạy preview hoặc giả một lượt đo GPU; ảnh/video và bench.json vẫn là phần cần bổ sung.

## Những gì hiệu quả khi dùng AI

Quyết định tốt nhất là một mô phỏng JavaScript thuần, chạy 60 Hz, tách khỏi Three.js. Khi Ticket-03 đổi
luật cốt lõi, AI sửa trạng thái đèn và kiểm chứng từ scenario thay vì vá riêng UI. Fuel lưu nguyên theo
1/60 tránh sai số ở đúng tick cạn dầu; cùng một điều kiện raw fuel dùng cho vùng an toàn và bonus.
ADR và changelog làm rõ vì sao kỳ vọng test cũ phải đổi. Bằng chứng ở tag cũ được giữ lại để so sánh.

Node test runner, HTTP server và JSON datastore dùng thư viện chuẩn. Game chỉ có một dependency
Three.js, khóa phiên bản và build kèm tài nguyên để chơi offline. Phase 4 dùng instancing cho đom đóm,
thân/viền/mắt Bóng Mực, giữ số thực thể chuẩn mà giảm draw call. Không khẳng định ngưỡng FPS khi
chưa chạy trên GPU. Gói ZIP được giải nén sang thư mục sạch để kiểm tra không cần node_modules.

## Lỗi AI và cách phát hiện

- Test pulse ban đầu để một bóng khác đuổi và gây rơi túi, khiến kỳ vọng sai. Tách tình huống bằng
  vùng an toàn và giữ test sát thương riêng, không sửa gameplay để làm xanh test.
- Bóng Mực từng bị đặt lại Y theo đất khi di chuyển, làm sai scenario pulse 3D. Test chiều cao chỉ ra
  lỗi; cách sửa giữ độ lệch tâm được khai báo trong scenario.
- Resume bấm nhanh từng mất cạnh pause. DOM test cho thấy lỗi và UI giữ lệnh tới khi cạnh cũ nhả.
- Đếm một timer Bùa Gió sai một bước; đối chiếu tổng bước rồi sửa kỳ vọng. Những khác biệt điểm số
  ở Phase 3 là yêu cầu mới, được ghi rõ thay vì skip test cũ.
- Soak đầu Phase 4 không crash nhưng RSS tăng hơn 20%. Giới hạn young/old heap và tắt JIT riêng cho
  soak giảm tăng bộ nhớ thật; số liệu thất bại đầu tiên cũng được giữ làm dấu vết. Không nâng baseline
  giả để đạt tỷ lệ. Tốc độ soak chậm hơn là đánh đổi chấp nhận được; benchmark GPU vẫn chạy JIT.

## Harness và token

AGENTS.md ghi lệnh kiểm chứng, thứ tự tick, nơi giữ bằng chứng và điều cấm tạo bằng chứng giả.
`npm run verify` dừng khi test/build/scenario/soak lỗi, CI chạy cùng lệnh. Ponytail nhắc dùng thư viện
chuẩn, ít dependency; PDF giúp đọc ticket. Không có reviewer độc lập trong các lượt này, vì vậy không
đánh dấu hạng mục đó là đạt. Người học vẫn cần review/playtest bản thật.

Ước tính thủ công: Phase 1 khoảng 20–30 nghìn token, Phase 2 khoảng 25–40 nghìn, Phase 3 khoảng
20–30 nghìn, Phase 4 khoảng 25–40 nghìn; tổng khoảng 90–140 nghìn. Đây không phải usage từ nhà cung
cấp, chi phí API chính xác không có trong phiên. Cách tiết kiệm là đọc đúng ticket, làm lõi trước,
giữ context gọn, tái dùng logic và chạy kiểm chứng tập trung sau thay đổi có ý nghĩa.

## Nếu làm lại

Chuẩn bị schema, các scenario biên và lệnh verify trước renderer. Thiết kế từ đầu đường lưu/export
bảng điểm tương thích CLI, thay vì chỉ localStorage. Đo bộ nhớ bằng RSS đúng mốc tải/reset ngay sớm
để không nhầm heap được runtime giữ với dữ liệu game bị giữ. Dành riêng thời gian cuối cho GPU bench,
ảnh/video và phát hành public; test xanh không tự thay thế bằng chứng sản phẩm chạy trên máy thật.
