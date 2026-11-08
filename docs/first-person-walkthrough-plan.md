# Eski ve yeni fabrikada insan gözünden gezinti

Tarih: 25 Ekim 2026. Durum: ilk masaüstü gezinti sürümü uygulandı.
Doğrulanan kapsam ve kalan ayrıntılar belgenin sonundadır.

## Hedef

Mevcut React + Three.js uygulamasına, eski ve yeni fabrikanın avlularında ve
binalarında insan boyunda gezilebilen bir mod eklemek. Kullanıcı kapıdan girer,
üretim hatlarını yakından izler, merdivenlerle katlara çıkar ve araçlara yaklaşır.
İki tesis aynı gezinti sistemiyle ve aralarındaki fiziksel geçişlerle çalışır.

Tamamlanma hedefi iki kampüsteki bütün binaların envantere alınması ve gezilebilir
alanlarının bağlanmasıdır. İlk küçük deneme rotası bu hedefin ilk adımıdır;
yalnızca avluda yürümek, bütün işin tamamlandığı anlamına gelmez.

## Kullanıcının belirlediği ilk sürüm kapsamı

Kullanıcı 25 Ekim 2026 tarihinde aşağıdaki seçimleri yaptı.

| Karar | Seçilen kapsam | Uygulamaya etkisi |
| --- | --- | --- |
| Araçlarla etkileşim | İlk sürümde araçların etrafında yürüme ve yakından inceleme; sürüş sonraki aşamada | Oyuncu ve araç çarpışmaları ile geçişte bekleme uygulanır. Kabine binme ve sürüş ilk sürüme dahil değildir. |
| İç mekân doğruluğu | Mevcut modelleri tamamlamak; bilinmeyen iç alanları temsili yapmak | Mevcut bina biçimi ve bilinen yerleşim korunur. Eksik içler tutarlı dolaşım yollarıyla tamamlanır ve temsili olarak kaydedilir; ek referans beklemek işi durdurmaz. |
| Cihaz | Yalnızca bilgisayar, klavye + trackpad veya fare | Kontroller ve kabul senaryoları masaüstü tarayıcıya göre hazırlanır. Tablet/dokunmatik gezinti bu çalışmanın kapsamı değildir. |

Tuşlar, göz yüksekliği, kapı açma biçimi ve uygulama sırası için aşağıdaki
varsayımlar kullanılabilir. Gerçek kapı tipleri biliniyorsa modele işlenir.

## Mevcut koddan doğrulanan durum

