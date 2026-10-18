/**
 * Listens to Xiaomi Mi scale advertisements over Bluetooth LE.
 * No connection or pairing is needed: readings are broadcast in the clear.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import BleManager, {
  BleScanMode,
  BleState,
  Peripheral,
} from 'react-native-ble-manager';
import { parseAdvertisement, ScaleReading } from './miScale';
import {
  ensureBleStarted,
  openBluetoothSettings,
  requestBlePermissions,
} from '../services/ble';

export type ScaleStatus =
  | 'idle'
  /** Bluetooth stack still starting (iOS reports "unknown" at first). */
  | 'waiting'
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

export { openBluetoothSettings, requestBlePermissions };

interface Options {
  /** Only accept readings from this device (when the user saved one). */
  deviceId?: string;
  /** Collect every scale around instead of measuring (pairing screen). */
  discover?: boolean;
  /** How long to wait for the impedance after a stable weight (ms). */
  impedanceWaitMs?: number;
  /** Ignore readings already handled (the scale keeps re-broadcasting the last one). */
  skip?: (r: ScaleReading) => boolean;
}

/** After this long without readings, show a hint (location on old Android…). */
const SLOW_MS = 20000;

export function useScale(opts: Options = {}) {
  const [status, setStatus] = useState<ScaleStatus>('idle');
  const [reading, setReading] = useState<ScaleReading | null>(null);
  const [device, setDevice] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [found, setFound] = useState<FoundScale[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** No reading after a while: probably asleep, out of range or location off. */
  const [slow, setSlow] = useState(false);
  const subs = useRef<{ remove: () => void }[]>([]);
  const finalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const doneRef = useRef(false);
  const scanningRef = useRef(false);
  const gotReading = useRef(false);

  const clearTimers = () => {
    if (finalTimer.current) clearTimeout(finalTimer.current);
    if (slowTimer.current) clearTimeout(slowTimer.current);
    finalTimer.current = null;
    slowTimer.current = null;
  };

  const cleanup = useCallback(() => {
    subs.current.forEach(s => s.remove());
    subs.current = [];
    clearTimers();
    if (scanningRef.current) BleManager.stopScan().catch(() => {});
    scanningRef.current = false;
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
        gotReading.current = true;
        setSlow(false);
        setFound(prev => {
          const others = prev.filter(f => f.id !== p.id);
          return [...others, { id: p.id, name, reading: r, rssi: p.rssi }].sort(
            (a, b) => b.rssi - a.rssi,
          );
        });
        return;
      }
      if (o.deviceId && p.id !== o.deviceId) return;
      if (doneRef.current || o.skip?.(r)) return;
      gotReading.current = true;
      setSlow(false);
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
          o.impedanceWaitMs ?? 6000,
        );
      }
    },
    [finish],
  );

  const scan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    subs.current.push(BleManager.onDiscoverPeripheral(onPeripheral));
    // Low latency: the scale only advertises for a few seconds.
    await BleManager.scan({
      serviceUUIDs: [],
      seconds: 0,
      allowDuplicates: true,
      scanMode: BleScanMode.LowLatency,
    });
    setStatus('scanning');
    slowTimer.current = setTimeout(() => {
      if (!gotReading.current) setSlow(true);
    }, SLOW_MS);
  }, [onPeripheral]);

  /** React to Bluetooth being switched on/off or authorised while open. */
  const applyState = useCallback(
    (state: BleState) => {
      if (state === BleState.On) {
        scan().catch(e => {
          setError(e instanceof Error ? e.message : String(e));
          setStatus('error');
        });
        return;
      }
      if (scanningRef.current) {
        BleManager.stopScan().catch(() => {});
        scanningRef.current = false;
      }
      if (state === BleState.Unauthorized) setStatus('permission-denied');
      else if (state === BleState.Unsupported) setStatus('unsupported');
      else if (state === BleState.Off || state === BleState.TurningOff)
        setStatus('bluetooth-off');
      else setStatus('waiting');
    },
    [scan],
  );

  const start = useCallback(async () => {
    cleanup();
    doneRef.current = false;
    gotReading.current = false;
    setReading(null);
    setFound([]);
    setError(null);
    setSlow(false);
    try {
      if (!(await requestBlePermissions())) {
        setStatus('permission-denied');
        return;
      }
      setStatus('waiting');
      await ensureBleStarted();
      subs.current.push(
        BleManager.onDidUpdateState(({ state }) => {
          if (!doneRef.current) applyState(state);
        }),
      );
      applyState(await BleManager.checkState());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [cleanup, applyState]);

  const stop = useCallback(() => {
    cleanup();
    setStatus(s => (s === 'done' ? s : 'idle'));
  }, [cleanup]);

  useEffect(() => cleanup, [cleanup]);

  return { status, reading, device, found, error, slow, start, stop };
}
