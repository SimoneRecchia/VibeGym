/**
 * Transient, in-memory state shared between screens of a flow (import
 * review, plan editor, exercise picker). Never persisted.
 */
import { create } from 'zustand';
import { Plan } from '../core/types';
import { ParsedPlan } from '../plan/aiFormat';

export interface PickResult {
  catalogId?: string;
  name: string;
}

interface DraftState {
  /** Plan parsed from an AI answer / file, waiting for review. */
  parsed: ParsedPlan | null;
  /** When set, the reviewed plan replaces this one (modify flow). */
  replacesPlanId: string | null;
  /** Plan being edited in the editor. */
  editing: Plan | null;
  /** Called by the exercise picker with the chosen exercise. */
  onPick: ((r: PickResult) => void) | null;
}

export const useDraft = create<DraftState>()(() => ({
  parsed: null,
  replacesPlanId: null,
  editing: null,
  onPick: null,
}));
