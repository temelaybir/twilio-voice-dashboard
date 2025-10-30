# 📊 Günlük Çağrı Raporu Sistemi

Twilio çağrı istatistiklerinizi otomatik olarak email ile alın!

## ✨ Özellikler

- ✅ **Otomatik Günlük Raporlar**: Cron job ile zamanlanmış email gönderimi
- ✅ **Detaylı İstatistikler**: Gelen/giden çağrılar, süre, başarı oranı
- ✅ **Modern HTML Email**: Profesyonel ve responsive tasarım
- ✅ **Kolay Kurulum**: 5 dakikada kurulum ve test
- ✅ **Plesk Uyumlu**: Plesk cron job ile çalışır
- ✅ **Dashboard Entegrasyonu**: Web dashboard'dan da görüntülenebilir
- ✅ **Gerçek TalkYto Çağrıları**: Yönlendirme numaraları filtrelenir

## 🚀 Hızlı Başlangıç

### 1️⃣ Setup Sihirbazını Çalıştırın

```bash
npm run setup:email
```

Bu komut size email ayarlarınızı soracak ve otomatik olarak `.env` dosyasına ekleyecek.

### 2️⃣ Backend'i Başlatın

```bash
npm run dev
```

### 3️⃣ İlk Raporu Gönderin

```bash
# Bugünün raporu
npm run report

# Dünün raporu  
npm run report:yesterday
```

### 4️⃣ Email'inizi Kontrol Edin! 📬

**Tebrikler!** İlk günlük raporunuzu aldınız! 🎉

---

## 📂 Dosya Yapısı

```
nodejs-twilio-happy/
├── scripts/
│   ├── daily-email-report.js      # Ana email rapor script'i
│   └── setup-email.js              # Email kurulum sihirbazı
├── routes/
│   └── voice.js                    # Backend API (daily-summary endpoint)
├── voice-dashboard/
│   └── src/
│       └── app/
│           └── call-summary/       # Web dashboard sayfası
│               └── page.tsx
├── EMAIL_REPORT_QUICKSTART.md      # Hızlı başlangıç rehberi
├── EMAIL_REPORT_SETUP.md           # Detaylı kurulum dokümantasyonu
└── .env                            # Email ayarları burada
```

---

## ⚙️ Komutlar

| Komut | Açıklama |
|-------|----------|
| `npm run setup:email` | Email ayarlarını interaktif olarak ekle |
| `npm run report` | Bugünün raporunu email ile gönder |
| `npm run report:yesterday` | Dünün raporunu email ile gönder |
| `node scripts/daily-email-report.js --date=2025-10-30` | Belirli tarih raporu |

---

## ⏰ Plesk Cron Job Kurulumu

### Adım 1: Plesk → Scheduled Tasks

### Adım 2: Yeni Task Ekle

**Her gün saat 09:00'da dünün raporu:**

```bash
0 9 * * * cd /var/www/vhosts/yourdomain.com/nodejs-twilio-happy && /usr/bin/node scripts/daily-email-report.js --yesterday
```

### Adım 3: PM2 ile Backend'i Sürekli Çalıştır

```bash
# PM2 kur
npm install -g pm2

# Backend'i başlat
pm2 start server.js --name twilio-backend

# Otomatik başlatma
pm2 startup
pm2 save
```

---

## 📧 Email İçeriği

Email raporları şunları içerir:

### 📊 Özet İstatistikler
- **Gelen Çağrılar**: Toplam, yanıtlanan, kaçırılan, kaçırma oranı
- **Giden Çağrılar**: Toplam, tamamlanan, başarısız
- **Süre İstatistikleri**: Ortalama, maksimum, toplam

### 📋 Çağrı Detayları
- İlk 10 gelen çağrı (saat, arayan, durum, süre)
- İlk 10 giden çağrı (saat, aranan, durum, süre)

### 🎨 Görsel Tasarım
- Modern gradient header
- Renkli istatistik kartları
- Responsive tablolar
- Mobil uyumlu

---

## 🔧 Yapılandırma

`.env` dosyasında aşağıdaki parametreleri yapılandırabilirsiniz:

```bash
# Backend API
BACKEND_API_URL=http://localhost:3001

# SMTP Ayarları
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Kimlik Bilgileri
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=your_app_password

# Gönderici ve Alıcı
EMAIL_FROM=youremail@gmail.com
EMAIL_TO=recipient@example.com

# Klinik Bilgileri
CLINIC_NAME=Happy Smile Clinics
```

---

## 🔐 Gmail Kurulumu

Gmail kullanıyorsanız **App Password** gerekir:

1. https://myaccount.google.com/apppasswords
2. **App**: Mail, **Device**: Other (Twilio Report)
3. **Generate** → 16 karakterlik şifreyi kopyala
4. `.env` dosyasına ekle

**Not:** Normal Gmail şifresi çalışmaz, App Password şarttır!

---

## 🌐 Web Dashboard

Email raporunun yanı sıra web dashboard'dan da çağrı özetlerini görüntüleyebilirsiniz:

