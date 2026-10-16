# Ak Bulut — Dostluk önümçilik merkezi

Türkmençe, büyük ekran için React + Three.js sunum demosu. Beyaz/mavi fabrika modelinde ham madde kamyonu, iki forklift, dönen üretim makineleri, hareketli malzeme ve bant üzerinde gips/ceiling-panel ürünleri bulunur.

## Çalıştırma

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5178
```

Tarayıcı: http://127.0.0.1:5178

```sh
npm run build
npm test
```

Üretim çıktısı `dist/` dizinidir. Harici font/CDN gerekmez; paket hazırlandıktan sonra yerel HTTP sunucusuyla internet olmadan sunulabilir.

## Kullanım

- Ana ekran: araçlar, ham madde, gips ve tavan paneli üretim akışı.
- Sağ üst: 3D/üst görünüm, animasyonu durdur/devam et, senaryo seçimi.
- Fareyle sürükle: döndür. Tekerlek: yakınlaştır. Tam ekran: üst başlıktaki büyütme simgesi.
- Alt durum sayıları: ilgili makineleri filtrele. `720 ENJAM`: tüm cihazlar.
- Cihaz koduna tıkla: ayrıntı. Escape: paneli kapat.
- Sıralı sunum: diğer sekmelerdeki `Sunum režimi`, 18 saniyede bir ekran değiştirir.
- Sistem hareket azaltma tercihi animasyonları durdurur.

## Gerçeklik sınırı

720 makine/üretim noktası kullanıcı tarafından belirtilmiştir. Altı bölüm, makine kodları, yerleşim, animasyon sıraları, çalışma durumları, alarmlar ve sayısal ölçümler temsili verilerdir. Bu sürüm gerçek fabrikanın CAD modeli veya çalışan SCADA bağlantısı değildir. Ana ekrandaki `GÖRKEZIŞ · NUSGA MAGLUMAT` etiketi bunu belirtir. 3D sahnedeki her örnek kod 120 noktalı bir grubu temsil eder; ayrı cihaz ekranında 720 noktanın tamamı bulunur.

Ürünler: kullanıcıdan gelen gips ve potolok bilgisi. Genel üretim süreçleri için resmi referanslar:

- https://www.akbulut.com.tm/index.php/tk/turkmen-gips
- https://baumak.com.tr/en/gypsum-technologies/

Bir hafta sonra gerçek veri geldiğinde izlenecek yol: [SCADA_INTEGRATION.md](SCADA_INTEGRATION.md).
