# Ak Bulut 3D sahne: Codex görev listesi

Bu liste kodun 18 Ekim 2026 tarihli hâlinin taranmasından ve tarayıcıda yapılan ölçümlerden çıkarıldı.
Hata bölümündeki (A) maddelerin hepsi ölçülerek doğrulandı. Ölçüm değerleri her maddenin içinde yazıyor.

## Uygulama ve doğrulama sonucu — 18 Ekim 2026

A → C → B sırasındaki 30 maddenin kod değişiklikleri uygulandı. C1 ve C5, kullanıcının son görsel kontrolünden sonra güncellendi. Aşağıdaki ilk ölçümler değişiklik öncesine aittir; her görevde uygulanan sonuç ayrıca yazılıdır.

- Çalışma öncesi kayıt: `37c2ccf` (`chore: checkpoint current scene before task-list fixes`).
- `npm test`: **58/58 geçti** (önceden 25; çakışma, eski fabrika yerleşimi, ekran kırpması, silo girişi, paket/çit açıklığı ve çim birleşimleri regresyonları dahil).
- `npm run build:server`: başarılı; `dist/` yüklemeye hazır.
- Önceki `npm run build:tablet`: başarılı; çevrimdışı HTML **8,3 MiB**, 18 gömülü dosya. Son görsel düzeltmelerden sonra tablet paketi yeniden üretilmedi.
- Tarayıcı: üretim derlemesi, hafif/HQ profilleri, genel 3D/üst görünüm, otopark, taş ocağı, eski hollerin içi, paketleme, ikinci hat, gece, Eko ve doğrudan paneller bağlantısı kontrol edildi. Üretim URL'sinde konsol hatası görülmedi.
- **Sunucuya yükleme yapılmadı; kullanıcı yükleyecek.** Yeni npm paketi eklenmedi.
- Son görsel düzeltme: köşe silosunun yükselen konveyörü, korkuluk açıklığı ve içi boş boşaltma haznesi aynı eksene alındı. Silo kapağında gerçek açıklık var; malzeme bant ucunu geçip bu açıklıktan düşüyor. Taşıyıcı kafes silo duvarının dışında bitiyor. `siloInlet.test.js` gerçek geometriler üzerinde bant girişini ve malzeme düşüş yolunu denetliyor.
- Patalok besleme paletine giren robot çitinin köşesi geri çekildi. Palet etrafında en az 20 cm, hareketli paneller ve vakum besleyicide en az 12 cm açıklık `packingClearance.test.js` ile 180 saniyelik çevrimde doğrulandı; robotun taşıma koridoru korunuyor.
- Eski pavyonun demiryolu tarafındaki bitişik bahçeler tek düz çim yüzeyinde birleştirildi; üst üste gelen yama ve yükseltilmiş iç kenarlar kaldırıldı. Çim dokusu dünya koordinatlarında aynı ölçekte devam ediyor. `lawnSeams.test.js`, eski birleşimler boyunca tek yüzey/yükseklik ve yol sınırını kontrol ediyor. Ağaç yerleşimleri korunuyor.
- Kullanıcının belirttiği demiryolu yanındaki yeşil çatılı, güneş panelli bina yatakhane olarak tanımlandı; avluya bakan giriş cephesine `ÝATAKHANA` tabelası eklendi.

### Performans sonucu ve ölçüm sınırları

Önceki ölçüm: yerel üretim önizlemesi, 1280×720, varsayılan hafif profil, 1,00 piksel oranı. **Bu tablo ağaç LOD sadeleştirmesi açıkken alınmıştır.** Kullanıcının son isteğiyle özgün dallı yolkalar tüm mesafelerde geri getirildi; üçgen sayısı artar. Tablo güncel ağaç düzeninin ölçümü değildir.

