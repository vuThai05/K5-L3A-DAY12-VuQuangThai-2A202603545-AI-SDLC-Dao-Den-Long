# Đảo Đèn Lồng — v1.0.0 (Phase 4)

Game 3D góc nhìn thứ ba: cùng Mây qua **Đảo Bến → Đảo Cau → Đảo Chuông**, gom đom đóm và giữ đèn sáng tới bình minh.
Contract **1.3** giữ nguyên gameplay “Đèn cạn dầu” của Phase 3, thêm benchmark/soak, top 10 và accessibility.
Học viên: **Vũ Quang Thái · 2A202603545**.

**Ảnh/GIF và video demo:** chờ học viên tự chơi thử, bổ sung theo [checklist](docs/manual-test.md).
Không chạy preview hoặc tạo ảnh/video giả. Release được chuẩn bị ở trạng thái **draft** cho tới khi có bằng chứng trực tiếp.

## Cài và chơi

Cần **Node.js 22+**, npm và trình duyệt desktop **WebGL2** (Chrome/Edge/Firefox), bật tăng tốc phần cứng.
Độ phân giải tham chiếu 1280×720, bàn phím/chuột. Từ thư mục clone sạch, tối đa 3 lệnh:

```sh
npm ci
npm run build
npm start
```

Mở **http://localhost:5173**, nhấn Bắt đầu hành trình. Tài nguyên được đóng gói cục bộ, không cần CDN.
Tắt server bằng Ctrl+C. Gói ZIP đã build: giải nén, vào thư mục `dao-den-long-v1.0.0`,
chạy **`node scripts/serve.js`**; không cần npm install để chơi gói này. `dist/` cũng host tĩnh được.

| Phím mặc định | Hành động |
|---|---|
| WASD / ↑ ↓ | Di chuyển theo camera |
| ← → / giữ chuột và kéo | Xoay camera |
| Space | Nhảy |
| Shift | Lướt 14 m/s trong 0.2 s, hồi 1.5 s |
| E | Thắp mới/thắp lại/châm dầu cho đèn nhận được gần nhất trong 2 m |
| Q | Tỏa sáng: tốn 3 con, bán kính 3D 5 m, hồi 3 s |
| P / Esc | Pause: tiếp tục/chơi lại/cài đặt/lưu ảnh/về menu |
| ? / ⚙ | Hướng dẫn / cài đặt âm thanh, chuột, mù màu, giảm chuyển động, chữ lớn và đổi phím |

Mọi hành động trong bảng phím chính đổi được; phát hiện trùng phím, có khôi phục mặc định và lưu cài đặt.
Chữ UI tối thiểu 18 px, tùy chọn lớn ×1.25. Có phụ đề/chỉ báo cho spawn Bóng Mực (mũi tên), gió, 10 giây cuối và đèn yếu.

Nhặt tự động trong 1 m, chênh cao ≤1.5 m. Túi bắt đầu 10, mỗi lần thắp thành công +2, tối đa 20.
Thắp mới cần 10 con, thắp lại cần 5; nạp từng phần được. Đèn có 100 dầu, hao 1/giây, châm 10 dầu/con.
Dưới 30 dầu mất vùng an toàn 6 m, đèn/thanh dầu nhấp nháy 1 Hz. Bóng Mực hút thêm 5 dầu/giây/con.
Đèn tắt xẹp 20% và có vết rách; mù màu đổi viền/mắt Bóng sang xanh lam, cảnh báo trắng kèm ⚠.

Ba đêm có 5/6/7 đèn, dài **240/270/300 s**. Không thắng sớm: còn sống và giữ ít nhất **3/5, 4/6, 5/7 đèn sáng ở tick bình minh**.
Hết 3 lửa thua ngay; được retry đêm đó. Cầu/bục phóng, ba tầng/dốc/tháp/gió giữ bản đồ chuẩn.
Gió Lạc cướp đồ, pulse lần nữa khi nó mang đồ để lấy lại; Bùa Gió cho chạy nhanh và lướt không hồi 10 s.

Điểm: nạp/châm +5/con; thắp mới +100, lại +40; pulse +5/Bóng, tổng +15 nếu nó đang drain.
Thắng cộng 50+floor(dầu) mỗi đèn sáng và 50/lửa. Tổng game chỉ gồm các đêm đã thắng.

