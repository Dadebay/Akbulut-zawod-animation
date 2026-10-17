#!/usr/bin/env bash
# Run on the server with nginx-zawod.conf in the same directory.
# Creates a backup and an inactive snippet. Never edits the site configuration.
set -euo pipefail

fail() { printf '%s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || fail 'Sunucuda sudo bash prepare-nginx.sh ile çalıştır.'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$SCRIPT_DIR/nginx-zawod.conf"
SITE='/etc/nginx/sites-enabled/akbulut.com.tm'
SNIPPET='/etc/nginx/snippets/akbulut-zawod.conf'

[[ -f "$SOURCE" ]] || fail "Ek ayar bulunamadı: $SOURCE"
[[ -f "$SITE" ]] || fail "Site ayarı bulunamadı: $SITE. Hiçbir ayar değiştirilmedi."
[[ -f /var/www/zawod/index.html ]] || fail 'Önce dist/ içeriğini /var/www/zawod/ klasörüne yükle.'
[[ ! -L "$SNIPPET" ]] || fail "Ek ayar yolu bir sembolik bağlantı: $SNIPPET. İşlem durduruldu."

if [[ -e "$SNIPPET" ]] && ! cmp -s -- "$SOURCE" "$SNIPPET"; then
    fail "Farklı bir ek ayar zaten var: $SNIPPET. Üzerine yazılmadı."
fi

# Stop before installing anything if the current configuration already fails.
nginx -t

# Backups stay outside nginx's configuration include directories.
mkdir -p /var/backups
BACKUP_DIR="$(mktemp -d /var/backups/akbulut-zawod.XXXXXXXX)"
cp -L --preserve=mode,ownership,timestamps -- "$SITE" "$BACKUP_DIR/site.conf"

mkdir -p /etc/nginx/snippets
if [[ ! -e "$SNIPPET" ]]; then
    # noclobber also protects a file created between the check and this write.
    (set -o noclobber; umask 022; cat -- "$SOURCE" > "$SNIPPET")
fi
cmp -s -- "$SOURCE" "$SNIPPET" || fail 'Ek ayar kopyası doğrulanamadı. Site ayarı değiştirilmedi.'

printf '\nYedek: %s/site.conf\n' "$BACKUP_DIR"
printf 'Ek ayar: %s\n' "$SNIPPET"
printf '\nMevcut site dosyası değiştirilmedi; nginx yeniden yüklenmedi.\n'
printf '\nŞimdi aç: sudo nano %s\n' "$SITE"
printf 'akbulut.com.tm için HTTPS server { } bloğuna, location dışında, yalnızca bir kez ekle:\n\n'
printf '    include /etc/nginx/snippets/akbulut-zawod.conf;\n\n'
printf 'Kaydet: Ctrl+O, Enter. Çık: Ctrl+X. Ardından çalıştır:\n\n'
printf '    sudo nginx -t && sudo systemctl reload nginx\n'