| Ölçüm | İlk tarama | Uygulama sonrası |
|---|---:|---:|
| Genel görünüm çizim çağrısı | 1443 | yaklaşık 158–160 |
| Genel görünüm çizilen üçgen | 4,1 milyon | yaklaşık 1,43–1,49 milyon |
| Etkin prosedürel sahne materyali | 458 | 80 |
| Normal / Eko kare hızı | 48 FPS altına düşüş | 60 / 30 FPS |
| JS heap, GC sonrası gözlem | 218 MB | yaklaşık 134–145 MB |

Bunlar bütün kamera açıları için üst sınır değildir. Kurulum sırasında JS heap yaklaşık 370–410 MB'a çıkabiliyor; GC öncesinde geçici artışlar sürüyor. Geniş iç görünümde yaklaşık 2,2 milyon üçgen ve 46–60 FPS görüldü; çözünürlük 0,70'e uyarlanabiliyor. Dolayısıyla **150 MB ve 1,5 milyon hedefleri tüm yükleme anları / tüm açılar için sağlanmış sayılmamalı**. Genel görünümde hedefler GC sonrasında sağlandı. HQ daha ağırdır ve bu hafif profil hedeflerine dahil değildir.

Ana uygulama JS'i yaklaşık 366 kB, React 222 kB, Three 695 kB; paneller gerektiğinde ayrı 12 kB JS ve 9 kB CSS olarak yüklenir. Değerler sıkıştırma öncesidir.

## Çalışma kuralları

- Proje klasörü: `akbulut-monitor/`
- Her görevden sonra `npm test` çalıştır. Mevcut 25 test geçmeye devam etmeli. Yeni davranış için test ekle.
- Yeni npm paketi ekleme.
- Hafif profil (`TABLET`, `src/PlantScene.jsx`) varsayılan profil. `?hq` tam detay profili. İkisi de çalışmaya devam etmeli.
- Koordinatlar metre cinsinden. `x` doğu, `z` güney yönünde artar, `y` yukarı.
- Sunucu derlemesi: `npm run build:server`. Kullanıcının son talimatı: sunucuya yüklemeyi kullanıcı yapar.
- Görevleri aşağıdaki sırayla yap: önce A, sonra C, en son B.

---

## A. Hatalar (önce bunlar)

### A1. Ayrılan TIR, demiryolu forkliftlerinin içinden geçiyor

**Uygulandı (18 Ekim 2026):** Forkliftler iş sonunda z=-43,2 park ceplerine çekiliyor. TIR güzergâhı 1501 örnekte 35 cm payla SAT çarpışma testinden geçiyor (`traffic.test.js`).

- **Ölçüm:** "Ugratmak" adımında (tur zamanı yaklaşık 629–634 s) TIR, `z=-47.7` şeridinde batıya giderken `railForkB` (konum yaklaşık `x=9.3, z=-46.7`) ve `railForkA` ile 1,16 m iç içe geçiyor.
- **Sebep:** Forkliftlerin iş sonundaki park konumu TIR'ın yükleme şeridinin içinde kalıyor (`FREIGHT_ROAD_AREAS` içindeki `[-81.5,82,-50,-45.3]`).
- **Dosyalar:** `src/industrial/forkliftMotion.js` (`FORKLIFT_JOBS`, iş sonu pozu), `src/industrial/trafficLayout.js` (`DISPATCH_ROUTE`).
- **Yapılacak:** Forkliftlerin iş sonu park noktalarını şeridin dışına, `z > -44` tarafına al. İş sonundaki dönüşleri de şeride girmeyecek şekilde ayarla.
- **Test:** `src/traffic.test.js` dosyasına yeni test ekle. Ayrılış boyunca `truckFootprint(dispatchPose(t), .35)` ile her forkliftin `sampleForklift(job, job.duration)` sonundaki ayak izi kesişmemeli.

### A2. Taş ocağındaki kamyon ekskavatörün gövdesinin içinde duruyor

**Uygulandı (18 Ekim 2026):** Ekskavatör gövdesi sabit ve kamyondan en az 60 cm uzakta. Bom/kol açıları ters kinematikle kasanın merkezine ulaşıyor; gövde açıklığı ve kepçe uç koordinatı test edildi.

