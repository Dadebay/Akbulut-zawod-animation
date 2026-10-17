#!/usr/bin/env python3
# Run with sudo on the server after prepare-nginx.sh.
# The insertion anchor is the existing include shown in the server transcript.
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

site = Path('/etc/nginx/sites-enabled/akbulut.com.tm').resolve(strict=True)
snippet = Path('/etc/nginx/snippets/akbulut-zawod.conf')
if not snippet.is_file():
    raise SystemExit('Ek ayar bulunamadı. Önce prepare-nginx.sh çalıştır.')
subprocess.run(['nginx', '-t'], check=True)
original = site.read_bytes()
include = b'include /etc/nginx/snippets/akbulut-zawod.conf;'
if re.search(rb'(?m)^[ \t]*' + re.escape(include) + rb'[ \t]*(?:#.*)?$', original):
    print('Satır zaten var; tekrar eklenmedi.', flush=True)
else:
    matches = list(re.finditer(rb'(?m)^([ \t]*)include[ \t]+/etc/nginx/snippets/load\.conf;[ \t]*$', original))
    if len(matches) != 1:
        raise SystemExit('Eklenecek yer tek olarak bulunamadı. Ayarlar değiştirilmedi.')
    match = matches[0]
    updated = original[:match.end()] + b'\n' + match[1] + include + original[match.end():]
    backup = Path(tempfile.mkdtemp(prefix='akbulut-zawod-', dir='/var/backups')) / 'site.conf'
    shutil.copy2(site, backup)
    print('Yedek:', backup, flush=True)
    if site.read_bytes() != original:
        raise SystemExit('Site ayarı işlem sırasında değişti. Üzerine yazılmadı.')
    try:
        site.write_bytes(updated)
        subprocess.run(['nginx', '-t'], check=True)
    except BaseException:
        shutil.copy2(backup, site)
        print('Hata: önceki ayar geri yüklendi; nginx yeniden yüklenmedi.', flush=True)
        raise
subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
print('Hazır: https://akbulut.com.tm/zawod/', flush=True)