## Bảng điểm và export

Thua hoặc thắng Đêm 3 cho nhập tên 3–12 ký tự `[A-Za-z0-9_]`; lưu tổng điểm đã thắng, số đêm thắng, ISO timestamp và seed.
Top 10 xếp điểm giảm dần, hòa điểm thì thời điểm sớm hơn. Menu có Bảng xếp hạng.
Node server lưu `data/leaderboard.json` (gitignored); đặt `LANTERN_DATA_DIR` để đổi thư mục.
Host thuần tĩnh dùng localStorage và nút Xuất JSON. CLI export đọc datastore Node server:

```sh
node scripts/serve.js --export-leaderboard out.json
```

## Kiểm thử / headless

```sh
npm run verify
node src/headless.js --seed 12 --night 1 --ticks 900 --out run.jsonl --snapshot-every 60
node src/headless.js --seed 12 --night 3 --ticks 18000 --scenario docs/proof/phase-4/benchmark-scenario.json --out night3.jsonl
```

Headless không cần GPU/Three.js. `--night` nhận 1/2/3, hỗ trợ scenario/inputs/ticks/snapshot-every;
60 Hz, JSONL snapshot/event/end; pause tăng tick nhưng giữ sim_tick/timer.
`verify` chạy test, build, scenario dầu/bình minh, so output ba đêm, so gameplay với Phase 3 và soak thật.
CI Ubuntu chạy cùng lệnh. [Báo cáo](docs/proof/phase-4/report.json), [test output](docs/proof/phase-4/tests.tap), [soak](docs/proof/phase-4/soak.json).

## GPU benchmark và soak

```sh
npm run bench -- --seed 42 --duration 30 --out docs/proof/phase-4/bench.json
npm run soak -- --seed 7 --nights 10 --out docs/proof/phase-4/soak.json
```

Benchmark **mở cửa sổ Chrome/Edge 1280×720**, render pixel ratio 1. Giữ cửa sổ hiện trước, không tương tác.
Không tìm thấy browser thì thêm `--browser <đường-dẫn-executable>`. Warmup 3 s, rồi đo 30 s; tự ghi file và thoát.
Cảnh chuẩn có 200 wander, 100 motes, L1–L3 fuel100; tắt spawn/hit/pickup/decay/end, camera bán kính30/Y15, vòng15s.
P95 dùng nearest rank, p1-low đúng trung bình 1% frame chậm nhất; lấy dt thực, không suy từ headless.
Browser không bảo đảm tắt vsync: `vsync_off=false`. Web không đo RSS toàn browser đáng tin cậy: `peak_mem_mb=null`.
Ngưỡng máy chấm: avg_fps≥60, p1_low_fps≥30, load_ms≤10000. **Chưa đo GPU theo yêu cầu không mở preview.**

Soak cùng một tiến trình, đêm 1→2→3, i=1..10 dùng seed gốc+i, input seeded đúng xác suất Ticket-04.
Đo RSS sau tải đêm đầu và reset đêm cuối. CLI dùng JITless/GC, old heap32 MiB/young semi-space1 MiB để giới hạn bộ nhớ thực.
Lượt đầu vượt 20% được giữ tại [soak trước điều chỉnh](docs/proof/phase-4/soak-before-tuning.json).
Ngưỡng: 0 crash, RSS cuối≤1.2×đầu. Các kết quả mất đêm trong soak là hợp lệ, không phải crash.

## Đóng gói và phát hành

```sh
npm run package
npm run check-package
```

Packager cần Python 3 (chỉ lúc tạo ZIP). Sinh `release/dao-den-long-v1.0.0.zip` và manifest SHA256;
check-package giải nén thư mục sạch, chạy headless/HTTP mà không cài node_modules và không mở browser.
Sau khi review manifest/notes, `node scripts/publish-release.js` đẩy các tag và tạo GitHub **draft** v1.0.0 bằng credential Git sẵn có.
Script không mở đăng nhập, không ghi token vào file, không xóa asset cũ. Thiếu credential thì báo lỗi để người dùng đăng nhập bằng Git Credential Manager.