- **Ölçüm:** Ekskavatör `(319.8, 12.9, -76.7)` konumunda ve yaw değeri 2.6. Kamyon `QUARRY=(316, 13, -81)` konumunda ve yaw değeri 0. Bom hariç ekskavatör gövdesi (paletler ve kabin) kamyon kabiniyle 2,2 m iç içe. Bu durum yükleme adımlarında hep sürüyor.
- **Dosyalar:** `src/industrial/quarryVehicles.js` (kepçe ucunu `HAULER_LAYOUT.loadPoint` noktasına kalibre eden satır), `src/industrial/quarryLayout.js`.
- **Yapılacak:** Ekskavatör gövdesini kamyondan en az 0,6 m açıklık kalacak şekilde uzaklaştır. Kepçe ucu yine kamyon kasasının ortasına gelmeli, bunun için bom ve kol açılarını ayarla.
- **Test:** Yeni test ekle. Ekskavatör gövdesinin (bom hariç) yerel kutusu ile kamyonun yerel kutusu, kamyon `QUARRY` konumundayken üstten bakışta (2B, SAT yöntemiyle) kesişmemeli.

### A3. Ziyaretçi otoparkındaki servis arabası 180° takla atıyor

**Uygulandı (18 Ekim 2026):** Servis rotası yeni otopark sınırlarından hesaplanıyor. 120 saniye / 0,1 saniye örnekleme ile yön sürekliliği, sınırlar ve park sıralarına açıklık doğrulandı.

- **Ölçüm:** 120 saniyede 11 kez yön 180° (3,14 rad) birden değişiyor. Araba `x=-82…-71` aralığında ileri geri gidiyor.
- **Sebep:** `src/industrial/serviceTraffic.js` dosyasındaki `roundedRoute(PARK.west+18, PARK.east-27, …, 7.5)` çağrısı. `VISITOR_PARK.west` değeri -134'ten -98'e değişti. Bu yüzden rotanın batı ucu doğu ucunu geçiyor ve rota kendi üstüne katlanıyor.
- **Yapılacak:** Rota sınırlarını yeni otopark içinde hesapla. Koşul: `east - west >= 2*radius + 6`. Park edilmiş arabalardan (doğu sırası `x=PARK.east-8`, güney sırası `z=PARK.south-8`) uzak kal. Arabanın başlangıç konumu da (`-108`) yeni otopark içinde olmalı.
- **Test:** 0,1 s adımlarla örnekle. Ardışık iki örnek arasındaki yaw farkı 0,5 rad'dan küçük olmalı. Araba her zaman otopark sınırları içinde kalmalı.

### A4. TIR ve maden kamyonunun ön tekerlekleri dönüşte dönmüyor

**Uygulandı (18 Ekim 2026):** TIR ve maden kamyonunun ön dingillerinde ayrı direksiyon pivotu var; eğrilikten hesaplanan açı ±35° ile sınırlı (`vehicleMotion.test.js`).

- **Dosyalar:** `src/industrial/trucks.js`, `src/industrial/quarryVehicles.js`. Örnek uygulama `src/industrial/serviceTraffic.js` dosyasında: `pivot.rotation.y = atan(wheelbase * curvature)`.
- **Yapılacak:** Ön dingile direksiyon pivotu ekle. Açıyı yol eğriliğinden hesapla, en fazla 35°.

### A5. Maden kamyonunun tekerlekleri hızdan bağımsız sabit dönüyor

**Uygulandı (18 Ekim 2026):** Tekerlek açısı gerçek yol mesafesi / yarıçap üzerinden hesaplanıyor; beklerken sabit, dönüş yolunda sürekli.

- **Dosya:** `src/industrial/journeyMotion.js` (`hauler.ws.forEach(w => w.rotation.z = … -j.elapsed*2 …)`).
- **Yapılacak:** Dönüş açısını katedilen yoldan hesapla: `mesafe / tekerlek yarıçapı`. Mesafe, rotanın `progress * getLength()` değeri. Araç dururken tekerlek de dursun.

### A6. Araçlar anında kalkıyor ve sabit hızla gidiyor

