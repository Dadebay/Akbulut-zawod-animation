# Ak Bulut 3D sahne: Codex görev listesi

Bu liste kodun 18 Ekim 2026 tarihli hâlinin taranmasından ve tarayıcıda yapılan ölçümlerden çıkarıldı.
Hata bölümündeki (A) maddelerin hepsi ölçülerek doğrulandı. Ölçüm değerleri her maddenin içinde yazıyor.

## Çalışma kuralları

- Proje klasörü: `akbulut-monitor/`
- Her görevden sonra `npm test` çalıştır. Mevcut 25 test geçmeye devam etmeli. Yeni davranış için test ekle.
- Yeni npm paketi ekleme.
- Hafif profil (`TABLET`, `src/PlantScene.jsx`) varsayılan profil. `?hq` tam detay profili. İkisi de çalışmaya devam etmeli.
- Koordinatlar metre cinsinden. `x` doğu, `z` güney yönünde artar, `y` yukarı.
- Sunucu derlemesi: `npm run build:server`. Yükleme: `rsync -avz --progress dist/ akbulut:/var/www/zawod/`
- Görevleri aşağıdaki sırayla yap: önce A, sonra C, en son B.

---

## A. Hatalar (önce bunlar)

### A1. Ayrılan TIR, demiryolu forkliftlerinin içinden geçiyor
- **Ölçüm:** "Ugratmak" adımında (tur zamanı yaklaşık 629–634 s) TIR, `z=-47.7` şeridinde batıya giderken `railForkB` (konum yaklaşık `x=9.3, z=-46.7`) ve `railForkA` ile 1,16 m iç içe geçiyor.
- **Sebep:** Forkliftlerin iş sonundaki park konumu TIR'ın yükleme şeridinin içinde kalıyor (`FREIGHT_ROAD_AREAS` içindeki `[-81.5,82,-50,-45.3]`).
- **Dosyalar:** `src/industrial/forkliftMotion.js` (`FORKLIFT_JOBS`, iş sonu pozu), `src/industrial/trafficLayout.js` (`DISPATCH_ROUTE`).
- **Yapılacak:** Forkliftlerin iş sonu park noktalarını şeridin dışına, `z > -44` tarafına al. İş sonundaki dönüşleri de şeride girmeyecek şekilde ayarla.
- **Test:** `src/traffic.test.js` dosyasına yeni test ekle. Ayrılış boyunca `truckFootprint(dispatchPose(t), .35)` ile her forkliftin `sampleForklift(job, job.duration)` sonundaki ayak izi kesişmemeli.

### A2. Taş ocağındaki kamyon ekskavatörün gövdesinin içinde duruyor
- **Ölçüm:** Ekskavatör `(319.8, 12.9, -76.7)` konumunda ve yaw değeri 2.6. Kamyon `QUARRY=(316, 13, -81)` konumunda ve yaw değeri 0. Bom hariç ekskavatör gövdesi (paletler ve kabin) kamyon kabiniyle 2,2 m iç içe. Bu durum yükleme adımlarında hep sürüyor.
- **Dosyalar:** `src/industrial/quarryVehicles.js` (kepçe ucunu `HAULER_LAYOUT.loadPoint` noktasına kalibre eden satır), `src/industrial/quarryLayout.js`.
- **Yapılacak:** Ekskavatör gövdesini kamyondan en az 0,6 m açıklık kalacak şekilde uzaklaştır. Kepçe ucu yine kamyon kasasının ortasına gelmeli, bunun için bom ve kol açılarını ayarla.
- **Test:** Yeni test ekle. Ekskavatör gövdesinin (bom hariç) yerel kutusu ile kamyonun yerel kutusu, kamyon `QUARRY` konumundayken üstten bakışta (2B, SAT yöntemiyle) kesişmemeli.

### A3. Ziyaretçi otoparkındaki servis arabası 180° takla atıyor
- **Ölçüm:** 120 saniyede 11 kez yön 180° (3,14 rad) birden değişiyor. Araba `x=-82…-71` aralığında ileri geri gidiyor.
- **Sebep:** `src/industrial/serviceTraffic.js` dosyasındaki `roundedRoute(PARK.west+18, PARK.east-27, …, 7.5)` çağrısı. `VISITOR_PARK.west` değeri -134'ten -98'e değişti. Bu yüzden rotanın batı ucu doğu ucunu geçiyor ve rota kendi üstüne katlanıyor.
- **Yapılacak:** Rota sınırlarını yeni otopark içinde hesapla. Koşul: `east - west >= 2*radius + 6`. Park edilmiş arabalardan (doğu sırası `x=PARK.east-8`, güney sırası `z=PARK.south-8`) uzak kal. Arabanın başlangıç konumu da (`-108`) yeni otopark içinde olmalı.
- **Test:** 0,1 s adımlarla örnekle. Ardışık iki örnek arasındaki yaw farkı 0,5 rad'dan küçük olmalı. Araba her zaman otopark sınırları içinde kalmalı.

