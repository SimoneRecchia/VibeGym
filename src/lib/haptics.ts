import { Vibration } from 'react-native';

export type HapticKind = 'light' | 'medium' | 'success' | 'done' | 'warning';

let enabled = true;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

export const haptic = (kind: HapticKind) => {
  if (!enabled) return;
  try {
    switch (kind) {
      case 'light':
        Vibration.vibrate(8);
        break;
      case 'medium':
        Vibration.vibrate(15);
        break;
      case 'success':
        Vibration.vibrate([0, 10, 40, 20]);
        break;
      case 'warning':
        Vibration.vibrate([0, 25, 80, 25]);
        break;
      case 'done':
        Vibration.vibrate([0, 200, 100, 200, 100, 400]);
        break;
    }
  } catch {
    /* ignore */
  }
};
