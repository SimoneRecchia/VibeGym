/**
 * Keep-screen-awake wrapper.
 *
 * Defensive shim around @sayem314/react-native-keep-awake so a missing or
 * misbuilt native module can never crash JS — the calls just no-op.
 */
let native: {
  activateKeepAwake: () => void;
  deactivateKeepAwake: () => void;
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  native = require('@sayem314/react-native-keep-awake');
} catch {
  native = null;
}

export const keepScreenAwake = () => {
  try {
    native?.activateKeepAwake();
  } catch {
    /* no-op */
  }
};

export const allowScreenSleep = () => {
  try {
    native?.deactivateKeepAwake();
  } catch {
    /* no-op */
  }
};