| Alan | Bulgu | Sonuç |
| --- | --- | --- |
| Kamera | `src/PlantScene.jsx` yalnız `OrbitControls` kullanıyor. Perspektif kamera başlangıçta 36° görüş açısı, 0,5 m yakın kesme mesafesiyle kuruluyor. | İnsan gözünden bakış, ayrı kontrol sahibi ve yakın görüş ayarları gerektiriyor. |
| Görünürlük | Aynı dosyada `showInterior`, dış yapıları ve eski bina kabuklarını gizleyip üretim ve eski tesis içlerini gösteriyor. | Yürüyüşte dış duvar, çatı ve iç mekân aynı anda mevcut olmalı. |
| Yeni fabrika | `site.js` içindeki ana hol ve `processingBuildings.js` / `rearServiceYard.js` içindeki bazı yapılar dolu kutulardan oluşuyor. | Kapı kanadını hareket ettirmek yetmez; bina gövdesi içi boş duvarlara dönüştürülmeli. |
| Eski fabrika | `oldCampus.js` hollerinde duvarlar ve bazı gerçek geçişler var; diğer kapılar kapalı duvarın önüne eklenmiş görsel parçalar. | Her giriş için geçiş boşluğu, eşik ve iç bağlantı kontrol edilmeli. |
| İç mekânlar | Yeni üretim ve çok katlı proses ekipmanları; eski üretim/depo, iki katlı ofis, yatakhane ve yemek salonu/ofis içleri bulunuyor. | Önemli bir modelleme temeli yeniden kullanılabilir. Mevcut olması yürünebilir olduğunun kanıtı değil. |
| Kesit modeli | `dormitoryInterior.js` bölme duvarları 1,45 m yüksekliğinde; diğer bazı içler de kesit sunumu için düzenlenmiş. | Gezinti için tam duvarlar, tavanlar ve iç yüzeyler tamamlanmalı; kesit görünümü ayrıca korunmalı. |
| Dış/iç uyumu | Proses yerleşimi ile arka bina dış kabuğu farklı temsili düzenlerden türetilmiş. | Katlar, merdivenler ve dış cephe birlikte incelenmeden erişim noktaları kesinleştirilmemeli. |
| Kapılar | Yeni ana giriş sürgüsü sabit açık konumda; üretim girişindeki cam kapılar sabit; yatakhane kapıları sabit dönük gruplar. | Kapıların ayrı hareketli parçaları ve etkileşim durumu gerekli. |
| Çarpışma | Oyuncu için çalışma zamanında kullanılan hareket/çarpışma sistemi yok. Bazı mevcut testler araç güzergâhı açıklıklarını kontrol ediyor. | İnsan hareketi, zemin takibi ve hareketli engeller yeni çalışma zamanı davranışı. |
| Optimizasyon | `kit.js` ve `surfaceBatching.js` görsel parçaları birleştirip bazı özgün meshleri kaldırıyor. | Etkileşim ve çarpışma kaydı görsel mesh isimlerine bağlı olamaz; hareketli kapı sahipliği birleştirmeden önce tanımlanmalı. |
| Arayüz | Kamera/tur/çatı yönetimi `VisualOverview.jsx` içinde; `App.jsx` genel Escape davranışını yönetiyor. | Gezinti, panel açma ve tur arasında tek ve açık kontrol geçişi gerekir. |

## Kullanıcı deneyimi

- Üst araç çubuğundan **Yaya gezinti** açılır. Etiketler uygulamanın mevcut
  Türkmençe arayüz diliyle hazırlanır.
- Başlangıç yeri eski veya yeni fabrika girişi olur. Her biri doğrulanmış açık
  zeminde, doğru yüksekliğe ve bakış yönüne sahip bir başlangıç noktasıdır.
- **W/A/S/D:** ileri/sol/geri/sağ; **trackpad basılı sürükleme / ok tuşları / fare:** etrafa bakış; **Shift:** hızlı yürüme.
- **E:** bakılan ve erişim mesafesinde bulunan kapıyı aç/kapat; makine bilgi
  noktalarında mevcut bilgi panelini aç. Duvar arkasından etkileşim yapılmaz.
- **Esc:** bakışı serbest bırakır, hareketi durdurur ve gezinti menüsünü açar.
  Devam etmek için tekrar kullanıcı tıklaması gerekir. Menüden genel görünüme
  dönülünce önceki kamera/çatı görünümü geri yüklenir.
- Başlangıç önerisi: yaklaşık 1,65–1,70 m göz yüksekliği, 1,4 m/s yürüyüş,
  2,8 m/s hızlı yürüyüş, 65° dikey görüş açısı. Bunlar saha ölçüsü değil,
  deneyim için ayarlanacak başlangıç değerleridir.
- Merdiven ve küçük eşiklerde kamera zemini takip eder. Zıplama, uçma ve baş
  sallantısı temel gereksinim değildir; varsayılan yürüyüş sabit ve rahattır.
- Menüde kısa kontrol açıklaması, bulunulan bina/kat ve **Girişe dön** bulunur.
  İsteğe bağlı bina listesi kampüsler arasında hızlı başlangıç sağlar; tesisler
  arasındaki yürüyerek bağlantının yerine geçmez.
- Makine paneli, metin alanı veya menü açıkken WASD sahneyi hareket ettirmez.
  Pencere odağı kaybolunca ve fare kilidi çözülünce basılı tuşlar sıfırlanır.

## Bina ve güzergâh kapsamı

