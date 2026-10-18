#!/usr/bin/env node
/**
 * Generates the app icon from one of the proposed concepts:
 *  - Android adaptive icon (vector foreground + gradient background +
 *    monochrome layer for themed icons), API 26+.
 *  - iOS 26 Liquid Glass icon: Icon Composer bundle ios/VibeGym/AppIcon.icon
 *    (background gradient in icon.json, glyph and accent as glass layers);
 *    Xcode renders the glass and derives icons for older iOS versions.
 *  - docs/icon/<concept>.svg: flat 1024 px artwork, and docs/icon/play-store.png
 *    (512 px, rendered with Chromium when available).
 *
 * Usage: node scripts/build-icon.js <manubrio|battito|disco|kettlebell|trend|monogramma|anello|neurale>
 *
 * Shapes are drawn on a 100 × 100 grid, centred.
 */
const fs = require('fs');
const path = require('path');

const R = (x, y, w, h, rx) => ({ t: 'rect', x, y, w, h, rx });
const C = (cx, cy, r) => ({ t: 'circle', cx, cy, r });
const P = (d, o = {}) => ({ t: 'path', d, ...o });
const S = (d, width) => ({
  t: 'path',
  d,
  stroke: width,
});
const SPARK = (cx, cy, r) => {
  const k = r * 0.09;
  return P(
    `M${cx} ${cy - r} C${cx + k} ${cy - r * 0.38} ${cx + r * 0.38} ${cy - k} ${
      cx + r
    } ${cy} ` +
      `C${cx + r * 0.38} ${cy + k} ${cx + k} ${cy + r * 0.38} ${cx} ${
        cy + r
      } ` +
      `C${cx - k} ${cy + r * 0.38} ${cx - r * 0.38} ${cy + k} ${
        cx - r
      } ${cy} ` +
      `C${cx - r * 0.38} ${cy - k} ${cx - k} ${cy - r * 0.38} ${cx} ${
        cy - r
      } Z`,
  );
};
const RING = (cx, cy, r, hole) =>
  P(
    `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${
      cx - r
    } ${cy} Z ` +
      `M${cx - hole} ${cy} A${hole} ${hole} 0 1 1 ${
        cx + hole
      } ${cy} A${hole} ${hole} 0 1 1 ${cx - hole} ${cy} Z`,
    { evenOdd: true },
  );

// bg: gradient top → bottom; glyph / accent colors; g: { scale, rotate, dx, dy }
const CONCEPTS = {
  manubrio: {
    bg: ['#55B4FF', '#0A5BFF'],
    glyph: '#FFFFFF',
    g: { scale: 0.86, rotate: -35 },
    shapes: [
      R(26, 46, 48, 8, 4),
      R(19, 29, 11, 42, 4.5),
      R(70, 29, 11, 42, 4.5),
      R(11, 36, 9, 28, 4),
      R(80, 36, 9, 28, 4),
    ],
  },
  battito: {
    bg: ['#FF8A73', '#E5243B'],
    glyph: '#FFFFFF',
    g: { scale: 0.9 },
    shapes: [
      R(12, 31, 10, 38, 4.5),
      R(22, 38, 7, 24, 3),
      R(78, 31, 10, 38, 4.5),
      R(71, 38, 7, 24, 3),
      S('M29 50 H39 L44.5 36 L52 65 L57.5 43 L61 50 H71', 5.5),
    ],
  },
  disco: {
    bg: ['#4A4A4E', '#121214'],
    glyph: '#FFFFFF',
    accent: '#D4FF3A',
    g: { scale: 0.94 },
    shapes: [RING(50, 50, 34, 13)],
    accentShapes: [SPARK(50, 50, 10)],
  },
  kettlebell: {
    bg: ['#8F7CFF', '#4B2BD6'],
    glyph: '#FFFFFF',
    g: { scale: 0.88, dx: -3, dy: -1 },
    // Wide, squat handle and a flat base: reads as a kettlebell, not a padlock.
    shapes: [
      S('M33 52 V37 Q33 24 46 24 H54 Q67 24 67 37 V52', 9),
      P('M38.13 82 A25 25 0 1 1 61.87 82 Z'),
    ],
    accentShapes: [SPARK(81, 18, 7.5)],
  },
  trend: {
    bg: ['#4ADE9F', '#047857'],
    glyph: '#FFFFFF',
    g: { scale: 0.94 },
    shapes: [
      R(20, 62, 15, 20, 5),
      R(42.5, 50, 15, 32, 5),
      R(65, 38, 15, 44, 5),
      S('M20 44 L38 31 L50 37 L73 18', 5),
      S('M62 17 H74 V29', 5),
    ],
  },
  monogramma: {
    bg: ['#2A2A2C', '#000000'],
    glyph: '#D4FF3A',
    g: { dy: 2 },
    shapes: [
      S('M28 28 L50 76 L72 28', 10),
      RING(28, 28, 12, 4),
      RING(72, 28, 12, 4),
    ],
  },
  anello: {
    bg: ['#FFC04D', '#FF5E00'],
    glyph: '#FFFFFF',
    g: { scale: 0.9 },
    shapes: [
      S('M50 18 A32 32 0 1 1 19.93 39.06', 9),
      R(37, 47.5, 26, 5, 2.5),
      R(31, 39, 7.5, 22, 3),
      R(61.5, 39, 7.5, 22, 3),
    ],
  },
  neurale: {
    bg: ['#41D8F8', '#5145F0'],
    glyph: '#FFFFFF',
    g: {},
    shapes: [
      S(
        'M24 31 V69 M76 31 V69 M24 31 L50 50 L24 69 M76 31 L50 50 L76 69 M30 50 H70',
        3.2,
      ),
      C(24, 31, 6),
      C(24, 50, 6),
      C(24, 69, 6),
      C(76, 31, 6),
      C(76, 50, 6),
      C(76, 69, 6),
      C(50, 50, 8),
    ],
  },
};

