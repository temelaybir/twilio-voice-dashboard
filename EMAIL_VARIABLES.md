# 📧 Email Şablon Değişkenleri Kılavuzu

Bu dokümantasyon, email şablonlarında kullanılabilecek tüm değişkenleri ve kullanım senaryolarını açıklar.

---

## 📋 Değişken Listesi

### 👤 Abone Değişkenleri
Aboneye özel bilgiler - her abone için farklı değerler.

| Değişken | Açıklama | Örnek Değer | Kaynak |
|----------|----------|-------------|--------|
| `{{name}}` | Ad Soyad (fullName veya firstName+lastName) | Halil Gürel | Abone kaydı |
| `{{fullName}}` | Tam ad | Halil Gürel | Abone kaydı |
| `{{firstName}}` | Ad | Halil | Abone kaydı |
| `{{lastName}}` | Soyad | Gürel | Abone kaydı |
| `{{email}}` | Email adresi | test@example.com | Abone kaydı |
| `{{phone}}` | Telefon numarası | +48123456789 | Abone kaydı |
| `{{city}}` | Abonenin şehri | Warsaw | Abone kaydı |
| `{{stage}}` | Satış aşaması | Hot Lead | Abone kaydı |
| `{{eventDate}}` | Abonenin randevu tarihi | 30 listopada | Abone kaydı |
| `{{eventTime}}` | Abonenin randevu saati | 09:00-12:30 | Abone kaydı |

---

### 📅 Liste (Etkinlik) Değişkenleri
Liste/etkinlik bazlı bilgiler - aynı listedeki tüm aboneler için aynı değerler.

| Değişken | Açıklama | Örnek Değer | Kaynak |
|----------|----------|-------------|--------|
| `{{listName}}` | Liste adı | Bydgoszcz | Liste kaydı |
| `{{listCity}}` | Etkinlik şehri | Bydgoszcz | Liste kaydı |
| `{{listCityDisplay}}` | Şehir adı (Lehçe locative) | Bydgoszczy | Liste kaydı |
| `{{listEventDates}}` | Etkinlik tarihleri | 30 listopada - 1 grudnia | Liste kaydı |
| `{{listLocation}}` | Etkinlik konumu/adresi | Hotel Mercure Bydgoszcz Sepia, ul. Focha 20, 85-070 Bydgoszcz | Liste kaydı |

---

### 🔗 Sistem Değişkenleri
Otomatik oluşturulan linkler ve sistem bilgileri.

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `{{confirmUrl}}` | Randevu onay linki | https://happysmileclinics.net/api/email/confirm/abc123... |
| `{{unsubscribeUrl}}` | Abonelik iptal linki | https://happysmileclinics.net/api/email/unsubscribe/xyz789... |
| `{{subject}}` | Email konusu | Przypomnienie o wizycie |

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Randevu Hatırlatma Emaili

**Amaç:** Hastaya randevusunu hatırlatmak ve onay almak.

```html
<h1>Twoje spotkanie dentystyczne w {{listCityDisplay}}</h1>

<p>
  Witam <strong>{{name}}</strong>,<br />
  przypominamy o Twoim spotkaniu w {{listCityDisplay}}, które odbędzie się
  <strong>{{listEventDates}}</strong> o <strong>{{eventTime}}</strong>.
</p>

<div class="details">
  <p class="label">Miejsce</p>
  <p class="value">{{listLocation}}</p>

  <p class="label">Data i godzina</p>
  <p class="value">{{listEventDates}}, {{eventTime}}</p>
</div>

<a href="{{confirmUrl}}">Potwierdź wizytę</a>
```

**Sonuç:**
> Twoje spotkanie dentystyczne w **Bydgoszczy**
> 
> Witam **Halil Gürel**,
> przypominamy o Twoim spotkaniu w **Bydgoszczy**, które odbędzie się **30 listopada - 1 grudnia** o **09:00-12:30**.

---

### Senaryo 2: Kişiselleştirilmiş Satış Emaili

**Amaç:** Potansiyel müşteriye özel teklif sunmak.

```html
<p>Cześć {{firstName}}!</p>

<p>
  Widzimy, że jesteś zainteresowany wizytą w {{listCity}}. 
  Mamy dla Ciebie specjalną ofertę!
</p>

<p>
  📍 Lokalizacja: {{listLocation}}<br>
  📅 Dostępne terminy: {{listEventDates}}<br>
  📞 Kontakt: {{phone}}
</p>

<p>Status: {{stage}}</p>
```

---

### Senaryo 3: Onay Sonrası Bilgilendirme

**Amaç:** Randevu onaylandıktan sonra detaylı bilgi göndermek.

```html
<h2>Dziękujemy za potwierdzenie, {{name}}!</h2>

<p>Twoja wizyta została potwierdzona:</p>

<ul>
  <li><strong>Data:</strong> {{eventDate}}</li>
  <li><strong>Godzina:</strong> {{eventTime}}</li>
  <li><strong>Miejsce:</strong> {{listLocation}}</li>
  <li><strong>Miasto:</strong> {{listCity}}</li>
</ul>

<p>
  Jeśli potrzebujesz zmienić termin, kliknij tutaj:
  <a href="{{confirmUrl}}">Zmień termin</a>
</p>
```

---

## 📊 Değişken Kaynakları

