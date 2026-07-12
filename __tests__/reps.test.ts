/**
 * Tests for the strongly-typed {value, unit} reps model and its coercion from
 * legacy / loose inputs.
 */
import { coerceReps, formatReps, isTimedReps, repsToSeconds } from '../src/lib/format';
import { effectiveSetReps } from '../src/lib/helpers';

describe('coerceReps', () => {
  it('accepts plain numbers as times', () => {
    expect(coerceReps(12)).toEqual({ value: 12, unit: 'times' });
  });
  it('parses numeric strings', () => {
    expect(coerceReps('10')).toEqual({ value: 10, unit: 'times' });
  });
  it('collapses ranges to their max', () => {
    expect(coerceReps('8-10')).toEqual({ value: 10, unit: 'times' });
  });
  it('parses seconds and minutes', () => {
    expect(coerceReps('30s')).toEqual({ value: 30, unit: 'seconds' });
    expect(coerceReps('2min')).toEqual({ value: 2, unit: 'minutes' });
  });
  it('maps AMRAP / max to null', () => {
    expect(coerceReps('AMRAP')).toEqual({ value: null, unit: 'times' });
    expect(coerceReps('max')).toEqual({ value: null, unit: 'times' });
  });
  it('uses durata_sec when present', () => {
    expect(coerceReps(undefined, 45)).toEqual({ value: 45, unit: 'seconds' });
  });
  it('migrates the legacy tagged union', () => {
    expect(coerceReps({ kind: 'fixed', value: 8 })).toEqual({ value: 8, unit: 'times' });
    expect(coerceReps({ kind: 'range', min: 8, max: 12 })).toEqual({ value: 12, unit: 'times' });
    expect(coerceReps({ kind: 'amrap' })).toEqual({ value: null, unit: 'times' });
    expect(coerceReps({ kind: 'time', sec: 30 })).toEqual({ value: 30, unit: 'seconds' });
  });
  it('passes through the new shape and rounds to int', () => {
    expect(coerceReps({ value: 12, unit: 'times' })).toEqual({ value: 12, unit: 'times' });
    expect(coerceReps({ value: 30, unit: 'seconds' })).toEqual({ value: 30, unit: 'seconds' });
    expect(coerceReps({ value: null, unit: 'times' })).toEqual({ value: null, unit: 'times' });
  });
  it('returns undefined for junk', () => {
    expect(coerceReps('banana')).toBeUndefined();
    expect(coerceReps(undefined)).toBeUndefined();
  });
});

describe('formatReps', () => {
  it('formats each unit', () => {
    expect(formatReps({ value: 12, unit: 'times' })).toBe('12');
    expect(formatReps({ value: 30, unit: 'seconds' })).toBe('30s');
    expect(formatReps({ value: 2, unit: 'minutes' })).toBe('2min');
    expect(formatReps({ value: null, unit: 'times' })).toBe('AMRAP');
  });
});

describe('time-based helpers', () => {
  it('detects timed targets', () => {
    expect(isTimedReps({ value: 30, unit: 'seconds' })).toBe(true);
    expect(isTimedReps({ value: 2, unit: 'minutes' })).toBe(true);
    expect(isTimedReps({ value: 12, unit: 'times' })).toBe(false);
  });
  it('converts to seconds', () => {
    expect(repsToSeconds({ value: 30, unit: 'seconds' })).toBe(30);
    expect(repsToSeconds({ value: 2, unit: 'minutes' })).toBe(120);
    expect(repsToSeconds({ value: 12, unit: 'times' })).toBe(0);
  });
  it('an open-ended timed AMRAP is "timed" but has no duration', () => {
    // startExerciseTimer must guard on repsToSeconds > 0, else a 0s work timer
    // would fire instantly for these.
    expect(isTimedReps({ value: null, unit: 'seconds' })).toBe(true);
    expect(repsToSeconds({ value: null, unit: 'seconds' })).toBe(0);
  });
});

describe('effectiveSetReps', () => {
  const target = { value: 12, unit: 'times' as const };
  it('uses the logged override when present', () => {
    expect(effectiveSetReps(target, 9)).toBe(9);
  });
  it('falls back to the target when not logged', () => {
    expect(effectiveSetReps(target, null)).toBe(12);
    expect(effectiveSetReps(target, undefined)).toBe(12);
  });
});