**Uygulandı (18 Ekim 2026):** TIR ve maden kamyonu ortak hız profiliyle kalkıyor, virajda yavaşlıyor ve duruyor. Tesis sınırı 15 km/sa, çıkış kapısı 8 km/sa. Adım süreleri gerçek profil süresini kullanıyor.

- **Ölçüm:** TIR 40 s'de yaklaşık 330 m yol alıyor. Bu, kalkış anından itibaren sabit 30 km/sa demek, otopark içinde bile. Maden kamyonu `place(hauler, incoming, progress)` ile doğrusal ilerliyor.
- **Dosyalar:** `src/industrial/journeyMotion.js`, `src/industrial/trafficLayout.js`. `src/industrial/motionPath.js` dosyasındaki `routeProfile` hızlanma, yavaşlama ve viraj hızı sınırı zaten sağlıyor.
- **Yapılacak:** TIR ve maden kamyonu için `routeProfile` kullan. Otopark ve kapı içinde en fazla 15 km/sa, virajda yavaşlama, varışta yumuşak duruş. Römork açısı (`dispatchPose` içindeki trailerYaw integrasyonu) yeni hız profiliyle uyumlu kalmalı.

### A7. Üst üste binen çim yatakları titriyor (z-fighting)

**Uygulandı (18 Ekim 2026):** Eski fabrika önündeki çim yatakları ayrıldı; düzlemsel kesişme testi eklendi.

- **Dosya:** `src/industrial/oldCampus.js` içinde `plants.garden(36,-64.5,9,8)` ile `plants.garden(48.5,-62.1,35,2.4)`. İkisi aynı yükseklikte ve `x=31…40` aralığında üst üste biniyor.
- **Yapılacak:** Kesişmeyecek şekilde sınırlarını ayır ya da ikisini tek yatağa birleştir.

### A8. Park halindeki TIR'lar ile ayrılan TIR farklı boyutta

**Uygulandı (18 Ekim 2026):** Park edilmiş beş TIR da 1,0 ölçeğinde. Yolcu otoparkına taşmadan karşılıklı üç + iki yerleşim yapıldı, orta koridor x=-120,2 oldu. Araçlar ve ayrılan TIR arasında çarpışma testi geçiyor.

- **Durum:** `PARKED_TRUCKS` ölçeği 0,68, ayrılan TIR ise 1,0. İkisi aynı otoparkta duruyor. Gerçekte TIR'ların hepsi aynı boyutta.
- **Dosyalar:** `src/industrial/trafficLayout.js` (`PARKED_TRUCKS`), `src/traffic.test.js` (park sınırları ve ölçek testi).
- **Yapılacak:** Ölçeği 1,0 yap. Kamyon sayısını (örneğin 6) ya da diziliş açısını, kamyonlar otoparka sığacak şekilde yeniden düzenle. Orta koridor TIR'ın geçişi için açık kalmalı.

### A9. Tren ve araçlar tur başında ışınlanıyor

**Uygulandı (18 Ekim 2026):** Tur sınırında 1,4 saniyelik kapanma/açılma geçişi sıfırlamayı gizliyor. Duraklatma ve tek adım tekrarı bu geçişten etkilenmiyor (`journey.test.js`).

- **Durum:** Tren `x=-470*depart^1.5` ile gidiyor, sonraki turda bir anda `x=0` konumunda beliriyor. Maden kamyonu ve TIR da tur sonunda başlangıç noktasına zıplıyor.
- **Yapılacak:** Turun başına kısa bir varış aşaması ekle: tren yavaşlayarak gelip duruyor, TIR kapıdan girip yerine geçiyor. Ya da tur sonunda yumuşak geçiş yap.

### A10. x=-205'teki demiryolu geçidinde bariyer ve işaret yok

**Uygulandı (18 Ekim 2026):** x=-205 geçidine karşılıklı bariyerler ve demiryolu işaretleri eklendi; iki geçidin direkleri test edildi.

