# Changelog

## Phase 3 — Contract 1.2 (breaking changes)

- Đèn hao 1 fuel/s và tắt; thêm fuel/ever_lit/relit_count, lantern_out.
- E chọn cả đèn sáng thiếu dầu; thêm refuel. Thắp lần đầu cần 10, thắp lại 5.
- Vùng sáng chỉ khi fuel thực ≥30; wander tìm đèn yếu, drain hút thêm 5 fuel/s/con.
- Đêm 240/270/300 s. Bỏ thắng sớm/all_lit; dawn_survived khi còn sống và đủ 3/5, 4/6 hoặc 5/7 đèn ở tick bình minh.
- Thay toàn bộ điểm: nạp +5/con, lần đầu +100, relight +40, pulse +5 hoặc tổng +15 nếu mục tiêu đang drain; bình minh +50+floor(fuel) mỗi đèn sáng và +50/lửa; bỏ thưởng thời gian.
- Capacity 10, +2/lần thắp thành công, tối đa 20; scenario thêm successful_lights, đèn dựng sẵn không được tính.
- Snapshot player.capacity, fuel 1 chữ số, drain; scenario fuel/ever_lit/target_lantern_id; lantern_lit.relight, refuel/fuel_drain.
- Bảng màu dễ phân biệt lưu cục bộ; đèn tắt xẹp 20%, vết rách; đèn yếu nhấp nháy 1 Hz.
- Test thay: partial deposit điểm 50/200→25/150; last-lamp/all_lit→bình minh và ngưỡng; UI kết thúc ở bình minh; benchmark tối đa 18.000 thay 21.600 tick do thời gian Đêm 3 mới.
- Giữ regression map/vật lý/điều khiển, spawn, pulse 3D/đẩy, Gió Lạc/Bùa Gió, pause, CLI/schema, HTTP và tất định khi không bị luật dầu tác động.

## Phase 2 — Contract 1.1

Ba bản đồ chuẩn, dash, Gió Lạc/Bùa Gió, pause/settings và thông số chuẩn. Xem docs/phase-2.md.

## Phase 1 — Contract 1.0

Game Đêm 1 và headless ban đầu. Xem docs/phase-1.md.
