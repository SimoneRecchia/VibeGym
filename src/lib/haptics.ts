import { Vibration } from 'react-native';

export type HapticKind = 'light' | 'medium' | 'success' | 'done' | 'warning';

let enabled = true;
/**
 * If `Vibration.vibrate()` ever fails (e.g. the VIBRATE permission isn't
 * declared in AndroidManifest), the native side can raise SecurityException
 * and on Android the app crashes before our JS catch fires. Once we detect a
 * failure we permanently shut haptics off for this session to avoid repeats.
 */
let nativeBroken = false;

export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

const fire = (pattern: number | number[]) => {
  if (nativeBroken) return;
  try {
    Vibration.vibrate(pattern);
  } catch {
    nativeBroken = true;
  }
};

export const haptic = (kind: HapticKind) => {
  if (!enabled) return;
  switch (kind) {
    case 'light':
      fire(8);
      break;
    case 'medium':
      fire(15);
      break;
    case 'success':
      fire([0, 10, 40, 20]);
      break;
    case 'warning':
      fire([0, 25, 80, 25]);
      break;
    case 'done':
      fire([0, 200, 100, 200, 100, 400]);
      break;
  }
};
