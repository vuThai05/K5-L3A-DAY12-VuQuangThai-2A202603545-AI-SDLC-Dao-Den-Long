export const DEFAULT_BINDINGS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyQ', pause: 'KeyP' };
export const ACTION_LABELS = { up: 'Đi tới', down: 'Đi lùi', left: 'Sang trái', right: 'Sang phải', jump: 'Nhảy', dash: 'Lướt', interact: 'Nạp / châm dầu', pulse: 'Tỏa sáng', pause: 'Tạm dừng' };
export function validBindings(value) {
  return value && Object.keys(DEFAULT_BINDINGS).every(k => typeof value[k] === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Escape|Tab|Enter|Backspace|F([1-9]|1[0-2]))$/.test(value[k])) && new Set(Object.keys(DEFAULT_BINDINGS).map(k => value[k])).size === 9;
}
export function rebind(bindings, action, code) {
  const conflict = Object.keys(bindings).find(k => k !== action && bindings[k] === code);
  if (!(action in DEFAULT_BINDINGS)) throw new Error('Hành động không hợp lệ');
  if (conflict) throw new Error(`Phím này đã dùng cho “${ACTION_LABELS[conflict]}”.`);
  const next = { ...bindings, [action]: code }; if (!validBindings(next)) throw new Error('Phím chưa được hỗ trợ.'); return next;
}
export function keyLabel(code) { return code.replace(/^Key|^Digit/, '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift phải').replace('Space', 'Space').replace('Escape', 'Esc'); }