### A4. TIR ve maden kamyonunun ön tekerlekleri dönüşte dönmüyor
- **Dosyalar:** `src/industrial/trucks.js`, `src/industrial/quarryVehicles.js`. Örnek uygulama `src/industrial/serviceTraffic.js` dosyasında: `pivot.rotation.y = atan(wheelbase * curvature)`.
- **Yapılacak:** Ön dingile direksiyon pivotu ekle. Açıyı yol eğriliğinden hesapla, en fazla 35°.

### A5. Maden kamyonunun tekerlekleri hızdan bağımsız sabit dönüyor
- **Dosya:** `src/industrial/journeyMotion.js` (`hauler.ws.forEach(w => w.rotation.z = … -j.elapsed*2 …)`).
- **Yapılacak:** Dönüş açısını katedilen yoldan hesapla: `mesafe / tekerlek yarıçapı`. Mesafe, rotanın `progress * getLength()` değeri. Araç dururken tekerlek de dursun.

### A6. Araçlar anında kalkıyor ve sabit hızla gidiyor
- **Ölçüm:** TIR 40 s'de yaklaşık 330 m yol alıyor. Bu, kalkış anından itibaren sabit 30 km/sa demek, otopark içinde bile. Maden kamyonu `place(hauler, incoming, progress)` ile doğrusal ilerliyor.
- **Dosyalar:** `src/industrial/journeyMotion.js`, `src/industrial/trafficLayout.js`. `src/industrial/motionPath.js` dosyasındaki `routeProfile` hızlanma, yavaşlama ve viraj hızı sınırı zaten sağlıyor.
- **Yapılacak:** TIR ve maden kamyonu için `routeProfile` kullan. Otopark ve kapı içinde en fazla 15 km/sa, virajda yavaşlama, varışta yumuşak duruş. Römork açısı (`dispatchPose` içindeki trailerYaw integrasyonu) yeni hız profiliyle uyumlu kalmalı.

### A7. Üst üste binen çim yatakları titriyor (z-fighting)
- **Dosya:** `src/industrial/oldCampus.js` içinde `plants.garden(36,-64.5,9,8)` ile `plants.garden(48.5,-62.1,35,2.4)`. İkisi aynı yükseklikte ve `x=31…40` aralığında üst üste biniyor.
- **Yapılacak:** Kesişmeyecek şekilde sınırlarını ayır ya da ikisini tek yatağa birleştir.

### A8. Park halindeki TIR'lar ile ayrılan TIR farklı boyutta
- **Durum:** `PARKED_TRUCKS` ölçeği 0,68, ayrılan TIR ise 1,0. İkisi aynı otoparkta duruyor. Gerçekte TIR'ların hepsi aynı boyutta.
- **Dosyalar:** `src/industrial/trafficLayout.js` (`PARKED_TRUCKS`), `src/traffic.test.js` (park sınırları ve ölçek testi).
- **Yapılacak:** Ölçeği 1,0 yap. Kamyon sayısını (örneğin 6) ya da diziliş açısını, kamyonlar otoparka sığacak şekilde yeniden düzenle. Orta koridor TIR'ın geçişi için açık kalmalı.

### A9. Tren ve araçlar tur başında ışınlanıyor
- **Durum:** Tren `x=-470*depart^1.5` ile gidiyor, sonraki turda bir anda `x=0` konumunda beliriyor. Maden kamyonu ve TIR da tur sonunda başlangıç noktasına zıplıyor.
- **Yapılacak:** Turun başına kısa bir varış aşaması ekle: tren yavaşlayarak gelip duruyor, TIR kapıdan girip yerine geçiyor. Ya da tur sonunda yumuşak geçiş yap.

### A10. x=-205'teki demiryolu geçidinde bariyer ve işaret yok
- **Dosya:** `src/industrial/outerRail.js`. Bariyer direkleri şu an yalnızca `x=-151` ve `x=-135` noktalarında var.
- **Yapılacak:** `x=-205` geçidine de aynı bariyer direklerini ve işaretleri ekle.

