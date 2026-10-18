#!/usr/bin/env python3
"""
Drives the release APK on an Android emulator and saves screenshots and the
native view bounds, to check layout on a real Android renderer.

Usage: screens.py <apk> <out dir>

Writes <name>.png (full resolution) and screens.txt (log + view bounds).
"""
import io
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

from PIL import Image

PKG = 'com.vibegym'
OUT = 'screens'
LOG = []


def log(*parts):
    line = ' '.join(str(p) for p in parts)
    print(line, flush=True)
    LOG.append(line)


def adb(*args, binary=False, check=True):
    r = subprocess.run(['adb', *args], capture_output=True, check=check)
    return r.stdout if binary else r.stdout.decode(errors='replace')


def nodes():
    for _ in range(3):
        adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml', check=False)
        raw = adb('exec-out', 'cat', '/sdcard/ui.xml', binary=True, check=False)
        try:
            root = ET.fromstring(raw)
            break
        except ET.ParseError:
            time.sleep(1)
    else:
        return []
    out = []
    for n in root.iter('node'):
        b = [int(v) for v in re.findall(r'\d+', n.get('bounds', ''))]
        if len(b) == 4:
            out.append({
                'text': n.get('text', ''),
                'desc': n.get('content-desc', ''),
                'cls': n.get('class', '').split('.')[-1],
                'bounds': b,
            })
    return out


def find(label, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        for n in nodes():
            if label in (n['text'], n['desc']):
                return n
        time.sleep(1)
    return None


def tap(label, timeout=20):
    n = find(label, timeout)
    if not n:
        log(f'!! "{label}" non trovato')
        return False
    x1, y1, x2, y2 = n['bounds']
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
    time.sleep(2)
    return True


def shot(name, crops=()):
    """Full screen (half size) plus full-resolution crops (x1, y1, x2, y2)."""
    time.sleep(1.5)
    img = Image.open(io.BytesIO(adb('exec-out', 'screencap', '-p', binary=True)))
    img.resize((img.width // 2, img.height // 2)).save(os.path.join(OUT, f'{name}.png'))
    for i, box in enumerate(crops):
        img.crop(box).save(os.path.join(OUT, f'{name}-crop{i}.png'))
    log('shot', name)


def bounds(labels):
    for n in nodes():
        if n['text'] in labels or n['desc'] in labels:
            log(f"   {n['cls']:<22} {n['text'] or n['desc']!r:<28} {n['bounds']}")


def main(apk):
    log('install', adb('install', '-r', '-g', apk).strip())
    adb('shell', 'cmd', 'uimode', 'night', 'yes')
    # Galaxy Z Flip 6 with a larger display size (≈ 3 px/dp).
    adb('shell', 'wm', 'size', '1080x2640')
    adb('shell', 'wm', 'density', '480')
    adb('shell', 'am', 'start', '-W', '-n', f'{PKG}/.MainActivity')

    if not tap('Iniziamo', timeout=90):
        shot('avvio')
        return
    if find('Più tardi', timeout=6):
        tap('Più tardi')

    tabs = ['Progressi', 'Scheda', 'Nutrizione']
    w, h = 1080, 2640
    bar = (0, h - 420, w, h)
    for t in ['Scheda', 'Progressi', 'Nutrizione']:
        tap(t)
        log(f'== {t}')
        bounds(tabs)
        shot(f'tab-{t.lower()}', [bar])

    tap('Profilo e impostazioni')
    tap('Nutrizione')
    log('== Impostazioni nutrizione')
    seg = ['Dimagrire', 'Mantenere', 'Massa', 'Calcolate', 'Fisse', 'Percentuali', 'Grammi']
    bounds(seg)
    shot('segmented')


if __name__ == '__main__':
    OUT = sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    try:
        main(sys.argv[1])
    except Exception as e:  # keep what was captured so far
        log('!! errore:', repr(e))
        try:
            shot('errore')
        except Exception:
            pass
    with open(os.path.join(OUT, 'screens.txt'), 'w') as f:
        f.write('\n'.join(LOG) + '\n')
