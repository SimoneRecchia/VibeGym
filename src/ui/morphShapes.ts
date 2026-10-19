/**
 * Filled silhouettes on a 24pt grid, drawn so they can morph into each
 * other (MorphIcon). A shape is one outline, or a list of separate pieces.
 */
export type MorphShape = string | string[];

export const MORPH = {
  /** Plates and bar as one outline. */
  dumbbell:
    'M1.5 10.2Q1.5 9 2.7 9H4V7.7Q4 6.5 5.2 6.5H6.3Q7.5 6.5 7.5 7.7V11H16.5V7.7Q16.5 6.5 17.7 6.5H18.8Q20 6.5 20 7.7V9H21.3Q22.5 9 22.5 10.2V13.8Q22.5 15 21.3 15H20V16.3Q20 17.5 18.8 17.5H17.7Q16.5 17.5 16.5 16.3V13H7.5V16.3Q7.5 17.5 6.3 17.5H5.2Q4 17.5 4 16.3V15H2.7Q1.5 15 1.5 13.8Z',
  /**
   * Body with the two bells and the feet in one outline: a single shape
   * morphs like a drop, pieces would split into shards.
   */
  alarm:
    'M15.13 6.49C16.4 3.2 19.9 2.4 21.1 4.9C22.1 6.9 20.7 8.7 18.41 9.5A7.4 7.4 0 0 1 16.76 18.87L18.3 21.7L17 22.4L15.13 19.91A7.4 7.4 0 0 1 8.87 19.91L7 22.4L5.7 21.7L7.24 18.87A7.4 7.4 0 0 1 5.59 9.5C3.3 8.7 1.9 6.9 2.9 4.9C4.1 2.4 7.6 3.2 8.87 6.49A7.4 7.4 0 0 1 15.13 6.49Z',
} satisfies Record<string, MorphShape>;

/** Clock hands, cut out of the alarm body. */
export const ALARM_HANDS = 'M12 9.6V13.4L14.6 15';

export type MorphName = keyof typeof MORPH;
