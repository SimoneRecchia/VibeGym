/**
 * Timer sounds (beep.wav / go.wav bundled in android/app/src/main/res/raw and
 * the iOS app target). Defensive: a missing module or asset is silent.
 */
let player: { playSoundFile: (name: string, type: string) => void } | null =
  null;
try {
  const mod = require('react-native-sound-player');
  player = mod.default ?? mod;
} catch {
  player = null;
}

let enabled = true;

export const setSoundEnabled = (v: boolean) => {
  enabled = v;
};

const play = (name: string) => {
  if (!enabled || !player) return;
  try {
    player.playSoundFile(name, 'wav');
  } catch {
    /* no-op */
  }
};

/** Short tick for the 3-2-1 countdown. */
export const playTick = () => play('beep');
/** Chime when a timer ends. */
export const playEnd = () => play('go');