### A11. Bir yaya kaldırım yerine yolun kenarında yürüyor
- **Dosya:** `src/industrial/pedestrianMotion.js` içinde `WALK_ROUTES[3]` (`z=-131…-129.6`). Havuz yolunun kenarı `z=-129.7`.
- **Yapılacak:** Rotayı kaldırıma, `z=-132…-130.8` aralığına kaydır.

---

## C. Performans ve RAM (A'dan sonra)

**Hafif profilde ölçülen değerler:**
- Kare başına 1443 çizim çağrısı (draw call).
- Çizilen üçgen sayısı 4,1 milyon, sahnedeki toplam üçgen sayısı 6,1 milyon.
- 3093 mesh, bunların 846'sı 200 üçgenden küçük.
- 458 materyal, 1761 geometri.
- Dokular yaklaşık 49 MB, JS belleği 218 MB.
- Dinamik çözünürlük alt sınıra (0,7) düştü, yani makine 48 FPS'i tutturamıyor.
- **Tek büyük kalem:** 2988 ağaç, ağaç başına yaklaşık 800 üçgen, toplam 2,38 milyon üçgen.

**Hedef:** 400'den az çizim çağrısı, 1,5 milyondan az çizilen üçgen, 150 MB'tan az JS belleği. Görünüm aynı kalmalı.

### C1. Ağaçlar için mesafeye göre detay (LOD)
- **Dosya:** `src/industrial/vegetation.js` (`finish()`, ağaç geometrisi `levels`/`spokes`).
- **Yapılacak:** Üç seviye kur:
  - Yakın (0–60 m): mevcut ağaç.
  - Orta (60–200 m): sadeleştirilmiş, yaklaşık 150 üçgen.
  - Uzak (200 m üstü): kameraya dönük çapraz düzlem (impostor), 4 üçgen.
- Her seviye ayrı `InstancedMesh` olsun. Kamera hareket ettikçe örnekleri seviyeler arasında dağıt. Bu işi her karede değil, `updateDetailVisibility` içinde yap.

### C2. Statik küçük mesh'leri materyale göre birleştir
- **Dosya:** `src/industrial/kit.js` (`optimize`).
- **Yapılacak:** Hareket etmeyen ve aynı materyali kullanan mesh'leri bölge bazında (örneğin 60×60 m hücreler) tek `BufferGeometry` içinde birleştir. Bölge bazında yapmak, görüş alanı dışındaki parçaların çizilmemesini korur. Hareketli gruplar ve `userData.dynamic` işaretli nesneler birleştirilmesin.
- **Test:** `src/kit.test.js` dosyasındaki batching testleri geçmeye devam etmeli.

### C3. Aynı materyalleri tekilleştir
- **Yapılacak:** `k.material(color, metalness, roughness, opts)` aynı parametrelerle çağrılınca önbellekten aynı materyali döndürsün. Hedef: 458 materyalden 100'ün altına inmek.

### C4. Kullanılmayan dosyaları ve kodu kaldır
- **Fotoğraflar:** `public/reference/220.jpg`, `224.jpg`, `225.jpg`, `226.jpg`, `227.jpg` (toplam yaklaşık 38 MB, 5000×2813 boyutunda). "Suratlar" sekmesi kaldırıldığı için bunları artık hiçbir ekran göstermiyor. Kaldır. `src/VisualOverview.jsx` içindeki `PHOTOS` ve onu kullanan ölü kodu da sil.
- **Harita:** "Harita" sekmesi de kaldırıldı. `src/StandaloneMap.jsx`, `src/FleetMap.jsx` ve `aerial.jpg` başka yerde kullanılmıyorsa onları da kaldır. Kullanılıp kullanılmadığını grep ile kontrol et.
- **Kamyon modeli:** `public/models/man-tractor-cab.glb` (21 MB) yalnızca `?hq` profilinde gerekiyor. Varsayılan profilde indirilmediğini doğrula.

### C5. Logaritmik derinlik tamponunu kapat
- **Dosya:** `src/PlantScene.jsx` (`logarithmicDepthBuffer: true`).
- **Yapılacak:** Kapat. Yakın düzlemi 0,5'e çek ve kameranın yakın görünümlerinde titreme (z-fighting) çıkıp çıkmadığını kontrol et. Bu ayar GPU'nun erken derinlik testini engelliyor, kapatmak doldurma maliyetini düşürür.

### C6. Ekonomi modu (30 FPS)
- **Yapılacak:** Ayarlara "Eko" seçeneği ekle. Açıkken `createRenderClock(30)` kullanılsın. Tur oynarken bile GPU yükü yarıya iner. Sekme gizliyken çizim zaten duruyor, bu davranış korunmalı.

