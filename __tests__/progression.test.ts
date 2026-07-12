/**
 * Unit tests for weight progression (carry-forward) and the Intl-free date
 * formatters — the two data-layer behaviours behind the reported bugs
 * ("suggested old weights the week after" and "date not formatted").
 */
import {
  carrySessionWeights,
  effectiveSetWeight,
  resolveFinalWeights,
} from '../src/lib/helpers';
import {
  formatDate,
  formatDateTime,
  formatTime,
  weekdayNarrow,
} from '../src/lib/format';
import { Exercise, Weight } from '../src/lib/types';

const kg = (value: number): Weight => ({ value, unit: 'kg' });

describe('carrySessionWeights', () => {
  it('folds logged per-set weights into pesi_default (normal exercise)', () => {
    const ex: Exercise = {
      id: 'a1',
      nome: 'Panca',
      serie: 3,
      recupero_sec: 90,
      peso_suggerito: kg(40),
      _pesi_serie: [kg(42), null, kg(44)],
    };
    carrySessionWeights(ex);
    expect(ex.pesi_default).toEqual([kg(42), null, kg(44)]);
    // peso_suggerito tracks the last logged weight (for charts / back-compat)
    expect(ex.peso_suggerito).toEqual(kg(44));
  });

  it('leaves defaults untouched when nothing was logged', () => {
    const ex: Exercise = {
      id: 'a1',
      nome: 'Panca',
      serie: 3,
      recupero_sec: 90,
      peso_suggerito: kg(40),
      pesi_default: [kg(50), kg(50), kg(50)],
      _pesi_serie: [null, null, null],
    };
    carrySessionWeights(ex);
    expect(ex.pesi_default).toEqual([kg(50), kg(50), kg(50)]);
    expect(ex.peso_suggerito).toEqual(kg(40));
  });

  it('preserves prior defaults for sets not logged this session', () => {
    const ex: Exercise = {
      id: 'a1',
      nome: 'Panca',
      serie: 3,
      recupero_sec: 90,
      pesi_default: [kg(30), kg(30), kg(30)],
      _pesi_serie: [null, kg(35), null],
    };
    carrySessionWeights(ex);
    expect(ex.pesi_default).toEqual([kg(30), kg(35), kg(30)]);
  });

  it('carries per-sub weights on supersets, per sub independently', () => {
    const ss: Exercise = {
      id: 'a3',
      nome: 'Superset',
      tipo: 'superset',
      recupero_sec: 75,
      esercizi: [
        { id: 's1', nome: 'Alzate', serie: 2, peso_suggerito: kg(6), _pesi_serie: [kg(7), kg(8)] },
        { id: 's2', nome: 'Pushdown', serie: 2, peso_suggerito: kg(15), _pesi_serie: [null, null] },
      ],
    };
    carrySessionWeights(ss);
    expect(ss.esercizi![0].pesi_default).toEqual([kg(7), kg(8)]);
    // Sub with nothing logged keeps no learned defaults.
    expect(ss.esercizi![1].pesi_default).toBeUndefined();
  });
});

describe('effectiveSetWeight precedence', () => {
  const ex: Exercise = {
    id: 'a1',
    nome: 'Panca',
    serie: 3,
    recupero_sec: 90,
    peso_suggerito: kg(40),
    pesi_default: [kg(45), null, null],
    _pesi_serie: [kg(50), null, null],
  };
  it('prefers this-session override', () => {
    expect(effectiveSetWeight(ex, 0)).toEqual(kg(50));
  });
  it('falls back to carried default, then plan weight', () => {
    // set 1: no override, no default → plan weight
    expect(effectiveSetWeight(ex, 1)).toEqual(kg(40));
    // a set whose default exists but no override
    const ex2: Exercise = { ...ex, _pesi_serie: [null, null, null] };
    expect(effectiveSetWeight(ex2, 0)).toEqual(kg(45));
  });
});

describe('resolveFinalWeights', () => {
  it('resolves each set to its effective weight', () => {
    const ex: Exercise = {
      id: 'a1',
      nome: 'Panca',
      serie: 3,
      recupero_sec: 90,
      peso_suggerito: kg(40),
      pesi_default: [kg(45), null, null],
      _pesi_serie: [kg(50), null, null],
    };
    expect(resolveFinalWeights(ex, 3)).toEqual([kg(50), kg(40), kg(40)]);
  });
});

describe('date formatters (Intl-free)', () => {
  const d = new Date(2026, 0, 1, 14, 5); // 1 Jan 2026, 14:05 (Thursday)
  it('formatDate', () => {
    expect(formatDate(d)).toBe('1 gen 2026');
    expect(formatDate(d, { year: false })).toBe('1 gen');
  });
  it('formatTime pads to HH:MM', () => {
    expect(formatTime(d)).toBe('14:05');
  });
  it('formatDateTime', () => {
    expect(formatDateTime(d)).toBe('1 gen 2026, 14:05');
  });
  it('weekdayNarrow returns the Italian single letter', () => {
    expect(weekdayNarrow(d)).toBe('G'); // Thursday
  });
  it('handles invalid input gracefully', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDateTime('')).toBe('');
  });
});