- **Dosya:** `src/industrial/outerRail.js`. Bariyer direkleri şu an yalnızca `x=-151` ve `x=-135` noktalarında var.
- **Yapılacak:** `x=-205` geçidine de aynı bariyer direklerini ve işaretleri ekle.

### A11. Bir yaya kaldırım yerine yolun kenarında yürüyor

**Uygulandı (18 Ekim 2026):** Havuz yanındaki rota z=-132…-130,8 kaldırımına alındı; yaya gövdesinin yol kenarına taşmadığı test edildi.

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

**Kullanıcı isteğiyle geri alındı (18 Ekim 2026):** Koni ve düzlem ağaç LOD'ları kaldırıldı. Önceki düzensiz dallı yolka geometrisi, renkleri, ölçeği ve dikim düzeni tüm mesafelerde geri getirildi. Ortak geometri, InstancedMesh ve görüş alanına göre bölgesel eleme korundu; hafif rüzgâr ve ona uyan gölgeler devam ediyor. Aşağıdaki ilk LOD hedefinin yerine kullanıcının eski görünüm tercihi uygulandı.

- **Dosya:** `src/industrial/vegetation.js` (`finish()`, ağaç geometrisi `levels`/`spokes`).
- **Yapılacak:** Üç seviye kur:
  - Yakın (0–60 m): mevcut ağaç.
  - Orta (60–200 m): sadeleştirilmiş, yaklaşık 150 üçgen.
  - Uzak (200 m üstü): kameraya dönük çapraz düzlem (impostor), 4 üçgen.
- Her seviye ayrı `InstancedMesh` olsun. Kamera hareket ettikçe örnekleri seviyeler arasında dağıt. Bu işi her karede değil, `updateDetailVisibility` içinde yap.

### C2. Statik küçük mesh'leri materyale göre birleştir

**Uygulandı (18 Ekim 2026):** Statik parçalar 60 m hücrelerde birleştiriliyor; tekrar eden geometri ve hareketli montajlar BatchedMesh ile paylaşılıyor. Hareket/visibility korunuyor. Kurulum listeleri serbest bırakılıyor. Yeni birleşen araç parçalarının dünya dönüşümü için regresyon testi var (`kit.test.js`, `surfaceBatching.test.js`).

- **Dosya:** `src/industrial/kit.js` (`optimize`).
- **Yapılacak:** Hareket etmeyen ve aynı materyali kullanan mesh'leri bölge bazında (örneğin 60×60 m hücreler) tek `BufferGeometry` içinde birleştir. Bölge bazında yapmak, görüş alanı dışındaki parçaların çizilmemesini korur. Hareketli gruplar ve `userData.dynamic` işaretli nesneler birleştirilmesin.
- **Test:** `src/kit.test.js` dosyasındaki batching testleri geçmeye devam etmeli.

### C3. Aynı materyalleri tekilleştir

**Uygulandı (18 Ekim 2026):** Materyal önbelleği, yazı atlası ve köşe başına renk/yüzey bilgisi eklendi. Prosedürel sahnede 80 etkin materyal var; sonradan yüklenen kabin ortak materyal kullanıyor. Bağımsız hareketli lambalar ayrı tutuluyor.

- **Yapılacak:** `k.material(color, metalness, roughness, opts)` aynı parametrelerle çağrılınca önbellekten aynı materyali döndürsün. Hedef: 458 materyalden 100'ün altına inmek.

### C4. Kullanılmayan dosyaları ve kodu kaldır

**Uygulandı (18 Ekim 2026):** Kullanılmayan altı fotoğraf, PHOTOS kodu ve iki harita bileşeni kaldırıldı; kaynaklarda kalan bağlantı yok. Model yükleme testi hafif profilde yalnız tablet GLB, HQ profilinde tam GLB istendiğini doğruluyor.

