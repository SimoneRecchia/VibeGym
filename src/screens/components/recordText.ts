import { DisplayUnit, PersonalRecord } from '../../core/types';
import { fmtLoad } from '../../core/units';
import { fmtDuration, fmtNum } from '../../core/format';

const LABEL: Record<PersonalRecord['kind'], string> = {
  e1rm: '1RM stimato',
  kg: 'carico massimo',
  reps: 'ripetizioni',
  sec: 'durata',
  km: 'distanza',
  volume: 'volume',
};

const value = (r: PersonalRecord, v: number, unit: DisplayUnit): string => {
  if (r.kind === 'e1rm' || r.kind === 'kg') return fmtLoad(v, unit);
  if (r.kind === 'sec') return fmtDuration(v);
  if (r.kind === 'km') return `${fmtNum(v, 2)} km`;
  return fmtNum(v, 0);
};

/** "1RM stimato 102,5 kg (prima 100 kg)" */
export const recordText = (r: PersonalRecord, unit: DisplayUnit): string =>
  `${LABEL[r.kind]} ${value(r, r.value, unit)}${
    r.previous ? ` (prima ${value(r, r.previous, unit)})` : ''
  }`;
