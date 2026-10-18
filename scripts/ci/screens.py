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


def find(label, timeout=20, scroll=False):
    end = time.time() + timeout
    swipes = 0
    while time.time() < end:
        for n in nodes():
            if label in (n['text'], n['desc']):
                return n
        if scroll and swipes < 4:
            # Below the fold: scroll the content up a bit.
            adb('shell', 'input', 'swipe', '540', '1700', '540', '700', '300')
            swipes += 1
        time.sleep(1)
    return None


def tap(label, timeout=20, scroll=False):
    n = find(label, timeout, scroll)
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
    # Like a Galaxy Z Flip 6 with a larger display size (≈ 3 px/dp).
    adb('shell', 'wm', 'density', '480')
    time.sleep(3)
    log('display', adb('shell', 'wm', 'size').strip(), '|', adb('shell', 'wm', 'density').strip())
    adb('shell', 'am', 'start', '-W', '-n', f'{PKG}/.MainActivity')
    find('VibeGym', timeout=90)

    if not tap('Iniziamo', timeout=40, scroll=True):
        shot('avvio')
        return
    if find('Più tardi', timeout=6):
        tap('Più tardi')

    tabs = ['Progressi', 'Scheda', 'Nutrizione']
    probe = Image.open(io.BytesIO(adb('exec-out', 'screencap', '-p', binary=True)))
    w, h = probe.size
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

    # Live workout with the demo plan.
    for _ in range(2):
        adb('shell', 'input', 'keyevent', '4')
        time.sleep(1)
    if not find('Scheda', timeout=5):
        adb('shell', 'am', 'start', '-W', '-n', f'{PKG}/.MainActivity')
    tap('Scheda')
    tap('Inizia')
    tap('Prova la scheda demo', scroll=True)
    time.sleep(2)
    if not tap('Inizia', timeout=10):
        return
    time.sleep(3)
    log('== Allenamento')
    shot('workout')
    tap('Serie 1 completata', scroll=True)
    time.sleep(1.5)
    shot('workout-serie')
    if tap('Modifica serie 2', scroll=True):
        shot('workout-modifica')
        adb('shell', 'input', 'keyevent', '4')
        time.sleep(1)
    adb('shell', 'input', 'swipe', '900', '1200', '150', '1200', '250')
    time.sleep(2)
    shot('workout-esercizio-2')


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
