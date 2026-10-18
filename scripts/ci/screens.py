#!/usr/bin/env python3
"""
Drives the release APK on an Android emulator and writes screenshots and the
native view bounds to the job log, to check layout on a real Android renderer.

Usage: screens.py <apk>

Each image is printed as base64 JPEG between "@@IMG <name>" and "@@END".
"""
import base64
import io
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

from PIL import Image

PKG = 'com.vibegym'


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
        print(f'!! "{label}" non trovato')
        return False
    x1, y1, x2, y2 = n['bounds']
    adb('shell', 'input', 'tap', str((x1 + x2) // 2), str((y1 + y2) // 2))
    time.sleep(2)
    return True


def emit(name, img, quality=82):
    buf = io.BytesIO()
    img.convert('RGB').save(buf, 'JPEG', quality=quality)
    data = base64.b64encode(buf.getvalue()).decode()
    print(f'@@IMG {name} {img.width}x{img.height}')
    for i in range(0, len(data), 4000):
        print(data[i:i + 4000])
    print('@@END')


def shot(name, crops=()):
    """Full screen at 40 %, plus full-resolution crops (x1, y1, x2, y2)."""
    time.sleep(1.5)
    img = Image.open(io.BytesIO(adb('exec-out', 'screencap', '-p', binary=True)))
    emit(name, img.resize((img.width * 2 // 5, img.height * 2 // 5)), 70)
    for i, box in enumerate(crops):
        emit(f'{name}-crop{i}', img.crop(box), 90)


def bounds(labels):
    for n in nodes():
        if n['text'] in labels or n['desc'] in labels:
            print(f"   {n['cls']:<22} {n['text'] or n['desc']!r:<28} {n['bounds']}")


def main(apk):
    adb('install', '-r', '-g', apk)
    adb('shell', 'cmd', 'uimode', 'night', 'yes')
    # Galaxy Z Flip 6 with a larger display size (≈ 3 px/dp).
    adb('shell', 'wm', 'size', '1080x2640')
    adb('shell', 'wm', 'density', '480')
    adb('shell', 'am', 'start', '-W', '-n', f'{PKG}/.MainActivity')

    if not tap('Iniziamo', timeout=90):
        shot('avvio')
        sys.exit(1)
    if find('Più tardi', timeout=6):
        tap('Più tardi')

    tabs = ['Progressi', 'Scheda', 'Nutrizione']
    w, h = 1080, 2640
    bar = (0, h - 420, w, h)
    for t in ['Scheda', 'Progressi', 'Nutrizione']:
        tap(t)
        print(f'== {t}')
        bounds(tabs)
        shot(f'tab-{t.lower()}', [bar])

    tap('Profilo e impostazioni')
    tap('Nutrizione')
    print('== Impostazioni nutrizione')
    seg = ['Dimagrire', 'Mantenere', 'Massa', 'Calcolate', 'Fisse', 'Percentuali', 'Grammi']
    bounds(seg)
    shot('segmented')


if __name__ == '__main__':
    main(sys.argv[1])