**Còn cần trước khi phát hành public đầy đủ:** tự chạy GPU benchmark, thêm ảnh/GIF và video MP4 dưới 5 phút,
commit bằng chứng, build lại ZIP và kiểm tra trực tiếp. Xem [checklist](docs/manual-test.md), [release notes](docs/release-notes.md), [retro](docs/retro.md).
Test/DOM stub không chứng minh hình ảnh/âm thanh/FPS; không khẳng định hidden tests đạt.

## Tài liệu và sáng tạo

[Contract](game.contract.json) · [Phase 4](docs/phase-4.md) · [Changelog](CHANGELOG.md) · [ADR nhiên liệu](docs/adr-003-fuel-and-dawn.md)
· [Credits](CREDITS.md) · [License](LICENSE). Bằng chứng Phase 1/2/3 được giữ nguyên trong docs/proof/.

Đảo nổi/biển mây, nón lá treo đèn, vòng sáng, lá báo gió, minimap và nhạc sine là phần thể hiện riêng.
Benchmark tắt mây/lá trang trí thêm; dùng cùng renderer/ánh sáng/game map, instancing cho các thực thể chuẩn.
Không thêm thực thể gameplay ngoài contract và không thay output headless bởi trang trí.


---

# Tài liệu lab gốc: Day 12 — AI SDLC: Đảo Đèn Lồng

> **Cá nhân** (1 người / 1 MSSV) · Áp dụng SDLC cùng AI để xây một **game 3D** qua **4 phase**, từ yêu cầu ban đầu tới bản phát hành.
> **Lab board + trợ giảng:** **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**

---

## Tài liệu của lab

| File | Nội dung |
|---|---|
| [GUIDE.md](GUIDE.md) | Hướng dẫn làm lab: vòng làm việc mỗi phase, harness, kiểm chứng, token |
| [CHECKPOINTS.md](CHECKPOINTS.md) | Các mốc tự kiểm tra từ chuẩn bị đến nộp bài |
| [SUBMISSION.md](SUBMISSION.md) | Đặt tên repo, hạn nộp, tag, Release, video, checklist |
| [RULES.md](RULES.md) | Quy định: AI, trung thực về bằng chứng, bản quyền, bảo mật |
| [RUBRIC.md](RUBRIC.md) | Thang điểm chi tiết |

## Lab board

Yêu cầu dự án được phát hành tại **[Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)**. Mỗi phase là một tab (tab chưa phát hành bị khóa), mỗi tab có trợ giảng AI riêng chỉ trả lời trong phạm vi phase đó. Trợ giảng cần đăng nhập claude.ai và dùng lượt Claude của bạn.

## Dự án

**Đảo Đèn Lồng**: game 3D góc nhìn thứ ba. Mây, người giữ đèn nhỏ tuổi, gom đom đóm để thắp lại các Đèn Lồng Lớn và né Bóng Mực trong sương đen.

- Không ràng buộc công nghệ; chạy được trên macOS hoặc Linux.
- Tuân theo **Test Contract** (chế độ headless) để được chấm tự động và so sánh với nhau.

| Phase | Bạn nhận | Nộp |
|---|---|---|
| 1 | **PRD-0** (mô tả tổng quát) + Test Contract | tag `phase-1` |
| 2 | **Ticket-02**, phát hành khi Phase 1 kết thúc | tag `phase-2` |
| 3 | **Ticket-03**, phát hành khi Phase 2 kết thúc | tag `phase-3` |
| 4 | **Ticket-04**, phát hành khi Phase 3 kết thúc | tag `phase-4` + Release `v1.0.0` |

Yêu cầu sẽ được bổ sung và có thể thay đổi giữa các phase, giống dự án thật.

### Lịch 4 giờ

Bài lab kéo dài **4 giờ**. Phase 1 và 2 khoảng **1 giờ**, Phase 3 khoảng **30 phút**, Phase 4 khoảng **1 giờ 30 phút**. Mỗi phase phát hành đúng mốc giờ. Phase mới xuất hiện trên lab board khi tới mốc.

