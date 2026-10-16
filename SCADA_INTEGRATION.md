# Gerçek SCADA verisine geçiş

## Alınacak bilgiler

1. 720 noktanın tag/kod listesi; adı, bölümü, makine veya sensör oluşu.
2. Çalışıyor, duruyor, arıza ve haberleşme yok değerlerinin karşılıkları.
3. Birkaç gerçek, anonimleştirilmiş mesaj; zaman damgası ve birimler.
4. SCADA/gateway markası ve bağlantı biçimi: REST, OPC UA, MQTT, vb.
5. 3D modeli doğru kurmak için yerleşim planı, makine fotoğrafları, üretim sırası.

## Mevcut arayüz sözleşmesi

`src/data.js` içindeki veri kaynağı şu an demo modunda. Gerçek moda geçmek için ağ geçidinden HTTP GET ile bir JSON anlık görüntüsü bekler; 2,5 saniyede bir yeniler. Tarayıcıdan PLC'ye komut göndermez.

```json
{
  "timestamp": "2026-10-16T10:00:00.000Z",
  "machines": [
    {
      "id": "AKB-CR-001",
      "name": "Çig mal bunkeri",
      "zone": "CR",
      "status": "running",
      "timestamp": "2026-10-16T10:00:00.000Z",
      "telemetry": {"load": 72, "temperature": 34, "power": 8.4},
      "runtime": 6.5
    }
  ],
  "production": {"today": 184.2, "target": 220, "rate": 24.8, "unit": "t"},
  "history": [{"hour": 9, "production": 12.4}]
}
```

Örnekteki tarih yerine o anki ISO 8601 zaman damgası gönderilmelidir. `production`, `history`, `telemetry`, `runtime` isteğe bağlıdır; mevcut grafikler ton/saat için hazırlanmıştır ve farklı ürünlerin birimleri ayrıca eşlenmelidir.

- Durumlar: `running`, `idle`, `fault`, `offline`.
- Mevcut temsili bölüm anahtarları: `CR`, `TY`, `BS`, `GR`, `GK`, `GP`.
- Makine ID'leri benzersizdir. Bilinmeyen durum veya bölüm reddedilir.
- 30 saniyeden eski, geçersiz veya 5 saniyeden fazla gelecekteki makine zaman damgaları `offline` olur.
- İstek hatasında mevcut cihazlar `offline` gösterilir. Başarılı veri gelince düzelir.
- Gerçek kodlar için `ZONES`, 3D temsilci eşlemesi ve kod aralıkları uyarlanmalıdır. Şu an 3D sahne her bölümün `AKB-<BÖLÜM>-001` noktasının durumuna bakar.
- Araçlar ve parçalar fiziksel konum verisi değildir. Sahne, ilgili temsili nokta çalışırken animasyon oynatır.

## Yerel bağlantı örneği

Gerçek endpoint belirlendikten sonra geliştirici `.env.local` oluşturur:

```dotenv
VITE_DATA_MODE=live
VITE_SCADA_SNAPSHOT_URL=/api/scada/snapshot
```

Bu rota mevcut statik demoda sunulmaz; fabrikanın veri ağ geçidi/reverse proxy'si tarafından sağlanmalıdır. Farklı origin için uygun CORS ayarı gerekir. OPC UA veya MQTT doğrudan bu tarayıcı adaptörünün parçası değildir; sunucu/gateway bunları normalize eder. Frontend ortam değişkenleri yayın paketine girer: şifre, token veya PLC erişim anahtarı konulmamalıdır. Kimlik doğrulama gerekiyorsa mevcut `credentials:'omit'` adaptörü ve sunucu tarafı yetkilendirmesi birlikte uyarlanmalıdır.

Bu belge bir bağlantı sözleşmesidir; gerçek SCADA verisiyle entegrasyon henüz yapılmamıştır.
