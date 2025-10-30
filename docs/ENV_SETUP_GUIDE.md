# 🔧 Environment Variables Kurulum Rehberi

## #PolishCallSummary Env

Günlük Çağrı Özeti modülü için ayrı Twilio hesap bilgileri kullanılmaktadır.

## Gerekli Değişkenler

`.env` dosyanıza aşağıdaki satırları **mutlaka** ekleyin:

```bash
#PolishCallSummary Env
# Günlük Çağrı Özeti için Ayrı Twilio Hesap Bilgileri
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx
```

## Neden Ayrı Değişkenler?

1. **Ana Hesap Ayrımı**: Mevcut `TWILIO_ACCOUNT_SID` ve `TWILIO_AUTH_TOKEN` diğer işlemler için kullanılıyor
2. **Farklı Hesaplar**: Günlük özet farklı bir Twilio hesabı/subaccount'tan veri çekiyor
3. **Telefon Numarası Filtreleme**: `TWILIO_DAILY_SUMMARY_PHONE_NUMBER` ile sadece belirli bir numaranın çağrıları raporlanıyor
   - **Inbound**: Bu numaraya gelen çağrılar
   - **Outbound**: Bu numaradan giden çağrılar (TalkYto dahil)
4. **İzolasyon**: Her modül kendi Twilio client'ını kullanıyor
5. **Esneklik**: İstediğiniz hesaptan ve numaradan veri çekebilirsiniz

## Tam .env Dosya Örneği

```bash
# ==================================================
# TWILIO CONFIGURATION - ANA İŞLEMLER
# ==================================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+90xxxxxxxxxx
TWILIO_FLOW_SID=FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ==================================================
# #PolishCallSummary Env
# GÜNLÜK ÇAĞRI ÖZETİ - AYRI HESAP
# ==================================================
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx

# ==================================================
# SERVER CONFIGURATION
# ==================================================
PORT=3001
NGROK_URL=https://xxxx-xx-xxx-xxx-xxx.ngrok.io

# ==================================================
# FRONTEND CONFIGURATION
# ==================================================
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Adım Adım Kurulum

### 1. .env Dosyasını Açın
```bash
# Ana dizinde .env dosyasını düzenleyin
nano .env
# veya
code .env
```

### 2. Yeni Satırları Ekleyin
Dosyanın sonuna veya uygun bir yerine ekleyin:

```bash
#PolishCallSummary Env
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=your_account_sid_here
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=your_auth_token_here
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx
```

### 3. Twilio Bilgilerinizi Girin

#### Twilio Console'dan Account SID ve Auth Token alma:
1. https://console.twilio.com adresine gidin
2. Sol menüden ilgili hesabı/projeyi seçin
3. Dashboard'da **Account SID** ve **Auth Token** göreceksiniz
4. Bu değerleri `.env` dosyanıza yapıştırın

#### Telefon Numarası:
1. Twilio Console'da **Phone Numbers** > **Manage** > **Active Numbers** bölümüne gidin
2. Rapor almak istediğiniz Twilio telefon numarasını kopyalayın
3. Formatı: `+90xxxxxxxxxx` (ülke kodu ile birlikte)
4. Bu değeri `TWILIO_DAILY_SUMMARY_PHONE_NUMBER` olarak `.env` dosyanıza ekleyin

**Önemli**: Bu telefon numarası, günlük raporda görünecek çağrıları belirler:
- **Inbound (Gelen)**: Bu numaraya gelen tüm çağrılar
- **Outbound (Giden)**: Bu numaradan giden tüm çağrılar (TalkYto dahil)

### 4. Kaydedin ve Backend'i Yeniden Başlatın

```bash
# Backend'i durdurun (Ctrl + C)
# Sonra tekrar başlatın
npm start
```

## Kontrol Etme

Backend başladığında terminalde şu log'u göreceksiniz:

```
[INFO] Daily Summary için ayrı Twilio client oluşturuldu
[DEBUG] Daily Summary Account SID: ACxxxxxxxx...
```

## Hata Durumları

### ❌ Hata: "Daily Summary için Twilio kimlik bilgileri tanımlanmamış"

**Sebep**: `.env` dosyasında Account SID veya Auth Token yok

**Çözüm**:
```bash
# Değişken isimlerini kontrol edin (büyük/küçük harf önemli!)
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=ACxxxx...
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=xxxx...
```

### ❌ Hata: "Daily Summary için telefon numarası tanımlanmamış"

**Sebep**: `.env` dosyasında `TWILIO_DAILY_SUMMARY_PHONE_NUMBER` yok

**Çözüm**:
```bash
# Telefon numarasını ülke kodu ile birlikte ekleyin
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx
```

### ❌ Hata: "Twilio Error 20003: Authentication Error"

**Sebep**: Account SID veya Auth Token yanlış

**Çözüm**:
1. Twilio Console'dan değerleri tekrar kopyalayın
2. Başında/sonunda boşluk olmadığından emin olun
3. Değerleri tırnak içine almayın

### ✅ Doğru Kullanım

```bash
# ✅ Doğru
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=AC1234567890abcdef1234567890abcd
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+905551234567

# ❌ Yanlış - Tırnak kullanmayın
TWILIO_DAILY_SUMMARY_ACCOUNT_SID="AC1234567890abcdef1234567890abcd"
TWILIO_DAILY_SUMMARY_PHONE_NUMBER="+905551234567"

# ❌ Yanlış - Boşluk bırakmayın
TWILIO_DAILY_SUMMARY_ACCOUNT_SID = AC1234567890abcdef1234567890abcd
TWILIO_DAILY_SUMMARY_PHONE_NUMBER = +905551234567

# ❌ Yanlış - Ülke kodu olmadan
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=5551234567
```

## Test Etme

Kurulumun doğru olduğunu test etmek için:

```bash
# Terminal'de
curl http://localhost:3001/api/calls/daily-summary

# Veya tarayıcıda
http://localhost:3000/call-summary
```

Başarılı ise veri dönecektir. Hata varsa console/terminal'de hata mesajını göreceksiniz.

## Güvenlik Notları

⚠️ **Önemli Güvenlik Uyarıları**:

1. `.env` dosyasını **asla** Git'e commit etmeyin
2. `.gitignore` dosyasında `.env` olduğundan emin olun
3. Auth Token'ları kimseyle paylaşmayın
4. Production'da environment variables'ı güvenli bir şekilde yönetin

## Yardım ve Destek

Sorun yaşıyorsanız:

1. Backend terminalindeki log'ları kontrol edin
2. Browser console'da hata mesajlarına bakın
3. `CALL_SUMMARY_DOCS.md` dosyasındaki sorun giderme bölümünü okuyun
4. Twilio hesabınızın aktif olduğundan emin olun

---

**Son Güncelleme**: 30 Ekim 2024  
**Modül**: Daily Call Summary (#PolishCallSummary)

