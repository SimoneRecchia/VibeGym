/**
 * Listens to Xiaomi Mi scale advertisements over Bluetooth LE.
 * No connection or pairing is needed: readings are broadcast in the clear.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import BleManager, { BleState, Peripheral } from 'react-native-ble-manager';
import { parseAdvertisement, ScaleReading } from './miScale';

export type ScaleStatus =
  | 'idle'
  | 'permission-denied'
  | 'bluetooth-off'
  | 'unsupported'
  | 'scanning'
  | 'measuring'
  | 'done'
  | 'error';

export interface FoundScale {
  id: string;
  name: string;
  reading: ScaleReading;
  rssi: number;
}

let started: Promise<void> | null = null;
const ensureStarted = () => {
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

interface Options {
  /** Only accept readings from this device (when the user saved one). */
  deviceId?: string;
  /** Collect every scale around instead of measuring (pairing screen). */
  discover?: boolean;
  /** How long to wait for the impedance after a stable weight (ms). */
  impedanceWaitMs?: number;
}

export function useScale(opts: Options = {}) {
  const [status, setStatus] = useState<ScaleStatus>('idle');
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [device, setDevice] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [found, setFound] = useState<FoundScale[]>([]);
  const [error, setError] = useState<string | null>(null);
  const subs = useRef<{ remove: () => void }[]>([]);
  const finalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const doneRef = useRef(false);

  const cleanup = useCallback(() => {
    subs.current.forEach(s => s.remove());
    subs.current = [];
    if (finalTimer.current) clearTimeout(finalTimer.current);
    finalTimer.current = null;
    BleManager.stopScan().catch(() => {});
  }, []);

  const finish = useCallback(
    (r: ScaleReading) => {
      if (doneRef.current) return;
      doneRef.current = true;
      setReading(r);
      setStatus('done');
      cleanup();
    },
    [cleanup],
  );

  const onPeripheral = useCallback(
    (p: Peripheral) => {
      const r = parseAdvertisement(
        p.advertising?.serviceData as
          | Record<string, { bytes: number[] }>
          | undefined,
      );
      if (!r) return;
      const o = optsRef.current;
      const name = p.name || p.advertising?.localName || 'Bilancia Xiaomi';
      if (o.discover) {
        setFound(prev => {
          const others = prev.filter(f => f.id !== p.id);
          return [...others, { id: p.id, name, reading: r, rssi: p.rssi }].sort(
            (a, b) => b.rssi - a.rssi,
          );
        });
        return;
      }
      if (o.deviceId && p.id !== o.deviceId) return;
      if (doneRef.current) return;
      setDevice({ id: p.id, name });
      setReading(r);
      setStatus('measuring');
      if (!r.stable) return;
      // Stable weight. The composition scale sends the impedance a moment
      // later: wait for it (or for the person to step off) before finishing.
      if (r.model === 'mi-scale' || r.impedance != null || r.removed) {
        finish(r);
        return;
      }
      if (!finalTimer.current) {
        finalTimer.current = setTimeout(
          () => finish(r),
          o.impedanceWaitMs ?? 4000,
        );
      }
    },
    [finish],
  );

  const start = useCallback(async () => {
    cleanup();
    doneRef.current = false;
    setReading(null);
    setFound([]);
    setError(null);
    try {
      if (!(await requestBlePermissions())) {
        setStatus('permission-denied');
        return;
      }
      await ensureStarted();
      const state = await BleManager.checkState();
      if (state === BleState.Unsupported) {
        setStatus('unsupported');
        return;
      }
      if (state === BleState.Unauthorized) {
        setStatus('permission-denied');
        return;
      }
      if (state !== BleState.On) {
        setStatus('bluetooth-off');
        subs.current.push(
          BleManager.onDidUpdateState(({ state: st }) => {
            if (st === BleState.On) start();
          }),
        );
        return;
      }
      subs.current.push(BleManager.onDiscoverPeripheral(onPeripheral));
      await BleManager.scan({
        serviceUUIDs: [],
        seconds: 0,
        allowDuplicates: true,
      });
      setStatus('scanning');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [cleanup, onPeripheral]);

  const stop = useCallback(() => {
    cleanup();
    setStatus(s => (s === 'done' ? s : 'idle'));
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { status, reading, device, found, error, start, stop };
}