İlk iş, görünür her binayı kimlik, kampüs, giriş, kat, iç model durumu ve
referans kaynağıyla kaydetmektir. Sayı ve kesin rota bu envanterle çıkarılır;
fotoğraftan bilinmeyen odalar gerçek tesisin doğrulanmış planı olarak sunulmaz.

| Kampüs | Planlanacak erişim |
| --- | --- |
| Yeni fabrika | Ana giriş/güvenlik, ön avlu, üretim holü, alçıpan ve tavan hattı, paketleme, depo/yükleme, çok katlı proses binası, bağlı servis/ofis yapıları, ham madde kabulü ve kantar çevresi. |
| Eski fabrika | Giriş/güvenlik, üretim holleri, ayrı depo/üretim hangarı, ofisin iki katı, yatakhane odaları, yemek salonu/ofis, servis avluları ve yardımcı binalar. |
| Ortak dış alanlar | İki kampüsü bağlayan mevcut geçişler, yaya yolları, otoparklar, araç/yükleme çevresi ve demiryolu geçişi. |
| Teknik alanlar | Siloların ve kapalı makinelerin çevresi; erişim merdiveni bulunan servis platformları. Makine hazneleri yürüme odası değildir. |

Her bina için tamamlanma kontrolü: dış kapıya erişim → kapının açılması → içeri
giriş → bütün tanımlı oda/katlara ulaşma → dışarı çıkış. Görsel bir kapının
arkasında geçilemeyen dolu kutu kalmamalı. Eksik iç model açıkça iş listesinde
kalır; bina sessizce kapsamdan çıkarılmaz.

## Kapı ve geçiş davranışı

- Menteşeli tek/çift kanat, sürgülü kapı ve sanayi tipi yükleme kapısı ortak
  etkileşim kurallarıyla, kendi mekanizmasına uygun hareket eder.
- Durumlar: kapalı → açılıyor → açık → kapanıyor. Tekrarlı E basışları aynı
  animasyonu çoğaltmaz. Hareketin tersine çevrilmesi kesintisiz olur.
- Kapı çarpışması görünür kanatla birlikte güncellenir; tamamen açılmadan
  oyuncu geçebiliyor varsayılmaz. Kasa ve duvar sabit engel olarak kalır.
- Oyuncu/araç kapı geçişinde veya kanadın hareket alanındaysa kapanma durur
  ya da kapı yeniden açılır; kullanıcı duvara itilmez veya kapıya sıkışmaz.
- Personel kapıları varsayılan olarak E ile açılır/kapanır ve konumunu korur.
  Otomatik kapanma ancak ilgili kapı için seçilirse eklenir.
- Araç bariyeri ve yükleme kapıları, bağlı oldukları trafik/lojistik hareketiyle
  uyumlu çalışır. Kapalı kapıdan geçen araç veya oyuncu olmamalı.
- Kapılar görsel gruplama işleminden önce hareketli olarak işaretlenir.
  Etkileşim hedefi, render meshleri birleşse de geçerli kalan bir kimlik taşır.

## Hareket, zemin ve araçlar

- Oyuncuyu kapsül biçimli bir çarpışma hacmi temsil eder. Duvar, kolon, makine,
  çit, araç ve korkulukların içinden geçilemez.
- Zemin, rampa ve kat döşemeleri ayrı yürünebilir yüzeylerdir. Merdivenlerde
  uygun basamak desteği veya görselle uyumlu görünmez eğim yüzeyi kullanılır;
  sahanlıklarda boşluk bırakılmaz. Katlar sadece X/Z konumuyla seçilmez.
- Baş üstü boşluğu, eğim sınırı ve eşik yüksekliği kontrol edilir. Korkuluk ve
  platform boşlukları gerçek geometrileriyle tutarlı olur.
- Hareket sabit zaman adımlarıyla hesaplanır; çapraz yürüyüş hızlanmaz. Düşük
  kare hızında ince engelleri aşmayı önlemek için ara adımlar uygulanır.
