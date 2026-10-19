/**
 * "Your rest is over" moment: set when a rest runs out (not when skipped).
 * The tab icon rings and the notification turns into "Tocca a te".
 */
import { create } from 'zustand';
import { onTimerEnd } from './timer';

export const useRestAlarm = create<{ at: number; next: string }>(() => ({
  at: 0,
  next: '',
}));

onTimerEnd(s => {
  if (s.phase === 'rest')
    useRestAlarm.setState({ at: Date.now(), next: s.nextLabel });
});
