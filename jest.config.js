module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-navigation|@react-native-(community|clipboard|documents)|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-svg)',
  ],
};
