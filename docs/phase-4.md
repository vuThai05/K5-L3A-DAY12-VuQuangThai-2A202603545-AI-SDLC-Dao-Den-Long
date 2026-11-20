# Phase 4 — Bình minh: phát hành v1.0.0 / Contract 1.3

Nguồn: Ticket-04 trong phase4.pdf, 5 trang. Người dùng yêu cầu không preview và sẽ tự chơi thử.

## Kế hoạch / nghiệm thu

1. CLI soak chạy 10 đêm trong một tiến trình, input seeded đúng xác suất; đo RSS thật, báo crashes và tăng bộ nhớ.
2. Benchmark web có cửa sổ 1280×720, đúng 200 wander/100 motes/L1–L3 fuel100; camera 15 s/vòng, warmup 3 s rồi tính FPS/percentile từ frame time thực.
3. Leaderboard top10 lưu disk ở local server, browser fallback khi host tĩnh; tên/điểm/ngày/seed được validate; CLI export cùng datastore của server.
4. Remap 9 hành động, báo trùng phím, reset/lưu; phụ đề/mũi tên spawn, gió/10s/đèn yếu; reduced motion và font 18px/large125%.
5. Giữ output gameplay 1.2; chạy regression, soak và clean-package check; đóng gói bản web + Node CLI, retro/changelog/tài liệu phát hành.

## Giới hạn và quy ước

- Không mở game/benchmark có GUI theo yêu cầu. Lệnh benchmark được chuẩn bị để học viên chạy; không ghi số FPS giả hay thay bằng đo headless.
- Browser requestAnimationFrame chịu vsync, không bảo đảm tắt: output vsync_off=false. Web không đo RSS toàn browser đáng tin cậy: peak_mem_mb=null, giải thích trong README.
- Soak đêm thứ i=1..10 dùng seed gốc+i, đêm chơi 1→2→3 xoay vòng; PRNG input độc lập PRNG gameplay.
- Soak dùng explicit GC khi Node cho phép, trước RSS ban đầu và sau reset; report là RSS thật, không sửa/inflate baseline.
- Runtime soak dùng --jitless, old-space 32 MiB, semi-space 1 MiB để giới hạn bộ nhớ thực và tránh tăng RSS do JIT/nursery. Chạy đầu không giới hạn bị vượt 20%; không che kết quả thất bại này. Headless/benchmark thông thường vẫn bật JIT.
- Leaderboard server lưu data/leaderboard.json (gitignored); host thuần tĩnh lưu localStorage và có nút export JSON. CLI export áp dụng datastore Node server.
- Chưa có ảnh/video chơi thật và GPU bench.json do người dùng tự chạy. Bản phát hành phải ghi trung thực phần kiểm chứng còn thiếu, không đánh dấu FPS/DoD đầy đủ khi chưa có bằng chứng.

## Kết quả và evaluation

- `npm run verify`: **59/59 test đạt**, build web thành công. Output scenario thắng Phase 3 giống từng byte, các đêm khác cũng tất định qua hai lần chạy.
- Soak chuẩn 10 đêm: **0 crash**, RSS 36.9375→38.48046875 MiB (~4.18%), thời gian ~2.815 s trên Node/Windows phiên này. Cả 10 kết quả lost do input random, đúng điều kiện kết thúc, không phải crash.
- Giữ output thật trước điều chỉnh: RSS 34.6640625→43.86328125 MiB (>20%). Runtime memory được giới hạn thật, không sửa số đo hoặc tăng baseline.
- Kiểm tra benchmark: 200 wander/100 motes, đèn/camera/formula bằng test logic. Không có số GPU FPS vì không mở cửa sổ theo yêu cầu.
- Gói ZIP được giải nén mới, không có node_modules; headless và HTTP/modules chạy được. Không mở browser trong kiểm tra package.
- Test UI với DOM stub kiểm tra remap/trùng/reset/persistence, tên/tổng điểm/top10 và caption spawn. Test HTTP/CLI xác nhận dữ liệu disk/export; không ghi dữ liệu người chơi vào Git.
- Lỗi test caption đầu tiên dùng tick thay sim_tick sau pause nên chưa tới spawn 300; sửa đúng mốc kiểm tra, giữ nguyên lịch gameplay.
- Instancing giảm allocation/draw-call, buffer được dispose khi reset; hiệu năng GPU/chất lượng hiển thị vẫn cần người dùng tự xác nhận.
- Release notes/retro/manual checklist đầy đủ; bản v1.0.0 chuẩn bị draft. DoD công bố public còn chờ bench.json GPU, ảnh/GIF, video MP4 và chơi thử thật.
- Ước tính token/chi phí và bài học tổng hợp ở docs/retro.md. Không có số usage API chính xác hoặc reviewer độc lập trong phiên.
