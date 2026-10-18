/**
 * Mutations of the plan being edited (draft store). Each op clones the draft,
 * so screens re-render and "Annulla" can simply drop the draft.
 */
import { useDraft } from '../../data/draft';
import { Block, Exercise, Plan } from '../../core/types';
import { uid } from '../../core/ids';
import { newDay } from '../../plan/planUtils';

export const editDraft = (fn: (p: Plan) => void) => {
  const cur = useDraft.getState().editing;
  if (!cur) return;
  const next: Plan = JSON.parse(JSON.stringify(cur));
  fn(next);
  useDraft.setState({ editing: next });
};

export const findExercise = (
  p: Plan,
  dayId: string,
  blockId: string,
  exerciseId: string,
) => {
  const day = p.days.find(d => d.id === dayId);
  const bi = day?.blocks.findIndex(b => b.id === blockId) ?? -1;
  const block = bi >= 0 ? day!.blocks[bi] : undefined;
  const ei = block?.exercises.findIndex(e => e.id === exerciseId) ?? -1;
  return { day, block, bi, ei, ex: ei >= 0 ? block!.exercises[ei] : undefined };
};

const move = <T>(arr: T[], from: number, to: number) => {
  if (to < 0 || to >= arr.length) return;
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
};

export const ops = {
  addDay: () => editDraft(p => p.days.push(newDay(p.days.length))),
  renameDay: (dayId: string, name: string) =>
    editDraft(p => {
      const d = p.days.find(x => x.id === dayId);
      if (d) d.name = name;
    }),
  moveDay: (dayId: string, dir: -1 | 1) =>
    editDraft(p => {
      const i = p.days.findIndex(d => d.id === dayId);
      move(p.days, i, i + dir);
    }),
  duplicateDay: (dayId: string) =>
    editDraft(p => {
      const i = p.days.findIndex(d => d.id === dayId);
      if (i < 0) return;
      const d = p.days[i];
      p.days.splice(i + 1, 0, {
        id: uid('d'),
        name: `${d.name} (copia)`,
        blocks: d.blocks.map(b => ({
          id: uid('b'),
          exercises: b.exercises.map(e => ({ ...e, id: uid('e') })),
        })),
      });
    }),
  deleteDay: (dayId: string) =>
    editDraft(p => {
      p.days = p.days.filter(d => d.id !== dayId);
    }),

  addExercise: (dayId: string, ex: Exercise) =>
    editDraft(p => {
      const d = p.days.find(x => x.id === dayId);
      if (d) d.blocks.push({ id: uid('b'), exercises: [ex] });
    }),
  updateExercise: (
    dayId: string,
    blockId: string,
    exerciseId: string,
    fn: (e: Exercise) => void,
  ) =>
    editDraft(p => {
      const { ex } = findExercise(p, dayId, blockId, exerciseId);
      if (ex) fn(ex);
    }),
  deleteExercise: (dayId: string, blockId: string, exerciseId: string) =>
    editDraft(p => {
      const { day, block, bi, ei, ex } = findExercise(
        p,
        dayId,
        blockId,
        exerciseId,
      );
      if (!day || !block || !ex) return;
      const wasLast = ei === block.exercises.length - 1;
      block.exercises.splice(ei, 1);
      if (!block.exercises.length) {
        day.blocks.splice(bi, 1);
        return;
      }
      // The exercise closing the superset carried the round's rest: hand it over.
      const closing = block.exercises[block.exercises.length - 1];
      if (wasLast) closing.restSec = Math.max(closing.restSec, ex.restSec);
      if (block.exercises.length === 1 && !closing.restSec) closing.restSec = 90;
    }),
  duplicateExercise: (dayId: string, blockId: string, exerciseId: string) =>
    editDraft(p => {
      const { day, bi, ex } = findExercise(p, dayId, blockId, exerciseId);
      if (day && ex)
        day.blocks.splice(bi + 1, 0, {
          id: uid('b'),
          exercises: [{ ...ex, id: uid('e') }],
        });
    }),
  /** Move a whole block (single exercise or superset) up/down. */
  moveBlock: (dayId: string, blockId: string, dir: -1 | 1) =>
    editDraft(p => {
      const d = p.days.find(x => x.id === dayId);
      if (!d) return;
      const i = d.blocks.findIndex(b => b.id === blockId);
      move(d.blocks, i, i + dir);
    }),
  /** Merge a block into the previous one, creating (or extending) a superset. */
  mergeWithPrevious: (dayId: string, blockId: string) =>
    editDraft(p => {
      const d = p.days.find(x => x.id === dayId);
      if (!d) return;
      const i = d.blocks.findIndex(b => b.id === blockId);
      if (i <= 0) return;
      const prev: Block = d.blocks[i - 1];
      const cur = d.blocks[i];
      const rest =
        cur.exercises[cur.exercises.length - 1].restSec ||
        prev.exercises[prev.exercises.length - 1].restSec;
      prev.exercises.forEach(e => (e.restSec = 0));
      cur.exercises.forEach(
        (e, k) => (e.restSec = k === cur.exercises.length - 1 ? rest : 0),
      );
      prev.exercises.push(...cur.exercises);
      d.blocks.splice(i, 1);
    }),
  /** Split an exercise out of its superset into its own block. */
  splitFromSuperset: (dayId: string, blockId: string, exerciseId: string) =>
    editDraft(p => {
      const { day, block, bi, ei, ex } = findExercise(
        p,
        dayId,
        blockId,
        exerciseId,
      );
      if (!day || !block || !ex || block.exercises.length < 2) return;
      const wasLast = ei === block.exercises.length - 1;
      block.exercises.splice(ei, 1);
      if (wasLast)
        block.exercises[block.exercises.length - 1].restSec = ex.restSec;
      if (!ex.restSec) ex.restSec = 90;
      day.blocks.splice(bi + 1, 0, { id: uid('b'), exercises: [ex] });
    }),
};