### C7. Düşük çözünürlükte kenar yumuşatma
- **Yapılacak:** Piksel oranı 1'in altına düştüğünde MSAA yerine daha ucuz bir FXAA geçişine geç. Bu, GPU belleğini azaltır.

### C8. Büyük JS dosyasını böl
- **Durum:** Derlenmiş JS tek dosya ve 1,4 MB.
- **Yapılacak:** `FactoryPanels` ve paneller ekranını `import()` ile ayrı parçaya ayır. 3D sahne ilk açılışta yüklensin, paneller tıklanınca gelsin.

### C9. Üretimde ölçüm göstergesi
- **Yapılacak:** `?perf=1` göstergesi (FPS, üçgen, çizim çağrısı) şu an yalnızca geliştirme modunda var. Üretimde de sorgu parametresiyle açılabilsin. Böylece sunucuda gerçek cihazlarda ölçülebilir.

---

## B. Gerçekçilik ve akıcılık (en son)

### B1. Makine operatörleri hareketsiz
- **Durum:** 6 operatör aynı yöne (`angle: π`) bakıyor, aynı mesafede duruyor ve yalnızca hafifçe sallanıyor (`src/industrial/production.js` içinde `operators`).
- **Yapılacak:** Her operatöre kısa bir iş döngüsü ver: kontrol paneline dönüp bakma, 2–3 adım yürüyüp makineyi kontrol etme, el hareketi. `src/industrial/workers.js` içindeki yürüme ve IK sistemini kullan. Yönleri ve tohum (seed) değerlerini çeşitlendir.

### B2. Eski fabrikanın içinde hiç insan yok
- **Yapılacak:** Eski hollere 4–6 çalışan ve bir forklift ekle. Yürüyüş rotaları araç şeritlerine girmesin, bunun için test ekle.

### B3. Yaya sayısı az
- **Durum:** Sahnede yalnızca 4 yürüyen kişi var.
- **Yapılacak:** Yaya geçitlerini kullanan yayalar ve vardiya değişiminde grup hâlinde yürüyen kişiler ekle. Kural: hiçbir yaya rotası araç rotalarıyla kesişmesin (A1'deki testin benzerini yaz).

### B4. Forkliftler
- **Yapılacak:** Tepe uyarı lambası (dönen, turuncu), geri giderken yanıp sönen ışık, yük taşırken direğin hafif geriye eğilmesi. Hız en fazla 10 km/sa.

### B5. TIR
- **Yapılacak:** Fren lambaları (`serviceTraffic` dosyasındaki `brakeLights` örneğine bak), kapıda dönerken sinyal lambası, kabinde sürücü, kapıdan geçerken yavaşlama.

### B6. Ekskavatör ve taş ocağı
- **Durum:** Şu an bir kamyonu iki kepçe dolduruyor ve her kepçe yaklaşık 6 saniye sürüyor. Gerçekte bir kamyon 4–6 kepçede dolar ve her kepçe 15–20 saniye sürer.
- **Yapılacak:** Kepçe sayısını artır. Süreyi uzatmak sunum süresini çok uzatırsa adımın açıklamasına "hızlandırılmış" yaz. Döküşte toz efekti ekle: az sayıda parçacık, döküşten sonra sönen.

### B7. Kamyonun boşaltması
- **Yapılacak:** Kasa kalkınca taşların kayarak düşmesi ve toz efekti ekle.

### B8. İkinci demiryolu hattı
- **Durum:** İkinci hat şu an boş.
- **Yapılacak:** Bu hattı kullanan, gelen tren ekle (boş vagonlarla yavaşlayarak gelip duran). Makas dillerini de hareketli yap.

### B9. Kepçeli yükleyici
- **Yapılacak:** Kepçe dolulukla görsel olarak dolsun. Lastiklerde hafif yaylanma ekle.

### B10. Çevre
- **Yapılacak:** Ağaçlarda rüzgârla hafif sallanma ekle. Bunu vertex shader ile yap, CPU yükü olmasın. Gölgeli ve gölgesiz profillerde aynı görünmeli.

---

## Doğrulama (her görev sonunda)

1. `npm test`: tüm testler geçmeli.
2. `npm run dev -- --port 5178` ile çalıştır. Değişen bölgeyi hem "3D" hem "Üstden" görünümünde kontrol et.
3. C görevlerinden sonra `?perf=1` ile çizim çağrısı ve üçgen sayısını kaydet, hedeflerle karşılaştır.
4. `npm run build:server` ile derle, sonra şununla yükle: `rsync -avz --progress dist/ akbulut:/var/www/zawod/`