- **Fotoğraflar:** `public/reference/220.jpg`, `224.jpg`, `225.jpg`, `226.jpg`, `227.jpg` (toplam yaklaşık 38 MB, 5000×2813 boyutunda). "Suratlar" sekmesi kaldırıldığı için bunları artık hiçbir ekran göstermiyor. Kaldır. `src/VisualOverview.jsx` içindeki `PHOTOS` ve onu kullanan ölü kodu da sil.
- **Harita:** "Harita" sekmesi de kaldırıldı. `src/StandaloneMap.jsx`, `src/FleetMap.jsx` ve `aerial.jpg` başka yerde kullanılmıyorsa onları da kaldır. Kullanılıp kullanılmadığını grep ile kontrol et.
- **Kamyon modeli:** `public/models/man-tractor-cab.glb` (21 MB) yalnızca `?hq` profilinde gerekiyor. Varsayılan profilde indirilmediğini doğrula.

### C5. Logaritmik derinlik tamponunu kapat

**Kullanıcı testi sonrası düzeltildi (18 Ekim 2026):** Kamera hareketinde çatı, yol ve bina çizgileri titrediği için logaritmik derinlik yeniden açıldı. 0,5 m yakın düzlem korundu. Uzak kampüs görünümünde milimetre aralıklı yüzeylerin birbirine karışmaması, bu optimizasyondan öncelikli. FXAA, doğru kontrastı işlemesi için renk dönüşümünden sonraya alındı; ince çizgiler için tam çözünürlükte de açık tutuldu.

- **Dosya:** `src/PlantScene.jsx` (`logarithmicDepthBuffer: true`).
- **Yapılacak:** Kapat. Yakın düzlemi 0,5'e çek ve kameranın yakın görünümlerinde titreme (z-fighting) çıkıp çıkmadığını kontrol et. Bu ayar GPU'nun erken derinlik testini engelliyor, kapatmak doldurma maliyetini düşürür.

### C6. Ekonomi modu (30 FPS)

**Uygulandı (18 Ekim 2026):** Ayarlara kalıcı Eko · 30 FPS seçeneği eklendi. Açıkken 30, kapalıyken 60 FPS tarayıcıda doğrulandı; gizli sekmenin çizimi durdurma davranışı korundu.

- **Yapılacak:** Ayarlara "Eko" seçeneği ekle. Açıkken `createRenderClock(30)` kullanılsın. Tur oynarken bile GPU yükü yarıya iner. Sekme gizliyken çizim zaten duruyor, bu davranış korunmalı.

### C7. Düşük çözünürlükte kenar yumuşatma

**Uygulandı (18 Ekim 2026):** Piksel oranı 1 altındayken örnekleme tamponu bırakılıp FXAA açılıyor; 1 ve üzerinde 4× MSAA + son FXAA filtresi. 0,70 oranındaki üretim görünümü de kontrol edildi.

**Ekran kırpması düzeltmesi (18 Ekim 2026):** Çözünürlük ve pencere boyutu değişiklikleri artık bir sonraki çizimin hemen öncesinde aynı karede uygulanıyor; çizimden sonra canvas temizlenmiyor. Tur başı/sonu solması yalnızca oynayan rehberli turda kullanılıyor; serbest kamera, duraklatılmış/durmuş akış ve tek adım tekrarında sahne görünür kalıyor. İki regresyon testi eklendi.

- **Yapılacak:** Piksel oranı 1'in altına düştüğünde MSAA yerine daha ucuz bir FXAA geçişine geç. Bu, GPU belleğini azaltır.

### C8. Büyük JS dosyasını böl

**Uygulandı (18 Ekim 2026):** FactoryPanels lazy/Suspense ile ayrı JS/CSS parçası. React ve Three ayrı önbellek parçaları. Paneller düğmesi geri eklenmedi; mevcut ?area=panels doğrudan bağlantısı çalışıyor.

- **Durum:** Derlenmiş JS tek dosya ve 1,4 MB.
- **Yapılacak:** `FactoryPanels` ve paneller ekranını `import()` ile ayrı parçaya ayır. 3D sahne ilk açılışta yüklensin, paneller tıklanınca gelsin.

### C9. Üretimde ölçüm göstergesi

**Uygulandı (18 Ekim 2026):** ?perf=1 üretimde FPS, üçgen, çizim çağrısı, CPU süresi, piksel oranı ve destekleyen tarayıcıda JS heap değerini gösteriyor.

