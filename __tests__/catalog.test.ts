import {
  CATALOG,
  getCatalogExercise,
  matchCatalog,
  mediaFrames,
  mediaSource,
  resolveCatalogId,
  searchCatalog,
} from '../src/catalog';
import { IT_ALIASES } from '../src/catalog/aliases';

describe('exercise catalog', () => {
  it('bundles the dataset and every alias points to a real exercise', () => {
    expect(CATALOG.length).toBeGreaterThan(800);
    for (const [id] of IT_ALIASES) expect(getCatalogExercise(id)).toBeDefined();
  });

  it('matches Italian names conservatively', () => {
    expect(matchCatalog('Panca piana')).toBe(
      'Barbell_Bench_Press_-_Medium_Grip',
    );
    expect(matchCatalog('Panca piana con manubri')).toBe(
      'Dumbbell_Bench_Press',
    );
    expect(matchCatalog('Lat machine presa stretta')).toBe(
      'Close-Grip_Front_Lat_Pulldown',
    );
    expect(matchCatalog('Squat')).toBe('Barbell_Squat');
    expect(matchCatalog('Esercizio inventato xyz')).toBeUndefined();
  });

  it('searches in Italian and English', () => {
    expect(searchCatalog('alzate lat')[0].id).toBe('Side_Lateral_Raise');
    expect(
      searchCatalog('bench press').some(
        e => e.id === 'Barbell_Bench_Press_-_Medium_Grip',
      ),
    ).toBe(true);
    expect(
      searchCatalog('', { cardio: true }).every(e => e.category === 'cardio'),
    ).toBe(true);
  });

  it('resolves loosely written ids and builds media urls', () => {
    expect(resolveCatalogId('Barbell Squat')).toBe('Barbell_Squat');
    expect(resolveCatalogId('barbell_squat')).toBe('Barbell_Squat');
    // Common exercises use the 3-frame line drawings of Workout Guide…
    expect(mediaSource('Barbell_Squat')).toEqual({
      kind: 'line',
      urls: [1, 2, 3].map(
        i =>
          `https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@1.0.0/assets/squat/frame-${i}.png`,
      ),
    });
    // …the others keep the free-exercise-db photos.
    expect(mediaSource('Barbell_Ab_Rollout')).toEqual({
      kind: 'photo',
      urls: [
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Ab_Rollout/0.jpg',
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Ab_Rollout/1.jpg',
      ],
    });
    expect(mediaFrames('Kettlebell_Halo')).toEqual([]);
    expect(mediaFrames(undefined)).toEqual([]);
  });
});
