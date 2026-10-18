/* eslint-env jest */
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    Directions: {},
    gestureHandlerRootHOC: jest.fn(c => c),
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(() => Promise.resolve([])),
  keepLocalCopy: jest.fn(() => Promise.resolve([])),
  saveDocuments: jest.fn(() => Promise.resolve([])),
  types: { allFiles: '*/*', json: 'application/json', plainText: 'text/plain' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: () => false,
}));

jest.mock('react-native-fs', () => ({
  readFile: jest.fn(() => Promise.resolve('{}')),
  writeFile: jest.fn(() => Promise.resolve()),
  CachesDirectoryPath: '/tmp',
  DocumentDirectoryPath: '/tmp',
}));

jest.mock('@callstack/liquid-glass', () => {
  const { View } = require('react-native');
  return {
    LiquidGlassView: View,
    LiquidGlassContainerView: View,
    isLiquidGlassSupported: false,
  };
});

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn(), setEnabled: jest.fn() },
  trigger: jest.fn(),
}));

jest.mock('react-native-notify-kit', () =>
  require('react-native-notify-kit/jest-mock'),
);

jest.mock('react-native-ble-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn(() => Promise.resolve()),
    scan: jest.fn(() => Promise.resolve()),
    stopScan: jest.fn(() => Promise.resolve()),
    checkState: jest.fn(() => Promise.resolve('on')),
    enableBluetooth: jest.fn(() => Promise.resolve()),
    onDiscoverPeripheral: jest.fn(() => ({ remove: jest.fn() })),
    onStopScan: jest.fn(() => ({ remove: jest.fn() })),
    onDidUpdateState: jest.fn(() => ({ remove: jest.fn() })),
  },
  BleState: {
    On: 'on',
    Off: 'off',
    Unsupported: 'unsupported',
    Unauthorized: 'unauthorized',
  },
}));

jest.mock('react-native-bottom-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');
  // Renders every tab so tests can reach all three sections.
  const TabView = ({ navigationState, renderScene }) =>
    React.createElement(
      View,
      null,
      navigationState.routes.map(route =>
        React.createElement(
          View,
          { key: route.key },
          renderScene({ route, jumpTo: () => {} }),
        ),
      ),
    );
  return {
    __esModule: true,
    default: TabView,
    useBottomTabBarHeight: () => 0,
    BottomTabBarHeightContext: React.createContext(undefined),
  };
});

jest.mock('react-native-sound-player', () => ({ playSoundFile: jest.fn() }));
jest.mock('@sayem314/react-native-keep-awake', () => ({
  activateKeepAwake: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

jest.mock('react-native-camera-kit', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Camera = React.forwardRef((props, _ref) =>
    React.createElement(View, { testID: 'camera', style: props.style }),
  );
  return { Camera, CameraType: { Back: 'back', Front: 'front' } };
});