- **Yapılacak:** `?perf=1` göstergesi (FPS, üçgen, çizim çağrısı) şu an yalnızca geliştirme modunda var. Üretimde de sorgu parametresiyle açılabilsin. Böylece sunucuda gerçek cihazlarda ölçülebilir.

---

## B. Gerçekçilik ve akıcılık (en son)

### B1. Makine operatörleri hareketsiz

**Uygulandı (18 Ekim 2026):** Operatörler farklı yön/tohumlarla kısa kontrol yürüyüşü, panele bakma ve el hareketi yapıyor. Kullanıcının sonraki görsel kontrolüyle konveyör, besleme paleti, kabin ve diğer ekipmanlara taşan altı çalışma alanı düzeltildi; dar koridorlarda yürüyüş ekseni koridora paralel yapıldı. On beş operatörün tüm yürüyüş alanları 45 cm gövde payıyla gerçek makine geometrisine karşı test ediliyor (`campusLife.test.js`).

- **Durum:** 6 operatör aynı yöne (`angle: π`) bakıyor, aynı mesafede duruyor ve yalnızca hafifçe sallanıyor (`src/industrial/production.js` içinde `operators`).
- **Yapılacak:** Her operatöre kısa bir iş döngüsü ver: kontrol paneline dönüp bakma, 2–3 adım yürüyüp makineyi kontrol etme, el hareketi. `src/industrial/workers.js` içindeki yürüme ve IK sistemini kullan. Yönleri ve tohum (seed) değerlerini çeşitlendir.

### B2. Eski fabrikanın içinde hiç insan yok

**Uygulandı (18 Ekim 2026):** Eski hollere beş çalışan ve bir forklift eklendi. Çatı gizlendiğinde içerisi görülebiliyor; yaya rotaları forklift koridorundan ayrı ve testli.

**Kullanıcının alan tanımıyla güncellendi (18 Ekim 2026):** Geniş sağ salonun içine patalok üretim hattı (besleme, kaplama, kesim, delme ve çıkış), ayrı uzun sol hangara paletli ürün sıraları eklendi. Makine yerleşimi mevcut bina sınırları içinde temsili olarak çizildi. Hangarın orta koridoru ve üç yükleme kapısı açık; forklift yolu yeni ekipmandan ayrıldı. Ürünlerin bant üzerinde kalması, aralıkları ve çalışan/araç geçişleri test edildi.

- **Yapılacak:** Eski hollere 4–6 çalışan ve bir forklift ekle. Yürüyüş rotaları araç şeritlerine girmesin, bunun için test ekle.

### B3. Yaya sayısı az

**Uygulandı (18 Ekim 2026):** Edara önündeki yaya geçidini kullanan üç kişilik vardiya grubu eklendi. Grup beklerken de yan yana mesafesini koruyor (testli). Yeni yaya rotaları, park edilmiş araçlar ve TIR güzergâhıyla SAT testinden geçiyor.

