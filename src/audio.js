export function createAudio() {
  let context, master, volume = .35, lastBeat = -1;
  function activate() {
    context ??= new AudioContext();
    if (!master) { master = context.createGain(); master.connect(context.destination); }
    master.gain.value = volume; context.resume().catch(() => {});
  }
  function note(frequency, length = .25, strength = .1, delay = 0) {
    if (!context || volume === 0) return;
    const at = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(strength, at + .015); gain.gain.exponentialRampToValueAtTime(.001, at + length);
    oscillator.connect(gain).connect(master); oscillator.start(at); oscillator.stop(at + length + .02);
  }
  const frequencies = { mote_picked: 880, lantern_lit: 523, pulse: 330, player_hit: 130, jump: 440, dash: 660, jump_pad: 740, shade_spawned: 110, charm_picked: 1046, drifter_steal: 180, drifter_drop: 790, countdown: 392, wind: 147 };
  return { activate,
    volume(value) { volume = value; if (master) master.gain.setValueAtTime(volume, context.currentTime); },
    effect(name) { if (name === 'won' || name === 'lost') { const notes = name === 'won' ? [523, 659, 784] : [330, 262, 196]; notes.forEach((n, i) => note(n, .8, .12, i * .18)); } else if (frequencies[name]) note(frequencies[name], .25, .08); },
    music(tick, night, playing) { if (!playing) return; const beat = Math.floor(tick / 120); if (beat === lastBeat) return; lastBeat = beat; const scale = [196, 246.94, 293.66, 329.63, 293.66, 246.94]; note(scale[(beat + night) % scale.length], 1.5, .035); note(98, 1.5, .025); }
  };
}
