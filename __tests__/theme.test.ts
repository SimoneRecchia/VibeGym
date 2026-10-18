import { buildPalette, dayColor, mix } from '../src/theme/colors';

describe('theme palette', () => {
  it('tints the dark background with the accent instead of pure black', () => {
    const c = buildPalette(true, 'blue');
    expect(c.bg).not.toBe('#000000');
    expect(c.bg).toMatch(/^#[0-9a-f]{6}$/);
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(c.accent2).not.toBe(c.accent);
  });

  it('gives every day its own vivid color, the first one is the accent', () => {
    const c = buildPalette(true, 'orange');
    expect(dayColor(0, c)).toBe(c.accent);
    const days = [1, 2, 3, 4].map(i => dayColor(i, c));
    expect(new Set(days).size).toBe(4);
    // No day repeats the orange accent.
    expect(days).not.toContain('#FF9230');
  });
});
