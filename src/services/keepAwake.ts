let native: {
  activateKeepAwake: () => void;
  deactivateKeepAwake: () => void;
} | null = null;
try {
  native = require('@sayem314/react-native-keep-awake');
} catch {
  native = null;
}

export const keepAwake = (on: boolean) => {
  try {
    if (on) native?.activateKeepAwake();
    else native?.deactivateKeepAwake();
  } catch {
    /* no-op */
  }
};
