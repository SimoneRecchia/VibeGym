/**
 * Apple Health libraries are iOS-only: keep them (and the Nitro runtime they
 * need) out of the Android build.
 */
const iosOnly = { platforms: { android: null } };

module.exports = {
  dependencies: {
    '@kingstinct/react-native-healthkit': iosOnly,
    '@react-native-healthkit/core': iosOnly,
    'react-native-nitro-modules': iosOnly,
  },
};
