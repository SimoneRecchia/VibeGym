/**
 * Shared Bluetooth LE setup: one BleManager start, the Android runtime
 * permissions and the "turn Bluetooth on" shortcut. Used by the scale and
 * the heart-rate sensor.
 */
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import BleManager from 'react-native-ble-manager';

let started: Promise<void> | null = null;
export const ensureBleStarted = (): Promise<void> => {
  if (!started)
    started = BleManager.start({ showAlert: false }).catch(e => {
      started = null;
      throw e;
    });
  return started;
};

export const requestBlePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  const v =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(String(Platform.Version), 10);
  const perms =
    v >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const res = await PermissionsAndroid.requestMultiple(perms);
  return perms.every(p => res[p] === PermissionsAndroid.RESULTS.GRANTED);
};

export const openBluetoothSettings = () => {
  if (Platform.OS === 'android')
    BleManager.enableBluetooth().catch(() => Linking.openSettings());
  else Linking.openSettings();
};
