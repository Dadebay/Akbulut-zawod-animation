# Sunucu için hazır çıktı

Mevcut admin projesinin `deploy/deploy_panel.sh` dosyası sunucuyu
`ubuntu@216.250.11.77`, alan adını `akbulut.com.tm` olarak tanımlıyor.
Bu uygulamanın hazırlanan adresi **https://akbulut.com.tm/zawod/**,
dosya konumu **/var/www/zawod/**. Mevcut `/panel/` uygulaması ayrı kalır.

## Derleme

Node.js 22.12+ veya 24 LTS:

```bash
npm ci
npm run build:server
```

Yüklenecek içerik `dist/` klasörüdür. Logolar, altı TV görseli,
üretim resimleri ve 3D kamyon modeli bu çıktıya dahildir. `.gz` dosyaları
nginx için hazırlanır. Sunucuda Node/Vite çalıştırılması gerekmez.
Yeni derlemede önceki `.gz` dosyaları da yenilenir.

## Senin yapacağın dağıtım

### 1. Mac: uygulama dosyalarını yükle

```bash
cd /Users/dadebay/Developer/apps/projects/rasiya/akbulut-monitor
rsync -avz --progress dist/ ubuntu@216.250.11.77:/var/www/zawod/
```

Bu komut yalnızca `/var/www/zawod/` içindeki aynı adlı dosyaları günceller ve
yeni dosyalar ekler. `--delete` içermez; `/etc/nginx/` ayarlarına dokunmaz.
Bunu zaten yaptıysan 2. adımdan devam et.

### 2. Mac: ayrı ek ayarı ve hazırlık dosyasını gönder

```bash
scp deploy/nginx-zawod.conf deploy/prepare-nginx.sh deploy/enable-nginx.py ubuntu@216.250.11.77:/tmp/
ssh ubuntu@216.250.11.77
```

### 3. Sunucu: mevcut siteyi yedekle ve ek dosyayı hazırla

```bash
sudo bash /tmp/prepare-nginx.sh
```

Bu yardımcı dosya önce mevcut `nginx -t` kontrolünü çalıştırır. Başarılıysa
site ayarının yedeğini `/var/backups/akbulut-zawod.XXXXXXXX/site.conf` içine alır
ve `/etc/nginx/snippets/akbulut-zawod.conf` dosyasını oluşturur.
Mevcut site ayarını değiştirmez ve nginx'i yeniden yüklemez.
Aynı isimde farklı içerikli bir ek ayar varsa üzerine yazmadan durur.
Hata çıkarsa kalan adımlara geçmeden çıktıyı incele.

### 4. Sunucu: mevcut HTTPS site bloğuna tek satır ekle

Otomatik eklemek ve kontrol başarılıysa etkinleştirmek için:

```bash
sudo python3 /tmp/enable-nginx.py
```

Bu komut, paylaşılan sunucu çıktısındaki `include /etc/nginx/snippets/load.conf;`
satırını tek olarak bulursa hemen altına yeni include satırını ekler. Önce yedek
alır; diğer satırları, dosya izinlerini ve site sembolik bağlantısını korur.
Satır zaten varsa tekrar eklemez. Ekleme sonrası `nginx -t` başarısızsa
önceki dosyayı geri yükler; başarılıysa nginx'i yeniden yükler.
Komut başarıyla tamamlanırsa yayın adresini açabilirsin; aşağıdaki elle
düzenleme ve yeniden yükleme adımlarına gerek kalmaz.

Elle eklemek istersen:

```bash
sudo nano /etc/nginx/sites-enabled/akbulut.com.tm
```

`akbulut.com.tm` alan adına ait, `listen 443 ssl` bulunan `server { }` bloğunun
içine, `location` bloklarının dışında, şu satırı yalnızca bir kez ekle:

```nginx
include /etc/nginx/snippets/akbulut-zawod.conf;
```

Mevcut satırları koru. `nginx-zawod.conf` bir ek dosyadır; ana `nginx.conf`
veya mevcut site dosyası yerine kopyalanmaz. Kaydet: Ctrl+O, Enter; çık: Ctrl+X.

### 5. Sunucu: kontrol et ve etkinleştir

```bash
sudo nginx -t && sudo systemctl reload nginx
```

`&&` nedeniyle kontrol başarısızsa yeniden yükleme çalışmaz. Başarılıysa
`https://akbulut.com.tm/zawod/` adresini, Paneller galerisini, enjam ayrıntılarını
ve TIR yakın görünümünü kontrol et. Yalnızca uygulama dosyaları güncellendiğinde
tekrar derleme ve 1. adımdaki rsync yeterlidir; Nginx adımları tekrarlanmaz.

Bu hazırlık sunucuya bağlanmaz ve dağıtım yapmaz. nginx dosyası mevcut yerel
deploy yapılandırmasına göre hazırlandı; canlı sunucudaki yapılandırma ile
birleştirme ve `nginx -t` kontrolü dağıtım sırasında yapılır.

## Yerel üretim önizlemesi

```bash
npm run preview -- --base=/zawod/ --port 5180
```

Adres: http://127.0.0.1:5180/zawod/

Farklı alt dizin için: `npm run build -- --base=/istenen-dizin/`; ardından
`node scripts/precompress.mjs`. nginx yollarını da aynı dizine göre değiştir.
Yerel geliştirme `npm run dev -- --port 5178` ile kök adreste çalışır.

## Veri bağlantısı

Başlangıçta demo modu kullanılır. `.env.example` içindeki değerleri gerektiğinde
`.env.local` dosyasına taşı; SCADA/GPS adreslerini girdikten sonra tekrar derle.
API adresleri açıkça verilir; `/panel-backend/` mevcut yönetim uygulamasına aittir
ve kendiliğinden SCADA kaynağı olarak kullanılmaz. `VITE_*` değerleri herkese
açık tarayıcı çıktısında görünür. Ayrıntılar: `SCADA_INTEGRATION.md`.

3D sahne, logolar ve görseller yereldir. Harita döşemeleri için internet gerekir.
