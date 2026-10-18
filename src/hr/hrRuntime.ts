/**
 * Connection to the saved heart-rate sensor. It connects when a workout
 * starts and records the samples until it ends; the live bpm is shown in the
 * workout top bar. Reconnects by itself if the sensor drops out.
 */
import { create } from 'zustand';
import BleManager, { BleScanMode, Peripheral } from 'react-native-ble-manager';
import { ensureBleStarted, requestBlePermissions } from '../services/ble';
import type { Sex } from '../core/types';
import {
  HeartRateSummary,
  HR_MEASUREMENT,
  HR_SERVICE,
  isUuid,
  parseHeartRate,
  summarizeHeartRate,
} from './heartRate';

export type HrStatus = 'off' | 'connecting' | 'live' | 'lost';

interface HrState {
  status: HrStatus;
  bpm?: number;
  /** [time ms, bpm] while recording a workout. */
  samples: [number, number][];
}

export const useHr = create<HrState>(() => ({ status: 'off', samples: [] }));

let target: string | null = null;
let recording = false;
let subs: { remove: () => void }[] = [];
let retry: ReturnType<typeof setTimeout> | null = null;
let lastSample = 0;
let staleTimer: ReturnType<typeof setTimeout> | null = null;

const clear = () => {
  subs.forEach(s => s.remove());
  subs = [];
  if (retry) clearTimeout(retry);
  if (staleTimer) clearTimeout(staleTimer);
  retry = null;
  staleTimer = null;
};

/** No value for a while: show it as lost rather than a frozen number. */
const watchStale = () => {
  if (staleTimer) clearTimeout(staleTimer);
  staleTimer = setTimeout(() => {
    if (target) useHr.setState({ status: 'lost', bpm: undefined });
  }, 8000);
};

const onValue = (e: {
  peripheral: string;
  characteristic: string;
  value: number[];
}) => {
  if (e.peripheral !== target || !isUuid(e.characteristic, HR_MEASUREMENT))
    return;
  const bpm = parseHeartRate(e.value);
  if (bpm == null) return;
  const now = Date.now();
  let samples = useHr.getState().samples;
  // Sensors notify about once a second; keep at most one sample a second.
  if (recording && now - lastSample >= 900) {
    lastSample = now;
    samples = [...samples, [now, bpm]];
  }
  useHr.setState({ status: 'live', bpm, samples });
  watchStale();
};

/** iOS only connects to peripherals seen in this session: look for it. */
const discover = (id: string, ms = 8000): Promise<boolean> =>
  new Promise(resolve => {
    let done = false;
    const sub = BleManager.onDiscoverPeripheral((p: Peripheral) => {
      if (p.id !== id || done) return;
      done = true;
      sub.remove();
      BleManager.stopScan().catch(() => {});
      resolve(true);
    });
    BleManager.scan({
      serviceUUIDs: [HR_SERVICE],
      seconds: Math.ceil(ms / 1000),
      allowDuplicates: false,
      scanMode: BleScanMode.LowLatency,
    }).catch(() => {});
    setTimeout(() => {
      if (done) return;
      done = true;
      sub.remove();
      resolve(false);
    }, ms);
  });

const attach = async (id: string): Promise<void> => {
  try {
    await BleManager.connect(id);
  } catch {
    if (!(await discover(id))) throw new Error('not found');
    await BleManager.connect(id);
  }
  await BleManager.retrieveServices(id, [HR_SERVICE]);
  await BleManager.startNotification(id, HR_SERVICE, HR_MEASUREMENT);
};

const scheduleRetry = () => {
  if (retry || !target) return;
  retry = setTimeout(() => {
    retry = null;
    if (target) connectHr(target);
  }, 5000);
};

/** Connects to the sensor (no-op if already connected to it). */
export const connectHr = async (id: string): Promise<void> => {
  if (target === id && useHr.getState().status === 'live') return;
  clear();
  target = id;
  useHr.setState({ status: 'connecting' });
  try {
    if (!(await requestBlePermissions())) throw new Error('permission');
    await ensureBleStarted();
    subs.push(BleManager.onDidUpdateValueForCharacteristic(onValue));
    subs.push(
      BleManager.onDisconnectPeripheral(({ peripheral }) => {
        if (peripheral !== target) return;
        useHr.setState({ status: 'lost', bpm: undefined });
        scheduleRetry();
      }),
    );
    await attach(id);
    if (target !== id) return;
    watchStale();
  } catch {
    if (target !== id) return;
    useHr.setState({ status: 'lost', bpm: undefined });
    scheduleRetry();
  }
};

export const disconnectHr = () => {
  const id = target;
  target = null;
  clear();
  if (id) BleManager.disconnect(id).catch(() => {});
  useHr.setState({ status: 'off', bpm: undefined });
};

export const startHrRecording = () => {
  if (recording) return;
  recording = true;
  lastSample = 0;
  useHr.setState({ samples: [] });
};

/** Stops recording and returns the samples. */
export const stopHrRecording = (): [number, number][] => {
  recording = false;
  const { samples } = useHr.getState();
  useHr.setState({ samples: [] });
  return samples;
};

export const hrSamples = () => useHr.getState().samples;

/** Summary of the workout being recorded, with the energy for this person. */
export const workoutHeartRate = (who: {
  kg?: number;
  age?: number;
  sex?: Sex;
}): HeartRateSummary | undefined => summarizeHeartRate(hrSamples(), who);