| Mốc | Sự kiện | Hạn tag |
|---|---|---|
| 0h | Phát hành **Phase 1** (PRD-0), gồm cả phần chuẩn bị | `phase-1` trước mốc 1h |
| 1h | Phát hành **Phase 2** | `phase-2` trước mốc 2h |
| 2h | Phát hành **Phase 3** | `phase-3` trước mốc 2h30 |
| 2h30 | Phát hành **Phase 4** | `phase-4`, Release `v1.0.0` và video trước mốc 4h |
| 4h | Hết giờ lab, chốt bài | |

Hết giờ mỗi phase thì tag và chuyển sang phase tiếp theo, dù phase chưa hoàn hảo. Chỗ chưa xong ghi trung thực trong bằng chứng.

---

## Gợi ý SDLC (cách làm là của bạn)

Mỗi phase là một vòng nhỏ. Công cụ, thứ tự, định dạng tài liệu đều tự do; đây chỉ là gợi ý:

1. **Requirements:** biến yêu cầu thành tiêu chí nghiệm thu kiểm chứng được. Chỗ mơ hồ thì tự giả định và ghi lại.
2. **Plan:** nghĩ cách kiểm chứng **trước** khi để agent viết code.
3. **Build:** để agent viết, bạn điều phối và review.
4. **Verify:** chạy thật, kiểm tra hành vi thật. *Không có bằng chứng thì chưa xong*: "agent bảo chạy rồi" không phải bằng chứng.
5. **Evaluate:** cái gì đạt, AI sai ở đâu, harness (AGENTS.md, skill, hook) cần chỉnh gì.
6. **Release:** gắn tag.

## Ba điều cần nhớ

> Bạn được **tự do sáng tạo thêm** quanh phần lõi (nhân vật, cơ chế nhỏ, câu chuyện, hiệu ứng, âm thanh…). Sáng tạo gọn và không phá yêu cầu được tính điểm trong hạng mục F của [RUBRIC](RUBRIC.md); ghi mục "Sáng tạo của tôi" trong README của bạn.

- **Game tốt là game đúng yêu cầu của khách hàng**, không phải game phức tạp hay đẹp nhất. Làm đúng và chứng minh được là đúng trước, trau chuốt sau.
- **Cân nhắc kỹ quota token của bạn.** Đốt nhiều token không làm bài tốt hơn. Ngữ cảnh gọn, kế hoạch rõ, kiểm chứng sớm thường vừa rẻ vừa đúng hơn chạy agent liên tục.
- **Kiểm chứng là phần quan trọng nhất.** Bằng chứng (test, output headless, ảnh, số đo) đáng giá hơn lời mô tả.

---

## Bàn giao cuối cùng

Một **repo GitHub cá nhân, public**, gồm:

1. **Toàn bộ mã nguồn** của game qua 4 phase, tag `phase-1` … `phase-4`, Release `v1.0.0`.
2. **Video demo `.mp4` dưới 5 phút** (đính kèm Release `v1.0.0` hoặc `docs/demo/demo.mp4`, link ở đầu README): chơi thử và cho thấy bằng chứng game chạy đúng.
3. **Bằng chứng kiểm chứng** của từng phase (định dạng tự chọn).
4. **Harness AI đã dùng** (AGENTS.md / CLAUDE.md, skills, hooks, plugins…), giữ nguyên trong repo và lịch sử git.
5. **Ghi chép ngắn:** spec/giả định mỗi phase, nhật ký dùng AI (gồm token/chi phí ước tính), retro.

Không commit API key, token hay `.env`. Gửi link repo theo hướng dẫn của Coach.

## Đánh giá (100 điểm)

| Hạng mục | Điểm |
|---|---|
| Test tự động ẩn (headless, gồm kiểm tra lại phase trước) | 30 |
| Kiểm chứng & bằng chứng của bạn | 20 |
| Quy trình SDLC & harness AI | 15 |
| Evaluation & retro (gồm cách bạn dùng token) | 10 |
| Hiệu năng & ổn định | 10 |
| Chất lượng sản phẩm (đúng yêu cầu, chơi được) | 10 |
| Video demo | 5 |

## Quy định

- Dùng AI thoải mái; không sao chép repo của người khác.
- Bằng chứng phải thật: test luôn đạt hay output sửa tay là vi phạm.
- Nhân vật, bối cảnh là bản gốc của lab; asset bên ngoài chỉ dùng loại CC0/CC-BY/MIT hoặc tự tạo, ghi nguồn trong `CREDITS.md`.
