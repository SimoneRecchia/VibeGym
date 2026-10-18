/**
 * Haptics via the Taptic Engine (iOS) / VibrationEffect (Android).
 * Never throws: a missing native module simply means no feedback.
 */
import HapticFeedback from 'react-native-haptic-feedback';

export type Haptic =
  | 'selection'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

const MAP = {
  selection: 'selection',
  light: 'impactLight',
  medium: 'impactMedium',
  heavy: 'impactHeavy',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
} as const;

let enabled = true;

export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

export const haptic = (kind: Haptic = 'light') => {
  if (!enabled) return;
  try {
    HapticFeedback.trigger(MAP[kind], {
      enableVibrateFallback: false,
      ignoreAndroidSystemSettings: false,
    });
  } catch {
    /* no-op */
  }
};
