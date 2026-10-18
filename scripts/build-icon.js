#!/usr/bin/env node
/**
 * Generates the app icon (dumbbell) in every color offered in Impostazioni:
 *  - Android: adaptive icons (vector foreground + gradient background +
 *    monochrome layer for themed icons) and one launcher activity-alias per
 *    color in AndroidManifest.xml (the app enables one of them).
 *  - iOS 26: Icon Composer bundles (Liquid Glass): ios/VibeGym/AppIcon.icon
 *    for the default color, AppIcon-<color>.icon as alternate icons. Xcode
 *    renders the glass and derives icons for older iOS versions.
 *  - src/ui/appIcons.json: shapes and colors for the in-app picker.
 *  - docs/icon/manubrio.svg and docs/icon/play-store.png (512 px, rendered
 *    with Chromium when available).
 *
 * Usage: node scripts/build-icon.js
 *
 * Shapes are drawn on a 100 × 100 grid, centred.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Rounded rect; `alpha` < 1 sets a plate apart from its neighbour.
const R = (x, y, w, h, rx, alpha = 1) => ({ x, y, w, h, rx, alpha });

// Dumbbell, rotated as if lifted: bar, inner and outer plates.
const GLYPH = {
  transform: { scale: 0.86, rotate: -35, dx: 0, dy: 0 },
  shapes: [
    R(26, 46, 48, 8, 4),
    R(19, 29, 11, 42, 4.5),
    R(70, 29, 11, 42, 4.5),
    R(11, 36, 9, 28, 4, 0.82),
    R(80, 36, 9, 28, 4, 0.82),
  ],
};

// Background gradient top → bottom. The first one is the default icon.
const COLORS = [
  { key: 'blu', label: 'Blu', bg: ['#55B4FF', '#0A5BFF'] },
  { key: 'viola', label: 'Viola', bg: ['#8F7CFF', '#4B2BD6'] },
  { key: 'rosa', label: 'Rosa', bg: ['#FF8FC4', '#E0287A'] },
  { key: 'rosso', label: 'Rosso', bg: ['#FF8A73', '#E5243B'] },
  { key: 'arancione', label: 'Arancione', bg: ['#FFC04D', '#FF5E00'] },
  { key: 'giallo', label: 'Giallo', bg: ['#FFDD55', '#F2A200'] },
  { key: 'verde', label: 'Verde', bg: ['#5BE3A5', '#059669'] },
  { key: 'azzurro', label: 'Azzurro', bg: ['#5EE7F2', '#0891B2'] },
  { key: 'grafite', label: 'Grafite', bg: ['#5A5A60', '#141416'] },
];
const DEFAULT = COLORS[0];

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

const f = n => Number(n.toFixed(3));

const toPath = ({ x, y, w, h, rx }) => {
  const r = Math.min(rx, w / 2, h / 2);
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
const PATHS = GLYPH.shapes.map(s => ({ d: toPath(s), alpha: s.alpha }));

const g = GLYPH.transform;
const svgTransform = `translate(${50 + g.dx} ${50 + g.dy}) rotate(${
  g.rotate
}) scale(${g.scale}) translate(-50 -50)`;

/** SVG on a size × size canvas; `box` = side of the 100-grid inside it. */
const svg = ({ size, box, background, solid }) => {
  const k = box / 100;
  const off = (size - box) / 2;
  const defs = background
    ? `<defs><linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${background[0]}"/><stop offset="1" stop-color="${background[1]}"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : '';
  const body = PATHS.map(
    p =>
      `<path d="${p.d}" fill="#FFFFFF"${
        !solid && p.alpha < 1 ? ` fill-opacity="${p.alpha}"` : ''
      }/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${defs}<g transform="translate(${off} ${off}) scale(${k}) ${svgTransform}">${body}</g></svg>\n`;
};

const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

/* ------------------------------------------------------------------ */
/*  Android                                                            */
/* ------------------------------------------------------------------ */

const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const suffix = c => (c === DEFAULT ? '' : `_${c.key}`);

// 100-grid → 72 dp centred in the 108 dp canvas: the drawing stays inside
// the 66 dp safe zone of every launcher mask.
const vector = (color, solid) => `<?xml version="1.0" encoding="utf-8"?>
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
${PATHS.map(
  p =>
    `      <path android:pathData="${p.d}" android:fillColor="${color}"${
      !solid && p.alpha < 1 ? ` android:fillAlpha="${p.alpha}"` : ''
    }/>`,
).join('\n')}
    </group>
  </group>
</vector>
`;

const background = c => `<?xml version="1.0" encoding="utf-8"?>
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
          android:startColor="${c.bg[0]}"
          android:endColor="${c.bg[1]}"/>
    </aapt:attr>
  </path>
</vector>
`;

const adaptive = c => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background${suffix(
      c,
    )}"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
`;

for (const name of fs.readdirSync(path.join(RES, 'drawable')))
  if (/^ic_launcher_background_/.test(name))
    fs.rmSync(path.join(RES, 'drawable', name));
fs.rmSync(path.join(RES, 'mipmap-anydpi-v26'), {
  recursive: true,
  force: true,
});

write(
  path.join(RES, 'drawable', 'ic_launcher_foreground.xml'),
  vector('#FFFFFF'),
);
write(
  path.join(RES, 'drawable', 'ic_launcher_monochrome.xml'),
  vector('#FFFFFFFF', true),
);
for (const c of COLORS) {
  write(
    path.join(RES, 'drawable', `ic_launcher_background${suffix(c)}.xml`),
    background(c),
  );
  write(
    path.join(RES, 'mipmap-anydpi-v26', `ic_launcher${suffix(c)}.xml`),
    adaptive(c),
  );
}
// The manifest's roundIcon.
write(
  path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'),
  adaptive(DEFAULT),
);

// Launcher aliases, between the markers in the manifest.
const MANIFEST = path.join(
  ROOT,
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
);
const START = '<!-- icon-aliases:start (scripts/build-icon.js) -->';
const END = '<!-- icon-aliases:end -->';
const cap = k => k.charAt(0).toUpperCase() + k.slice(1);
const aliases = COLORS.map(
  c => `      <activity-alias
        android:name=".Icon${cap(c.key)}"
        android:targetActivity=".MainActivity"
        android:icon="@mipmap/ic_launcher${suffix(c)}"
        android:roundIcon="@mipmap/ic_launcher${suffix(c)}"
        android:enabled="${c === DEFAULT}"
        android:exported="true">
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent-filter>
      </activity-alias>`,
).join('\n');
let manifest = fs.readFileSync(MANIFEST, 'utf8');
const a = manifest.indexOf(START);
const b = manifest.indexOf(END);
if (a < 0 || b < 0)
  throw new Error('AndroidManifest.xml: icon-aliases markers not found');
manifest = `${manifest.slice(
  0,
  a + START.length,
)}\n${aliases}\n      ${manifest.slice(b)}`;
fs.writeFileSync(MANIFEST, manifest);

/* ------------------------------------------------------------------ */
/*  iOS: Icon Composer bundles                                         */
/* ------------------------------------------------------------------ */

const IOS = path.join(ROOT, 'ios', 'VibeGym');
const iconName = c => (c === DEFAULT ? 'AppIcon' : `AppIcon-${c.key}`);
const srgb = hex =>
  `srgb:${[1, 3, 5]
    .map(i => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(5))
    .join(',')},1.00000`;

for (const name of fs.readdirSync(IOS))
  if (/^AppIcon(-[a-z]+)?\.icon$/.test(name))
    fs.rmSync(path.join(IOS, name), { recursive: true, force: true });

for (const c of COLORS) {
  const dir = path.join(IOS, `${iconName(c)}.icon`);
  // Layers on the 1024 pt canvas.
  write(
    path.join(dir, 'Assets', 'glyph.svg'),
    svg({ size: 1024, box: 840, solid: true }),
  );
  const icon = {
    'fill-specializations': [
      { value: { 'linear-gradient': [srgb(c.bg[0]), srgb(c.bg[1])] } },
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
      {
        name: 'Glyph',
        layers: [
          {
            name: 'glyph',
            'image-name': 'glyph.svg',
            glass: true,
            'fill-specializations': [
              {
                appearance: 'dark',
                value: { 'automatic-gradient': srgb(c.bg[0]) },
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
  write(path.join(dir, 'icon.json'), JSON.stringify(icon, null, 2) + '\n');
}

// Xcode 26 builds every size from the .icon bundles.
fs.rmSync(path.join(IOS, 'Images.xcassets', 'AppIcon.appiconset'), {
  recursive: true,
  force: true,
});

// Xcode project: one file reference + resource per bundle, alternate icons.
const PBX = path.join(ROOT, 'ios', 'VibeGym.xcodeproj', 'project.pbxproj');
let pbx = fs.readFileSync(PBX, 'utf8');
pbx = pbx
  .split('\n')
  .filter(
    l =>
      !/AppIcon(-[a-z]+)?\.icon/.test(l) && !/ALTERNATE_APPICON_NAMES/.test(l),
  )
  .join('\n');
const insertAfter = (marker, lines) => {
  let at = pbx.indexOf(marker);
  if (at < 0) throw new Error(`project.pbxproj: "${marker}" not found`);
  while (at >= 0) {
    const end = pbx.indexOf('\n', at) + 1;
    pbx = pbx.slice(0, end) + lines + pbx.slice(end);
    at = pbx.indexOf(marker, end + lines.length);
  }
};
const id = (i, kind) =>
  `A1C0B001${'0'.repeat(12)}${String(i).padStart(3, '0')}${kind}`;
const items = COLORS.map((c, i) => ({
  name: `${iconName(c)}.icon`,
  file: id(i, '1'),
  build: id(i, '2'),
}));
insertAfter(
  '/* Begin PBXBuildFile section */',
  items
    .map(
      x =>
        `\t\t${x.build} /* ${x.name} in Resources */ = {isa = PBXBuildFile; fileRef = ${x.file} /* ${x.name} */; };\n`,
    )
    .join(''),
);
insertAfter(
  '/* Begin PBXFileReference section */',
  items
    .map(
      x =>
        `\t\t${x.file} /* ${x.name} */ = {isa = PBXFileReference; lastKnownFileType = folder.iconcomposer.icon; name = ${x.name}; path = VibeGym/${x.name}; sourceTree = "<group>"; };\n`,
    )
    .join(''),
);
insertAfter(
  '13B07FB51A68108700A75B9A /* Images.xcassets */,',
  items.map(x => `\t\t\t\t${x.file} /* ${x.name} */,\n`).join(''),
);
insertAfter(
  '13B07FBF1A68108700A75B9A /* Images.xcassets in Resources */,',
  items.map(x => `\t\t\t\t${x.build} /* ${x.name} in Resources */,\n`).join(''),
);
insertAfter(
  'ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;',
  `\t\t\t\tASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "${COLORS.filter(
    c => c !== DEFAULT,
  )
    .map(iconName)
    .join(' ')}";\n`,
);
fs.writeFileSync(PBX, pbx);

/* ------------------------------------------------------------------ */
/*  In-app picker, Play Store artwork                                  */
/* ------------------------------------------------------------------ */

write(
  path.join(ROOT, 'src', 'ui', 'appIcons.json'),
  JSON.stringify(
    {
      default: DEFAULT.key,
      transform: svgTransform,
      paths: PATHS,
      colors: COLORS.map(({ key, label, bg }) => ({ key, label, bg })),
    },
    null,
    2,
  ) + '\n',
);

const DOCS = path.join(ROOT, 'docs', 'icon');
fs.rmSync(DOCS, { recursive: true, force: true });
const flat = svg({ size: 1024, box: 760, background: DEFAULT.bg });
write(path.join(DOCS, 'manubrio.svg'), flat);

// Play Store listing icon: 512 × 512 full-bleed PNG (Google applies the mask).
const chrome = [
  process.env.CHROME,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  '/opt/pw-browsers/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => p && fs.existsSync(p));
if (chrome) {
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
  `Icon: ${COLORS.length} colors (default ${DEFAULT.key}) for Android, iOS and the in-app picker`,
);
