#!/usr/bin/env python3
"""Static integrity checks for PIXEL FORGE STUDIO v11.0."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent

class MarkupAudit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids: list[str] = []
        self.local_refs: list[tuple[str, str]] = []
        self.elements = 0
    def handle_starttag(self, tag, attrs):
        self.elements += 1
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        attr = 'src' if tag == 'script' else 'href' if tag in ('link', 'a') else None
        value = attrs.get(attr, '') if attr else ''
        if value and not value.startswith(('http://', 'https://', '#', 'data:', 'mailto:')):
            self.local_refs.append((tag, value.split('#', 1)[0].split('?', 1)[0]))

def check(condition: bool, message: str, failures: list[str]):
    print(('OK  ' if condition else 'FAIL') + message)
    if not condition:
        failures.append(message)

def main() -> int:
    failures: list[str] = []
    for filename in ['index.html', 'help.html', 'style.css', 'app.js', 'ui-enhance.js',
                     'compatibility.js', 'material-preview.js', 'psd-compat.js',
                     'water-worker.js', 'water-worker-v8.js', 'sw.js', 'manifest.webmanifest', 'BASELINE_IDS_v10.txt']:
        check((ROOT / filename).is_file(), f'必須ファイル: {filename}', failures)

    parser = MarkupAudit()
    parser.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
    counts = Counter(parser.ids)
    duplicates = [key for key, count in counts.items() if count > 1]
    check(not duplicates, f'index.html ID重複なし（{len(parser.ids)} IDs）', failures)
    baseline_file = ROOT / 'BASELINE_IDS_v10.txt'
    if baseline_file.is_file():
        baseline_ids = {line.strip() for line in baseline_file.read_text(encoding='utf-8').splitlines() if line.strip()}
        removed_ids = sorted(baseline_ids - set(parser.ids))
        check(not removed_ids, f'v10既存IDをすべて維持（{len(baseline_ids)} IDs）', failures)
    else:
        check(False, 'v10基準ID一覧が存在', failures)
    missing_refs = [ref for _, ref in parser.local_refs if ref and not (ROOT / ref).exists()]
    check(not missing_refs, f'index.html ローカル参照切れなし（{len(parser.local_refs)} refs）', failures)
    help_parser = MarkupAudit()
    help_parser.feed((ROOT / 'help.html').read_text(encoding='utf-8'))
    missing_help = [ref for _, ref in help_parser.local_refs if ref and not (ROOT / ref).exists()]
    check(not missing_help, f'help.html ローカル参照切れなし（{len(help_parser.local_refs)} refs）', failures)

    manifest = json.loads((ROOT / 'manifest.webmanifest').read_text(encoding='utf-8'))
    check('v11' in manifest.get('name', ''), 'manifest version v11', failures)
    sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
    sw_assets = re.findall(r"'\./([^']+)'", sw)
    missing_sw = [name for name in sw_assets if name not in {'.', ''} and not (ROOT / name).exists()]
    check(not missing_sw, f'Service Workerキャッシュ参照切れなし（{len(sw_assets)} entries）', failures)

    features = (ROOT / 'FEATURES_v11_JA.md').read_text(encoding='utf-8')
    numbered = re.findall(r'^\d+\. ', features, flags=re.M)
    check(len(numbered) >= 100, f'強化・維持チェック項目100以上（{len(numbered)}）', failures)
    check('brushPreset' in (ROOT / 'compatibility.js').read_text(encoding='utf-8'), '既存brushPreset同期コード', failures)
    check((ROOT / 'help.html').is_file() and len(re.findall(r'class="section"', (ROOT / 'help.html').read_text(encoding='utf-8'))) >= 10,
          '使い方サイトの主要セクション10以上', failures)

    node = shutil.which('node')
    if node:
        js_files = ['app.js', 'ui-enhance.js', 'compatibility.js', 'material-preview.js',
                    'psd-compat.js', 'water-worker.js', 'water-worker-v8.js', 'sw.js']
        for filename in js_files:
            result = subprocess.run([node, '--check', str(ROOT / filename)], capture_output=True, text=True)
            check(result.returncode == 0, f'JavaScript構文: {filename}', failures)
    else:
        print('SKIP Node.jsがないためJavaScript構文チェック')

    print('\n' + ('全チェック成功' if not failures else f'失敗 {len(failures)} 件'))
    return 0 if not failures else 1

if __name__ == '__main__':
    raise SystemExit(main())