- Dünya dışına çıkma/düşme halinde son güvenli zemine dönüş yapılır; kullanıcı
  ayrıca giriş noktasına dönebilir.
- Park araçları sabit; hareketli TIR, forklift ve diğer araçlar hareketlerine
  bağlı basit hacimlerle temsil edilir. Büyük tarama modelinin her üçgeniyle
  her karede oyuncu testi yapılmaz.
- Bir hareketli araç oyuncunun bulunduğu geçide yaklaşırsa ilgili eşzamanlı
  lojistik akışı bekler. Oyuncu yolu boşaltınca devam eder. Yalnız araç meshini
  dondurup yük teslimi/sayaç/tur zamanını ilerletmek kabul edilmez.
- Sunumun duraklatılması üretimi ve araçları durdurur; kullanıcının yürümesini
  veya elle kapı açmasını engellemez. Sunumun 1×/2×/4× hızı yürüme hızını değiştirmez.
- Araç kabini ve sürüş sonraki aşamaya bırakılır. O aşama için iç model,
  kamera, binme/inme noktaları, giriş kapısı ve otomatik trafik ile sürücünün
  kontrol paylaşımı ayrıca planlanır. İlk sürüm bunlara bağlı değildir.

## Mevcut yapıya uygun teknik çözüm

Three.js altyapısı korunur. Kurulu Three.js paketinde `PointerLockControls`,
`Capsule` ve `Octree` mevcut. Başlangıç çözümü fare bakışı için
[PointerLockControls](https://threejs.org/docs/pages/PointerLockControls.html),
basitleştirilmiş sabit çarpışma geometrisinde kapsül sorguları için
[Octree](https://threejs.org/docs/pages/Octree.html) kullanmaktır. Merdiven,
dinamik kapı ve araç davranışları ayrıca uygulanır; bu sınıflar tek başına tam
yürüme sistemi sağlamaz.

Fare kilidi kullanıcı tıklamasıyla başlatılır, başarısızlık ve destek durumu
masaüstü tarayıcılarda ele alınır. Tarayıcı koşulları:
[MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).

Önerilen sorumluluk dağılımı; dosya isimleri uygulama sırasında netleşebilir:

| Dosya/alan | Sorumluluk |
| --- | --- |
| `src/VisualOverview.jsx` | Gezintiye giriş/çıkış, kampüs başlangıcı ve turla kontrol geçişi. |
| `src/PlantScene.jsx` | Tek kamera sahibini etkinleştirme, yürüyüş güncellemesi, görünürlük ve sahne döngüsüne bağlantı. |
| `src/App.jsx` | Escape ve ayrıntı pencerelerinin gezintiyle çakışmasını önleme. |
| Yeni `src/industrial/walkController.js` | Girdi, bakış, kapsül hareketi, zemin/basamak ve güvenli dönüş. |
| Yeni `src/industrial/walkWorld.js` | Bina/giriş kayıtları, sabit ve hareketli engeller, katlar, başlangıçlar ve etkileşim hedefleri. |
| Yeni `src/industrial/doors.js` | Kapı mekanizması, durum geçişi, engel kontrolü ve animasyon. |
| Bina kurucuları ve `siteLayout.js` | İçi boş kabuklar, gerçek geçiş boşlukları ve aynı ölçüden üretilen görsel/çarpışma verisi. |
| `kit.js` / `surfaceBatching.js` | Hareketli kapı sahipliği ve bina bazındaki görünürlük sınırlarını koruma. |
| Trafik/lojistik modülleri | Oyuncu yakınındaki bekleme ve kapı geçişini mevcut zaman/teslimat hesabıyla birlikte yönetme. |
| Arayüz ve stiller | Kontrol açıklaması, etkileşim ipucu, bulunulan alan ve gezinti menüsü. |

Çarpışma geometrisi ayrı ve sade tutulur; bütün render sahnesinden otomatik
üretilmez. Böylece dekorlar görünmez engel olmaz ve render optimizasyonu kapı
kimliklerini silemez. İlk sürüm için ek fizik motoru bağımlılığı gerekli
görünmüyor; sonraki sürüş aşaması kendi ihtiyaçlarına göre değerlendirilir.

Üç görünüm açıkça ayrılır: genel dış görünüm, mevcut kesit görünümü ve gezinti.
Gezinti sırasında kabuk, çatı ve gerekli içler beraber görünür; otomatik tur
kamerayı devralmaz. Çıkışta önceki görünüm geri gelir.

## Uygulama sırası ve her adımın çıktısı

1. **Bina envanteri ve bağlantılar.** İki kampüsteki bütün binalar, kapılar,
   katlar ve eksik iç modeller listelenir. Dış/iç uyuşmazlıklar tespit edilir;
   önerilen güzergâhlar ve temsili alanlar görünür bir listede tutulur.
2. **İki kampüste uçtan uca örnek rota.** Her fabrikada bir giriş → avlu →
   açılan kapı → üretim alanı → çıkış yolu çalışır. WASD, bakış, çarpışma,
   Escape, duraklatılmış sahnede yürüme ve görünüm geri dönüşü birlikte doğrulanır.
3. **Bütün binalar ve katlar.** Envanterdeki kalan kabuklar/içler tamamlanır;
   depolar, ofis, yatakhane, yemek salonu, servis binaları ve proses katları
   bağlanır. Merdiven, eşik, iç ışık ve tavanlar göz seviyesinde kontrol edilir.
4. **Kapılar, araçlar ve üretim etkileşimi.** Kapı tipleri ve engel davranışı
   tamamlanır; hareketli araçların oyuncuyla karşılaşması ve makine bilgi
   panelleri bağlanır. Araçların çevresinde yaya dolaşımı doğrulanır.
5. **Performans ve teslim.** Bina/yakınlık bazında ayrıntı yönetimi, eski
   görünümlerle regresyon kontrolü, bilgisayarda klavye/fare denemesi ve hedef
   dağıtım biçimlerinde doğrulama tamamlanır.

## Performans ve doğrulama

- Gezinti sırasında görünür iç/dış geometri arttığı için mevcut FPS sonucu
  yeni moda doğrudan taşınamaz. Masaüstünde 60 FPS hedeflenir; garanti verilmez.
  Gerçek test cihazı, çözünürlük, profil ve kare süreleri kaydedilir.
- İçerideyken uzaktaki görünmeyen binaların pahalı ayrıntıları azaltılır;
  kapılardan/pencerelerden görünen alanlar kaybolmaz. Çarpışma nesnelerinin
  kullanılabilirliği görsel ayrıntı seviyesine bağlı olmaz.
- Yakın kamera için görüş açısı/yakın kesme mesafesi ve AO ayarı ayrı ele alınır;
  mevcut uzak kamera-hedef mesafesi gezinti kalite hesabı olarak kullanılmaz.
- `node --test` kapsamına hareketin kare hızından bağımsızlığı, duvar/köşe,
  eşik/merdiven, kat boşlukları, kapıda sıkışma, hareketli araç ve güvenli
  başlangıç/dönüş senaryolarını ispatlayan hedefli testler eklenir.
- Tarayıcıda fare kilidi giriş/çıkış, odak kaybı, panel etkileşimi ve modlar
  arası geçiş denenir. Model/rota testleri tek başına kullanıcı deneyimini
  doğrulamaz; iki kampüste göz seviyesinde yürüyüş yapılır.
- Her binanın rotası envanterde geçti/kaldı olarak işaretlenir; tamamlanmamış
  binalar varken bütün tesisin gezilebilir olduğu söylenmez.
- Mevcut test paketi ve `npm run build` çalışır. Teslim hedefi `/zawod/` veya
  tek HTML ise ilgili paket ayrıca doğrulanır; sunucuya yayın ayrı iştir.

## Kabul koşulları

1. Eski ve yeni fabrikada WASD/fareyle göz seviyesinde yürünebilir ve iki
   kampüsün belirlenen fiziksel bağlantısından geçilebilir.
2. Bina envanterindeki her erişilebilir oda/kat girişten yürüyerek ulaşılabilir;
   eksik veya temsili alanların durumu açıkça kayıtlıdır.
3. Kapalı kapı engeller, açık kapı geçiş sağlar; kapı oyuncuyu/araçları sıkıştırmaz.
4. Duvar, makine, araç ve kat döşemelerinde istenmeyen geçme/düşme olmaz;
   merdivenler ve rampalar iki yönde kullanılabilir.
5. Araç geçişleri oyuncuya göre bekleyebilir; üretim/yükleme zamanlaması bozulmaz.
6. Esc, panel açma, odak kaybı ve gezintiden çıkış sonrası kontrol takılı kalmaz;
   genel görünüm ve kesit turu çalışmaya devam eder.
7. Bilgisayarda klavye/fare kontrolleri ve performans doğrulanır; kullanılan
   tarayıcı, cihaz ve çözünürlük kaydedilir.

## 25 Ekim uygulama ve doğrulama kaydı

- `Pyýada` menüsünden eski/yeni giriş, yeni üretim kapısı ve eski ofis
  başlangıçları seçilebilir. Trackpad varsayılan seçenektir; basılı sürükleme
  bakışı, WASD yürümeyi sağlar. Ok tuşlarıyla bakış da kullanılabilir.
  Fare kilidi başarısız olursa sürükleme modu çalışır.
- 33 bina/bölüm ve 59 hareketli kapı kaydedildi. Bitişik odalar aynı konumdaki
  kapıyı paylaşır. Kaynak kutulardan iç hacim ve giriş boşlukları çıkarılır;
  normal dış görünüş ve kesit sahipliği korunur.
- 1,65 m göz yüksekliği, eşik/merdiven takibi, baş boşluğu, duvar kayması,
  park ve hareketli araç hacimleri, oyuncu yolundayken trafik beklemesi eklendi.
  Çarpışma kaydı 8 metrelik hücrelerle sorgulanan basit hacimler kullanır.
- Eski ofisin iki merdiven kolu ve küçük ön proses kulesine yeni iç merdiven
  doğrulandı. Yatakhane bölmeleri yükseltildi ve dört oda kapısı hareketli yapıldı.
- E ile kapı ve bilgi noktası, Esc/odak kaybında durma, başlangıca dönme ve
  genel görünüme geri dönüş eklendi. Fare/trackpad kullanımı araç sürüşü içermez.
- Dışarı taşan alçı silo besleme kolu, silolarla birlikte güncel arka bina
  sınırlarına taşındı; nozullar ve hat uçları ortak yerleşim verisini kullanır.
- `npm test`: 123 test başarılı. Gezinti testleri her kayıtlı bina için en az
  bir açık giriş, merdivenler, kapı hareketi, kare hızı ve boru sınırlarını kapsar.
  `npm run build` başarılı. Tam masaüstü geometri birleştirme kontrolünde
  geçersiz koordinat bulunmadı.
- Codex uygulama içi tarayıcıda yeni üretim ve eski ofis kapıları E ile açılarak
  içeri yüründü; trackpad sürüklemesi ve Esc menü dönüşü denendi. Yakın dış
  görünüşte bildirilen boru taşmasının giderildiği görüldü.

### Kapsamın mevcut sınırları

Giriş testleri her odanın ve bütün teknik katların uçtan uca kabulü anlamına
gelmez. Büyük proses kulesi ve arka ekipman galerileri eski temsili yerleşimi
korur; bunların tamamının yeni kademeli dış kabukla uyumu henüz doğrulanmadı.
Mevcut platformlara çarpışma uygulanır; bilinmeyen iç alanlar temsili olarak
etiketlenir. İki kampüs arasındaki uzun yürüyüş rotası ve tüm trafik senaryoları
ayrıca taranmalıdır. Saha ölçüsünde geometri veya her cihazda 60 FPS iddiası yoktur.