### Abone Kaydından Gelen Değişkenler

Aboneler oluşturulurken veya toplu import sırasında doldurulan alanlar:

```
Subscriber {
  email        → {{email}}
  fullName     → {{fullName}}, {{name}}
  firstName    → {{firstName}}
  lastName     → {{lastName}}
  phone        → {{phone}}
  city         → {{city}}
  stage        → {{stage}}
  eventDate    → {{eventDate}}
  eventTime    → {{eventTime}}
}
```

### Liste Kaydından Gelen Değişkenler

Liste oluşturulurken/düzenlenirken doldurulan alanlar:

```
List {
  name         → {{listName}}
  city         → {{listCity}}
  cityDisplay  → {{listCityDisplay}}
  eventDates   → {{listEventDates}}  (otomatik: eventDay1 + eventDay2)
  eventDay1    → (dahili kullanım - portalda gün seçimi)
  eventDay2    → (dahili kullanım - portalda gün seçimi)
  location     → {{listLocation}}
}
```

---

## ⚠️ Önemli Notlar

### 1. Liste Değişkenleri Boş Olabilir

Eğer liste oluşturulurken etkinlik detayları doldurulmadıysa, `{{listCity}}`, `{{listCityDisplay}}`, `{{listEventDates}}`, `{{listLocation}}` değişkenleri **boş** kalır.

**Çözüm:** Liste düzenleme ekranından tüm alanları doldurun.

### 2. Lehçe Şehir Adı (Locative Form)

Lehçe dilinde "-w" (içinde) edatından sonra şehir adı değişir:

| Şehir | Nominative | Locative (w + ...) |
|-------|------------|-------------------|
| Bydgoszcz | Bydgoszcz | w Bydgoszczy |
| Olsztyn | Olsztyn | w Olsztynie |
| Warszawa | Warszawa | w Warszawie |
| Kraków | Kraków | w Krakowie |

**Kullanım:**
- `{{listCity}}` → Bydgoszcz (şehir adı)
- `{{listCityDisplay}}` → Bydgoszczy (w + şehir)

```html
<!-- Doğru kullanım -->
<p>Spotkanie w {{listCityDisplay}}</p>

<!-- Yanlış kullanım -->
<p>Spotkanie w {{listCity}}</p>  <!-- "w Bydgoszcz" - dilbilgisi hatası -->
```

### 3. Fallback Değerler

Eğer bir değişken boşsa, sistem boş string döner. Kritik alanlarda fallback kullanın:

```html
<!-- Abone adı yoksa varsayılan değer -->
Witam {{name}},  <!-- Boşsa hiçbir şey yazmaz -->

<!-- Backend'de otomatik fallback var -->
name: fullName || 'Değerli Müşterimiz'
```

### 4. Abone vs Liste Değişkenleri

| Durum | Abone Değişkeni | Liste Değişkeni |
|-------|-----------------|-----------------|
| Her abone için farklı | ✅ `{{eventTime}}` | ❌ |
| Tüm liste için aynı | ❌ | ✅ `{{listEventDates}}` |
| Abone değiştirdiğinde | Güncellenir | Değişmez |

**Örnek:**
- Abone kendi saatini değiştirdi → `{{eventTime}}` güncellenir
- Liste tarihleri değişti → `{{listEventDates}}` tüm aboneler için güncellenir

---

## 🔧 Toplu Import Eşleştirmesi

Excel/CSV dosyasından import yaparken kullanılabilecek sütun eşleştirmeleri:

| Hedef Alan | Değişken | Import Önerilen Sütunlar |
|------------|----------|--------------------------|
| Email | `{{email}}` | email, e-mail, mail, work email |
| Tam Ad | `{{fullName}}` | name, full name, ad soyad, main contact |
| Ad | `{{firstName}}` | first name, ad, isim |
| Soyad | `{{lastName}}` | last name, soyad |
| Telefon | `{{phone}}` | phone, telefon, mobile, gsm |
| Şehir | `{{city}}` | city, şehir, il |
| Aşama | `{{stage}}` | stage, aşama, lead stage, status |
| Etkinlik Tarihi | `{{eventDate}}` | event date, tarih, date |
| Etkinlik Saati | `{{eventTime}}` | event time, saat, time |

---

## 📝 Şablon Oluşturma Checklist

Email şablonu oluştururken kontrol edin:

- [ ] `{{name}}` veya `{{fullName}}` kullanıldı mı?
- [ ] `{{listCityDisplay}}` Lehçe cümlelerde kullanıldı mı?
- [ ] `{{listLocation}}` adres için eklendi mi?
- [ ] `{{listEventDates}}` tarih bilgisi için eklendi mi?
- [ ] `{{eventTime}}` kişisel saat bilgisi için eklendi mi?
- [ ] `{{confirmUrl}}` onay butonu için eklendi mi?
- [ ] Liste detayları (şehir, tarih, konum) dolduruldu mu?

---

## 🧪 Test Senaryosu

Yeni şablon test ederken:

1. **Doğru listeyi seç** - Liste etkinlik detayları dolu olmalı
2. **Test abonesi oluştur** - Tüm alanları dolu bir abone
3. **Önizleme yap** - Değişkenler doğru değişiyor mu?
4. **Test maili gönder** - Gerçek email kontrol et

---

*Son güncelleme: Kasım 2025*