const key = process.argv[2];
const concept = CONCEPTS[key];
if (!concept) {
  console.error(
    `Usage: node scripts/build-icon.js <${Object.keys(CONCEPTS).join('|')}>`,
  );
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

const f = n => Number(n.toFixed(3));

const toPath = s => {
  if (s.t === 'path') return s.d;
  if (s.t === 'circle') {
    const { cx, cy, r } = s;
    return `M${f(cx - r)} ${cy} A${r} ${r} 0 1 0 ${f(
      cx + r,
    )} ${cy} A${r} ${r} 0 1 0 ${f(cx - r)} ${cy} Z`;
  }
  const { x, y, w, h } = s;
  const r = Math.min(s.rx, w / 2, h / 2);
  return (
    `M${f(x + r)} ${y} H${f(x + w - r)} A${r} ${r} 0 0 1 ${f(x + w)} ${f(
      y + r,
    )} ` +
    `V${f(y + h - r)} A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)} H${f(
      x + r,
    )} ` +
    `A${r} ${r} 0 0 1 ${x} ${f(y + h - r)} V${f(y + r)} A${r} ${r} 0 0 1 ${f(
      x + r,
    )} ${y} Z`
  );
};

const g = { scale: 1, rotate: 0, dx: 0, dy: 0, ...concept.g };
const svgTransform = `translate(${50 + g.dx} ${50 + g.dy}) rotate(${
  g.rotate
}) scale(${g.scale}) translate(-50 -50)`;

const svgShape = (s, color) =>
  s.stroke
    ? `<path d="${toPath(s)}" fill="none" stroke="${color}" stroke-width="${
        s.stroke
      }" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${toPath(s)}" fill="${color}"${
        s.evenOdd ? ' fill-rule="evenodd"' : ''
      }/>`;

/** SVG on a size × size canvas; `box` = side of the 100-grid inside it. */
const svg = ({ size, box, layers, background }) => {
  const k = box / 100;
  const off = (size - box) / 2;
  const defs = background
    ? `<defs><linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${background[0]}"/><stop offset="1" stop-color="${background[1]}"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : '';
  const body = layers
    .map(
      ({ shapes, color }) =>
        `<g transform="translate(${off} ${off}) scale(${k}) ${svgTransform}">${shapes
          .map(s => svgShape(s, color))
          .join('')}</g>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}${body}</svg>\n`;
};

/* ------------------------------------------------------------------ */
/*  Android                                                            */
/* ------------------------------------------------------------------ */

const RES = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

const vectorPaths = (shapes, color) =>
  shapes
    .map(s =>
      s.stroke
        ? `      <path android:pathData="${toPath(
            s,
          )}" android:strokeColor="${color}" android:strokeWidth="${
            s.stroke
          }" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000"/>`
        : `      <path android:pathData="${toPath(
            s,
          )}" android:fillColor="${color}"${
            s.evenOdd ? ' android:fillType="evenOdd"' : ''
          }/>`,
    )
    .join('\n');

// 100-grid → 72 dp centred in the 108 dp canvas: the drawing stays inside
// the 66 dp safe zone of every launcher mask.
const vector = layers => `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <group android:translateX="18" android:translateY="18" android:scaleX="0.72" android:scaleY="0.72">
    <group android:pivotX="50" android:pivotY="50" android:rotation="${
      g.rotate
    }"
        android:scaleX="${g.scale}" android:scaleY="${g.scale}"
        android:translateX="${g.dx}" android:translateY="${g.dy}">
