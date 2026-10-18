/** Looks for heart-rate sensors around (pairing screen). */
import { useCallback, useEffect, useRef, useState } from 'react';
import BleManager, {
  BleScanMode,
  BleState,
  Peripheral,
} from 'react-native-ble-manager';
import { ensureBleStarted, requestBlePermissions } from '../services/ble';
import { HR_SERVICE, isUuid } from './heartRate';

export interface FoundSensor {
  id: string;
  name: string;
  rssi: number;
}

export type ScanStatus =
  | 'idle'
  | 'scanning'
  | 'permission-denied'
  | 'bluetooth-off'
  | 'error';

const SCAN_S = 20;

export function useHrScan() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [found, setFound] = useState<FoundSensor[]>([]);
  const subs = useRef<{ remove: () => void }[]>([]);

  const cleanup = useCallback(() => {
    subs.current.forEach(s => s.remove());
    subs.current = [];
  }, []);

  const stop = useCallback(() => {
    cleanup();
    BleManager.stopScan().catch(() => {});
    setStatus(s => (s === 'scanning' ? 'idle' : s));
  }, [cleanup]);

  const start = useCallback(async () => {
    cleanup();
    setFound([]);
    try {
      if (!(await requestBlePermissions())) {
        setStatus('permission-denied');
        return;
      }
      await ensureBleStarted();
      if ((await BleManager.checkState()) !== BleState.On) {
        setStatus('bluetooth-off');
        return;
      }
      subs.current.push(
        BleManager.onDiscoverPeripheral((p: Peripheral) => {
          const uuids = p.advertising?.serviceUUIDs ?? [];
          if (!uuids.some(u => isUuid(u, HR_SERVICE))) return;
          const name = p.name || p.advertising?.localName || 'Sensore cardio';
          setFound(prev =>
            [
              ...prev.filter(f => f.id !== p.id),
              { id: p.id, name, rssi: p.rssi },
            ].sort((a, b) => b.rssi - a.rssi),
          );
        }),
        BleManager.onStopScan(() => setStatus('idle')),
      );
      await BleManager.scan({
        serviceUUIDs: [HR_SERVICE],
        seconds: SCAN_S,
        allowDuplicates: false,
        scanMode: BleScanMode.LowLatency,
      });
      setStatus('scanning');
    } catch {
      setStatus('error');
    }
  }, [cleanup]);

  useEffect(() => stop, [stop]);

  return { status, found, start, stop };
}