```bash
# Frontend'i başlat
cd voice-dashboard
npm run dev
```

Dashboard: http://localhost:3000/call-summary

---

## 📊 Backend API

Email script'i backend API'yi kullanır:

```bash
# Günlük özet çek
GET /api/calls/daily-summary?date=2025-10-30&direction=all

# Sadece gelen
GET /api/calls/daily-summary?date=2025-10-30&direction=inbound

# Sadece giden
GET /api/calls/daily-summary?date=2025-10-30&direction=outbound

# Debug mode (son 30 gün)
GET /api/calls/daily-summary?debug=true&direction=outbound
```

---

## 🐛 Sorun Giderme

### Email Gelmiyor

1. **Spam klasörünü** kontrol edin
2. **Script çıktısını** kontrol edin:
   ```bash
   npm run report
   ```
3. **SMTP ayarlarını** doğrulayın

### Backend Hatası

```bash
# Backend çalışıyor mu?
curl http://localhost:3001/api/calls/daily-summary?date=2025-10-30

# Backend'i başlat
npm run dev
```

### Cron Job Çalışmıyor

```bash
# Cron loglarını kontrol et
grep CRON /var/log/syslog

# Script'i manuel test et
cd /var/www/vhosts/yourdomain.com/nodejs-twilio-happy
node scripts/daily-email-report.js --yesterday
```

---

## 📚 Detaylı Dokümantasyon

- **Hızlı Başlangıç**: [EMAIL_REPORT_QUICKSTART.md](./EMAIL_REPORT_QUICKSTART.md)
- **Detaylı Kurulum**: [EMAIL_REPORT_SETUP.md](./EMAIL_REPORT_SETUP.md)
- **Web Dashboard**: [voice-dashboard/CALL_SUMMARY_DOCS.md](./voice-dashboard/CALL_SUMMARY_DOCS.md)

---

## 🎯 Örnek Kullanım Senaryoları

### Senaryo 1: Günlük Sabah Raporu
Her sabah 09:00'da önceki günün raporu:
```bash
0 9 * * * node scripts/daily-email-report.js --yesterday
```

### Senaryo 2: Günlük Akşam Raporu  
Her akşam 23:00'te günün raporu:
```bash
0 23 * * * node scripts/daily-email-report.js
```

### Senaryo 3: Hafta İçi Raporu
Sadece Pazartesi-Cuma sabah 08:00:
```bash
0 8 * * 1-5 node scripts/daily-email-report.js --yesterday
```

### Senaryo 4: Manuel Rapor
Belirli bir tarihin raporu:
```bash
node scripts/daily-email-report.js --date=2025-10-15
```

---

## 💡 İpuçları

### Çoklu Alıcı

Birden fazla kişiye rapor gönderin:
```bash
EMAIL_TO=email1@example.com,email2@example.com,email3@example.com
```

### Production Kullanımı

Production'da backend URL'i güncelleyin:
```bash
BACKEND_API_URL=https://yourdomain.com
```

### Log Dosyası

Cron job çıktılarını kaydedin:
```bash
0 9 * * * node scripts/daily-email-report.js --yesterday >> /var/log/twilio-report.log 2>&1
```

### Test Modu

Gerçek email göndermeden test:
```bash
# Script'i çalıştırın ve çıktıyı kontrol edin
npm run report
# Email gönderme kısmını yorum satırına alabilirsiniz
```

---

## ✅ Kurulum Checklist

- [ ] `npm install` çalıştırıldı
- [ ] `npm run setup:email` ile email ayarları eklendi
- [ ] Gmail App Password oluşturuldu
- [ ] Backend başlatıldı (`npm run dev`)
- [ ] Email test edildi (`npm run report`)
- [ ] Email başarıyla alındı
- [ ] Plesk cron job kuruldu
- [ ] PM2 ile backend production'da sürekli çalışıyor

---

## 🎉 Başarılı Kurulum Örneği

```bash
$ npm run setup:email
✅ Email ayarları başarıyla .env dosyasına eklendi!

$ npm run dev
✅ Server running on port 3001

$ npm run report
🚀 Günlük Email Raporu Script Başlatıldı
══════════════════════════════════════════════════
📅 Rapor tarihi: 2025-10-30
✅ Veri başarıyla çekildi
📊 İstatistikler:
   - Gelen: 10 (Yanıtlanan: 8)
   - Giden: 5 (Tamamlanan: 4)
   - Toplam: 15 çağrı
✅ Email başarıyla gönderildi!
📬 Alıcı: recipient@example.com
══════════════════════════════════════════════════
✅ İşlem başarıyla tamamlandı!
```

---

## 📞 Destek

Sorun yaşarsanız:

1. Log çıktılarını kontrol edin
2. Dokümantasyonu okuyun
3. Script'i manuel test edin: `npm run report`

---

**İyi çalışmalar! 🚀**

*Twilio Voice Dashboard - Günlük Çağrı Raporu Sistemi*

