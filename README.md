# Đảo Đèn Lồng — bản chơi Phase 2

Game 3D góc nhìn thứ ba: cùng Mây đi qua **Đảo Bến → Đảo Cau → Đảo Chuông**, gom đom đóm,
thắp đèn và tìm Bình Minh. Phase 2 thực hiện Ticket-02 / Test Contract **1.1**.
Học viên: **Vũ Quang Thái · 2A202603545**. Video demo cuối bài sẽ bổ sung ở Phase 4.

## Cài và chơi (Windows, macOS, Linux)

Cần **Node.js 22 trở lên**, npm và trình duyệt có WebGL. Từ thư mục repo:

```sh
npm ci
npm run build
npm start
```

Mở **http://localhost:5173**, nhấn **Bắt đầu hành trình**. Sau khi cài dependency,
bản game dùng tài nguyên cục bộ, không phụ thuộc CDN. `dist/` cũng có thể phục vụ bằng
bất kỳ static server nào. Tắt server bằng Ctrl+C.

| Điều khiển | Hành động |
|---|---|
| WASD / ↑ ↓ | Di chuyển theo hướng camera |
| ← → / giữ chuột và kéo | Xoay camera |
| Space | Nhảy |
| Shift | Lướt 14 m/s trong 0.2 s, hồi 1.5 s |
| E | Nạp đom đóm cho đèn chưa sáng gần nhất (trong 2 m) |
| Q | Tỏa sáng: tốn 3 đom đóm, bán kính 3D 5 m, hồi 3 s |
| P / Esc | Tạm dừng: tiếp tục, chơi lại đêm, cài đặt, về menu |
| Nút ? / ⚙ | Hướng dẫn / âm lượng và độ nhạy chuột (lưu trên trình duyệt) |

Nhặt tự động trong 1 m và chênh cao ≤1.5 m, túi tối đa 10. Mỗi đèn cần 10 con, nạp từng phần được.
Đèn sáng tạo vùng trú an toàn 6 m. Ba đêm có 5/6/7 đèn và 300/330/360 giây.
Mỗi đêm bắt đầu với 3 Ngọn Lửa; hết lửa hoặc giờ thì thua, được chơi lại đúng đêm đó.
Đảo Cau có cầu tre không lan can và bục phóng. Đảo Chuông có ba tầng, dốc, bục phóng và gió báo trước.
Gió Lạc cướp đom đóm; pulse vào nó khi mang đồ để lấy lại. Bùa Gió cho chạy 7.2 m/s và lướt không hồi trong 10 s.
Rơi xuống dưới Y=-10 mất một lửa và cả túi, hồi sinh sau 1 s. Chuyển tab sẽ tạm dừng.

**Điểm chuẩn:** mỗi đom đóm **nạp** +10, thắp đèn +100, mỗi Bóng Mực trúng pulse +5.
Khi thắng cộng `floor(giây còn lại) × 2 + máu còn lại × 50`.
Nhặt không cộng điểm. Tổng game chỉ cộng các đêm đã thắng. Tuning ở [game.contract.json](game.contract.json).

## Kiểm chứng và headless

```sh
npm run verify
node src/headless.js --seed 12 --night 1 --ticks 900 --out run.jsonl --snapshot-every 60
node src/headless.js --seed 12 --night 3 --ticks 21600 --scenario docs/proof/phase-2/benchmark-scenario.json --out night3.jsonl
```

Headless không cần cài Three.js hay mở trình duyệt. Nhận đủ `--scenario`, `--inputs`,
`--ticks`, `--snapshot-every`; `--night` nhận 1, 2 hoặc 3. Xuất JSONL snapshot/event/end theo Contract 1.1.
Input gồm dash/pause ở cạnh nhấn; pause giữ nguyên sim_tick, đồng hồ và toàn bộ timer nhưng tick vẫn tăng.
Đọc thêm [giả định và thay đổi so với Phase 1](docs/phase-2.md),
[báo cáo chạy thật](docs/proof/phase-2/report.json), [test output](docs/proof/phase-2/tests.tap).
`verify` chạy test, build, scenario thắng/thua/pulse/hết giờ, so output cả ba đêm từng byte và benchmark 21.600 tick;
lỗi ở bất kỳ bước nào sẽ dừng với mã lỗi. GitHub Actions chạy lại trên Ubuntu khi push/PR.
Giữ bằng chứng lịch sử [Phase 1](docs/proof/phase-1/report.json); các kỳ vọng bị thay bởi Ticket-02 được ghi trong tài liệu Phase 2.

**Giới hạn kiểm chứng:** test tự động xác nhận logic/CLI, HTTP/module và các handler UI với DOM giả lập.
DOM giả lập không xác nhận hình ảnh, âm thanh hay cảm giác chơi. Theo yêu cầu, học viên tự test preview;
Codex không tiếp tục preview. Benchmark ghi rõ cấu hình/tình huống trong report. Chưa có kết quả CI Ubuntu trong phiên này;
không khẳng định hidden tests hoặc FPS đã đạt.

## Sáng tạo của tôi

Đảo nổi giữa biển mây, nón lá có đèn nhỏ, hiệu ứng vòng sáng khi pulse, lá bay trước gió,
bản đồ nhỏ và nhạc/âm thanh tổng hợp. Bản đồ và bảng màu dùng đúng chuẩn Ticket-02.
Các phần trang trí chỉ ở renderer, không thêm thực thể gameplay
hay đổi output headless. Bằng chứng logic giữ nguyên: browser và CLI cùng import `src/game.js`;
`verify` so output CLI từng byte. Phần hình ảnh cần chơi thử trực tiếp.

Nguồn và giấy phép: [CREDITS.md](CREDITS.md), [LICENSE](LICENSE).

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
