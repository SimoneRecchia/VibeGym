/**
 * Timer sound effects.
 *
 * Thin, defensive wrapper around react-native-sound-player. The beep asset
 * lives at:
 *   - Android: android/app/src/main/res/raw/beep.wav  (auto-bundled by Gradle)
 *   - iOS:     ios/VibeGym/beep.wav  (must be added to the app target in Xcode)
 *
 * Every call is wrapped in try/catch and the module never throws: if the native
 * module or the asset is missing, sound simply no-ops (same as before) instead
 * of crashing the app.
 */
let SoundPlayer: {
  playSoundFile: (name: string, type: string) => void;
} | null = null;

try {
  // Lazy require so a missing/misbuilt native module can't crash JS at import.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SoundPlayer = require('react-native-sound-player').default ?? require('react-native-sound-player');
} catch {
  SoundPlayer = null;
}

let enabled = true;

export const setSoundEnabled = (v: boolean) => {
  enabled = v;
};

const play = (name: string) => {
  if (!enabled || !SoundPlayer) return;
  try {
    SoundPlayer.playSoundFile(name, 'wav');
  } catch {
    /* asset or native module unavailable — stay silent */
  }
};

/** Short tick — used for the 3-2-1 countdown. */
export const playBeep = () => play('beep');

/** Distinct chime — used when the timer hits 0 ("VAI"). */
export const playGo = () => play('go');