- **Durum:** Sahnede yalnızca 4 yürüyen kişi var.
- **Yapılacak:** Yaya geçitlerini kullanan yayalar ve vardiya değişiminde grup hâlinde yürüyen kişiler ekle. Kural: hiçbir yaya rotası araç rotalarıyla kesişmesin (A1'deki testin benzerini yaz).

### B4. Forkliftler

**Uygulandı (18 Ekim 2026):** Dönen turuncu uyarı lambası, geri giderken yanıp sönen ışık, taşıma sırasında geriye yatık direk. Tüm iş döngülerinde 10 km/sa sınırı testli.

- **Yapılacak:** Tepe uyarı lambası (dönen, turuncu), geri giderken yanıp sönen ışık, yük taşırken direğin hafif geriye eğilmesi. Hız en fazla 10 km/sa.

### B5. TIR

**Uygulandı (18 Ekim 2026):** Aktif TIR kabinine sürücü, fren ve yön sinyalleri eklendi. Kapı bölgesindeki hız 8 km/sa; fren durumu hız profilinden geliyor.

- **Yapılacak:** Fren lambaları (`serviceTraffic` dosyasındaki `brakeLights` örneğine bak), kapıda dönerken sinyal lambası, kabinde sürücü, kapıdan geçerken yavaşlama.

### B6. Ekskavatör ve taş ocağı

**Uygulandı (18 Ekim 2026):** Dört kepçe × 18 saniye = 72 saniye yükleme. Kepçe çevrimi ve doluluk testi var. Döküş sırasında az parçacıklı, sönümlenen toz eklendi.

- **Durum:** Şu an bir kamyonu iki kepçe dolduruyor ve her kepçe yaklaşık 6 saniye sürüyor. Gerçekte bir kamyon 4–6 kepçede dolar ve her kepçe 15–20 saniye sürer.
- **Yapılacak:** Kepçe sayısını artır. Süreyi uzatmak sunum süresini çok uzatırsa adımın açıklamasına "hızlandırılmış" yaz. Döküşte toz efekti ekle: az sayıda parçacık, döküşten sonra sönen.

### B7. Kamyonun boşaltması

**Uygulandı (18 Ekim 2026):** Damper kalkınca taşlar arka kapağa kayarak düşüyor. Düşüş yüksekliği kasa ağzından zemine kadar hesaplanıyor; boşaltmada sönümlenen toz var.

- **Yapılacak:** Kasa kalkınca taşların kayarak düşmesi ve toz efekti ekle.

### B8. İkinci demiryolu hattı

**Uygulandı (18 Ekim 2026):** İkinci hatta lokomotif ve iki boş vagon geliyor, frenleyerek duruyor. Makas dilleri hareketli; ilk anda vagonlar üst üste binmiyor, aralık ve duruş testli.

- **Durum:** İkinci hat şu an boş.
- **Yapılacak:** Bu hattı kullanan, gelen tren ekle (boş vagonlarla yavaşlayarak gelip duran). Makas dillerini de hareketli yap.

### B9. Kepçeli yükleyici

**Uygulandı (18 Ekim 2026):** Kepçe doluluğu taşların kademeli görünmesiyle değişiyor. Kullanıcının görsel kontrolünden sonra yükleyicinin kazı duruşu 3,7 m geri alındı: yaklaşma, 60 cm'lik yavaş giriş, kepçeyi kıvırma ve kaldırma sırayla gerçekleşiyor. Tekerlekler yığının dışında; kepçe zemine batmıyor. Tüm yığını küçültmek yerine yalnız kepçe ağzına denk gelen ön taşlar azalıyor. Bu açıklıklar, yerel malzeme alımı, geri sarma ve taşıma adımına kesintisiz geçiş `loaderScoop.test.js` ile doğrulanıyor. Taşıma sırasında hafif süspansiyon hareketi sürüyor.

- **Yapılacak:** Kepçe dolulukla görsel olarak dolsun. Lastiklerde hafif yaylanma ekle.

### B10. Çevre

**Uygulandı (18 Ekim 2026):** Ağaç rüzgârı vertex shader içinde hesaplanıyor; CPU başına ağaç güncellemesi yok. Derinlik/gölge malzemesi aynı hareketi kullanıyor; kök ve uç salınım sınırı testli.

- **Yapılacak:** Ağaçlarda rüzgârla hafif sallanma ekle. Bunu vertex shader ile yap, CPU yükü olmasın. Gölgeli ve gölgesiz profillerde aynı görünmeli.

---

## Doğrulama (her görev sonunda)

1. `npm test`: tüm testler geçmeli.
2. `npm run dev -- --port 5178` ile çalıştır. Değişen bölgeyi hem "3D" hem "Üstden" görünümünde kontrol et.
3. C görevlerinden sonra `?perf=1` ile çizim çağrısı ve üçgen sayısını kaydet, hedeflerle karşılaştır.
4. `npm run build:server` ile derle. `dist/` klasörünü kullanıcıya bırak; sunucuya yükleme yapma.