${layers.map(l => vectorPaths(l.shapes, l.color)).join('\n')}
    </group>
  </group>
</vector>
`;

const accentLayer = concept.accentShapes
  ? [{ shapes: concept.accentShapes, color: concept.accent ?? concept.glyph }]
  : [];

write(
  path.join(RES, 'drawable', 'ic_launcher_foreground.xml'),
  vector([{ shapes: concept.shapes, color: concept.glyph }, ...accentLayer]),
);
write(
  path.join(RES, 'drawable', 'ic_launcher_monochrome.xml'),
  vector([
    {
      shapes: [...concept.shapes, ...(concept.accentShapes ?? [])],
      color: '#FFFFFFFF',
    },
  ]),
);
write(
  path.join(RES, 'drawable', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <path android:pathData="M0,0h108v108h-108z">
    <aapt:attr name="android:fillColor">
      <gradient
          android:type="linear"
          android:startX="0"
          android:startY="0"
          android:endX="38"
          android:endY="108"
          android:startColor="${concept.bg[0]}"
          android:endColor="${concept.bg[1]}"/>
    </aapt:attr>
  </path>
</vector>
`,
);
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;
write(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
// minSdk 26: the adaptive icon is always used, the old PNGs are dead weight.
for (const dpi of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'])
  fs.rmSync(path.join(RES, `mipmap-${dpi}`), { recursive: true, force: true });

/* ------------------------------------------------------------------ */
/*  iOS: Icon Composer bundle                                          */
/* ------------------------------------------------------------------ */

const IOS = path.join(__dirname, '..', 'ios', 'VibeGym', 'AppIcon.icon');
const srgb = hex =>
  `srgb:${[1, 3, 5]
    .map(i => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(5))
    .join(',')},1.00000`;
fs.rmSync(IOS, { recursive: true, force: true });
// Layers on the 1024 pt canvas; the glyph keeps the same proportions.
write(
  path.join(IOS, 'Assets', 'glyph.svg'),
  svg({
    size: 1024,
    box: 840,
    layers: [{ shapes: concept.shapes, color: concept.glyph }],
  }),
);
if (concept.accentShapes)
  write(
    path.join(IOS, 'Assets', 'accent.svg'),
    svg({
      size: 1024,
      box: 840,
      layers: [
        {
          shapes: concept.accentShapes,
          color: concept.accent ?? concept.glyph,
        },
      ],
    }),
  );
const layer = (name, file) => ({
  name,
  'image-name': file,
  glass: true,
  'fill-specializations': [
    { appearance: 'tinted', value: { solid: 'extended-gray:1.00000,1.00000' } },
  ],
});
const icon = {
  'fill-specializations': [
    {
      value: { 'linear-gradient': [srgb(concept.bg[0]), srgb(concept.bg[1])] },
    },
    {
      appearance: 'dark',
      value: {
        'linear-gradient': [
          'srgb:0.17000,0.17000,0.18000,1.00000',
          'srgb:0.05000,0.05000,0.06000,1.00000',
        ],
      },
    },
  ],
  groups: [
    ...(concept.accentShapes
      ? [
          {
            name: 'Accent',
            layers: [layer('accent', 'accent.svg')],
            lighting: 'combined',
            specular: true,
            shadow: { kind: 'layer-color', opacity: 0.5 },
            translucency: { enabled: true, value: 0.3 },
          },
        ]
      : []),
    {
      name: 'Glyph',
      layers: [
        {
          ...layer('glyph', 'glyph.svg'),
          'fill-specializations': [
            {
              appearance: 'dark',
              value: { 'automatic-gradient': srgb(concept.bg[0]) },
            },
            {
              appearance: 'tinted',
              value: { solid: 'extended-gray:1.00000,1.00000' },
            },
          ],
        },
      ],
      lighting: 'combined',
      specular: true,
      shadow: { kind: 'neutral', opacity: 0.5 },
      translucency: { enabled: true, value: 0.4 },
    },
  ],
  'supported-platforms': { squares: ['iOS'] },
};
write(path.join(IOS, 'icon.json'), JSON.stringify(icon, null, 2) + '\n');

// Xcode 26 builds every size (and older iOS versions) from the .icon bundle.
fs.rmSync(
  path.join(
    __dirname,
    '..',
    'ios',
    'VibeGym',
    'Images.xcassets',
    'AppIcon.appiconset',
  ),
  { recursive: true, force: true },
);

// Reference the bundle in the Xcode project (once).
const PBX = path.join(
  __dirname,
  '..',
  'ios',
  'VibeGym.xcodeproj',
  'project.pbxproj',
);
let pbx = fs.readFileSync(PBX, 'utf8');
if (!pbx.includes('AppIcon.icon')) {
  const FILE = 'A1C0B0010000000000000001';
  const BUILD = 'A1C0B0010000000000000002';
  const insertAfter = (marker, line) => {
    const at = pbx.indexOf(marker);
    if (at < 0) throw new Error(`project.pbxproj: "${marker}" not found`);
    const end = pbx.indexOf('\n', at) + 1;
    pbx = pbx.slice(0, end) + line + '\n' + pbx.slice(end);
  };
  insertAfter(
    '/* Begin PBXBuildFile section */',
    `\t\t${BUILD} /* AppIcon.icon in Resources */ = {isa = PBXBuildFile; fileRef = ${FILE} /* AppIcon.icon */; };`,
  );
  insertAfter(
    '/* Begin PBXFileReference section */',
    `\t\t${FILE} /* AppIcon.icon */ = {isa = PBXFileReference; lastKnownFileType = folder.iconcomposer.icon; name = AppIcon.icon; path = VibeGym/AppIcon.icon; sourceTree = "<group>"; };`,
  );
  insertAfter(
    '13B07FB51A68108700A75B9A /* Images.xcassets */,',
    `\t\t\t\t${FILE} /* AppIcon.icon */,`,
  );
  insertAfter(
    '13B07FBF1A68108700A75B9A /* Images.xcassets in Resources */,',
    `\t\t\t\t${BUILD} /* AppIcon.icon in Resources */,`,
  );
  fs.writeFileSync(PBX, pbx);
}

/* ------------------------------------------------------------------ */
/*  Flat artwork (Play Store 512 px, previews)                         */
/* ------------------------------------------------------------------ */

const DOCS = path.join(__dirname, '..', 'docs', 'icon');
const flat = svg({
  size: 1024,
  box: 760,
  background: concept.bg,
  layers: [{ shapes: concept.shapes, color: concept.glyph }, ...accentLayer],
});
write(path.join(DOCS, `${key}.svg`), flat);

// Play Store listing icon: 512 × 512 full-bleed PNG (Google applies the mask).
const chrome = [
  process.env.CHROME,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => p && fs.existsSync(p));
if (chrome) {
  const os = require('os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icon-'));
  const html = path.join(tmp, 'icon.html');
  fs.writeFileSync(
    html,
    `<html><body style="margin:0">${flat.replace(
      '<svg ',
      '<svg style="display:block;width:512px;height:512px" ',
    )}</body></html>`,
  );
  require('child_process').execFileSync(
    chrome,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=512,512',
      `--screenshot=${path.join(DOCS, 'play-store.png')}`,
      `file://${html}`,
    ],
    { stdio: 'ignore' },
  );
  fs.rmSync(tmp, { recursive: true, force: true });
} else {
  console.warn(
    'Chromium not found (set CHROME): docs/icon/play-store.png not updated',
  );
}

console.log(
  `Icon "${key}": Android adaptive icon, ios/VibeGym/AppIcon.icon, docs/icon/${key}.svg`,
);
