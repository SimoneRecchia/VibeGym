/**
 * Guards the contract between the AI prompt and the importer: the EXAMPLE_JSON
 * we tell the AI to mirror must parse, normalize and pass validation with ZERO
 * issues — otherwise a user following the prompt would hit import errors.
 */
import { EXAMPLE_JSON } from '../src/lib/prompt/schema';
import { normalizePlan } from '../src/lib/migrate';
import { validatePlan } from '../src/lib/validate';

describe('prompt schema example', () => {
  it('is valid JSON', () => {
    expect(() => JSON.parse(EXAMPLE_JSON)).not.toThrow();
  });

  it('normalizes and validates with zero issues', () => {
    const plan = normalizePlan(JSON.parse(EXAMPLE_JSON));
    const issues = validatePlan(plan);
    // Surface any offending fields if this ever regresses.
    expect(issues.map(i => `${i.field}: ${i.message}`)).toEqual([]);
  });

  it('keeps schema_version 2 and a non-empty giorni array', () => {
    const plan = normalizePlan(JSON.parse(EXAMPLE_JSON));
    expect(plan.schema_version).toBe(2);
    expect(plan.giorni.length).toBeGreaterThan(0);
    expect(Array.isArray(plan.storico)).toBe(true);
  });
});
