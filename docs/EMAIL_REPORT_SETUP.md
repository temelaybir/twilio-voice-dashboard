# Günlük Email Raporu Kurulumu

Bu dokümantasyon, günlük çağrı özetinin email olarak otomatik gönderilmesi için gerekli kurulumu açıklar.

## 📋 İçindekiler

1. [Email Ayarları](#email-ayarları)
2. [Script Kullanımı](#script-kullanımı)
3. [Plesk Cron Job Kurulumu](#plesk-cron-job-kurulumu)
4. [Gmail Ayarları](#gmail-ayarları)
5. [Sorun Giderme](#sorun-giderme)

---

## 📧 Email Ayarları

`.env` dosyanıza aşağıdaki satırları ekleyin:

```bash
# Email Ayarları (Günlük Rapor için)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=your_email@gmail.com
EMAIL_TO=recipient@example.com

# Backend API URL
BACKEND_API_URL=http://localhost:3001

# Klinik Bilgileri (Email'de gösterilecek)
CLINIC_NAME=Happy Smile Clinics
```

### Parametreler:

- **EMAIL_HOST**: SMTP sunucu adresi (Gmail için: `smtp.gmail.com`)
- **EMAIL_PORT**: SMTP port (587 veya 465)
- **EMAIL_SECURE**: `true` (port 465) veya `false` (port 587)
- **EMAIL_USER**: Gönderen email adresi
- **EMAIL_PASSWORD**: Email şifresi (Gmail için App Password)
- **EMAIL_FROM**: Gönderen email (genelde EMAIL_USER ile aynı)
- **EMAIL_TO**: Raporu alacak email adresi (virgülle ayırarak birden fazla eklenebilir)
- **BACKEND_API_URL**: Backend API URL'i (localhost veya production URL)
- **CLINIC_NAME**: Email'de gösterilecek klinik adı

---

## 🚀 Script Kullanımı

### Manuel Test

Script'i manuel olarak test etmek için:

```bash
# Bugünün raporu
node scripts/daily-email-report.js

# Dünün raporu
node scripts/daily-email-report.js --yesterday

# Belirli bir tarih
node scripts/daily-email-report.js --date=2025-10-30
```

### Beklenen Çıktı

```
🚀 Günlük Email Raporu Script Başlatıldı
══════════════════════════════════════════════════
📅 Rapor tarihi: 2025-10-30
🔍 Backend kontrol ediliyor: http://localhost:3001
📡 API çağrısı yapılıyor: http://localhost:3001/api/calls/daily-summary?date=2025-10-30&direction=all
✅ Veri başarıyla çekildi
📊 İstatistikler:
   - Gelen: 10 (Yanıtlanan: 8)
   - Giden: 5 (Tamamlanan: 4)
   - Toplam: 15 çağrı
📧 Email gönderiliyor...
✅ Email başarıyla gönderildi: <message-id>
📬 Alıcı: recipient@example.com
══════════════════════════════════════════════════
✅ İşlem başarıyla tamamlandı!
```

---

## ⏰ Plesk Cron Job Kurulumu

### Adım 1: Plesk Panel'e Giriş

1. Plesk Panel'e giriş yapın
2. İlgili domain'i seçin
3. **"Scheduled Tasks"** veya **"Zamanlanmış Görevler"** menüsüne tıklayın

### Adım 2: Yeni Cron Job Oluştur

**Günlük Rapor (Her gün saat 09:00)**

```bash
0 9 * * * cd /var/www/vhosts/yourdomain.com/nodejs-twilio-happy && /usr/bin/node scripts/daily-email-report.js --yesterday
```

**Veya Bugünün Raporu (Her gün saat 23:00)**

```bash
0 23 * * * cd /var/www/vhosts/yourdomain.com/nodejs-twilio-happy && /usr/bin/node scripts/daily-email-report.js
```

### Cron Job Ayarları Detayı:

| Saat | Cron İfadesi | Açıklama | Komut |
|------|-------------|----------|-------|
| 09:00 | `0 9 * * *` | Sabah 9'da dünün raporu | `node scripts/daily-email-report.js --yesterday` |
| 23:00 | `0 23 * * *` | Gece 23'te bugünün raporu | `node scripts/daily-email-report.js` |
| 08:00 | `0 8 * * 1-5` | Hafta içi her gün 08:00 | `node scripts/daily-email-report.js --yesterday` |

### Adım 3: Backend Çalıştığından Emin Olun

Cron job'un çalışması için backend'in aktif olması gerekir. İki seçenek:

#### Seçenek 1: Backend'i PM2 ile Sürekli Çalıştırın

```bash
# PM2 kur
npm install -g pm2

# Backend'i başlat
pm2 start server.js --name twilio-backend

# Otomatik başlatma
pm2 startup
pm2 save
```

#### Seçenek 2: Cron Job'da Backend'i Başlat ve Kapat

```bash
0 9 * * * cd /var/www/vhosts/yourdomain.com/nodejs-twilio-happy && /usr/bin/node server.js & sleep 5 && /usr/bin/node scripts/daily-email-report.js --yesterday && pkill -f server.js
```

**Not:** Seçenek 1 önerilir (backend sürekli çalışır).

---

## 🔐 Gmail Ayarları

Gmail kullanıyorsanız, **App Password** oluşturmanız gerekir:

### Adım 1: 2-Factor Authentication Aktif Edin

1. Google Hesabınıza gidin: https://myaccount.google.com/
2. **Security** → **2-Step Verification** → Aktif edin

### Adım 2: App Password Oluşturun

1. https://myaccount.google.com/apppasswords adresine gidin
2. **Select app**: "Mail"
3. **Select device**: "Other (Custom name)" → "Twilio Report"
4. **Generate** butonuna tıklayın
5. Oluşan 16 karakterlik şifreyi kopyalayın

### Adım 3: .env Dosyasını Güncelleyin

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx  # App Password (boşlukları kaldırın)
EMAIL_FROM=youremail@gmail.com
EMAIL_TO=recipient@example.com
```

---

## 📬 Email Formatı

Email raporu şu bilgileri içerir:

### Başlık
- Klinik adı
- Rapor tarihi
- Telefon numarası

### Özet İstatistikler
- **Gelen Çağrılar**: Toplam, yanıtlanan, kaçırılan, kaçırma oranı, ortalama süre, toplam süre
- **Giden Çağrılar**: Toplam, tamamlanan, başarısız, ortalama süre, toplam süre
- **Toplam**: Toplam çağrı sayısı ve toplam süre

### Çağrı Detayları
- İlk 10 gelen çağrı (saat, arayan, durum, süre)
- İlk 10 giden çağrı (saat, aranan, durum, süre)

### Örnek Email Görünümü

```
📊 Günlük Çağrı Özeti
Happy Smile Clinics
30.10.2025 - +48732145722

📞 Gelen Çağrılar: 10
✓ Yanıtlanan: 8
✗ Kaçırılan: 2
📊 Kaçırma Oranı: 20%

📱 Giden Çağrılar: 5
✓ Tamamlanan: 4
✗ Başarısız: 1

📈 Toplam: 15 çağrı, 164d 24sn
```

---

## 🔧 Sorun Giderme

### Hata: "Email kimlik bilgileri eksik"

**Çözüm:** `.env` dosyasında `EMAIL_USER` ve `EMAIL_PASSWORD` tanımlı olduğundan emin olun.

```bash
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Hata: "Email alıcısı eksik"

**Çözüm:** `.env` dosyasına `EMAIL_TO` ekleyin.

```bash
EMAIL_TO=recipient@example.com
```

### Hata: "API yanıtı başarısız"

**Çözüm:** Backend'in çalıştığından emin olun.

```bash
# Backend durumunu kontrol et
curl http://localhost:3001/api/calls/daily-summary?date=2025-10-30

# Backend'i başlat
npm run dev
```

### Hata: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Çözüm:** Gmail için App Password kullanın (normal şifre çalışmaz).

### Email Gelmiyor

1. **Spam klasörünü kontrol edin**
2. **Email ayarlarını kontrol edin:**
   ```bash
   node scripts/daily-email-report.js
   # Log çıktısını kontrol edin
   ```
3. **SMTP bağlantısını test edin:**
   ```bash
   telnet smtp.gmail.com 587
   ```

### Cron Job Çalışmıyor

1. **Cron log'larını kontrol edin:**
   ```bash
   grep CRON /var/log/syslog
   ```

2. **Script'in çalıştığından emin olun:**
   ```bash
   /usr/bin/node /full/path/to/scripts/daily-email-report.js
   ```

3. **Node.js yolu doğru mu:**
   ```bash
   which node
   # Çıktıyı cron job'a yazın
   ```

---

## 📊 Log Dosyası Oluşturma (İsteğe Bağlı)

Cron job çıktılarını log dosyasına kaydetmek için:

```bash
0 9 * * * cd /var/www/vhosts/yourdomain.com/nodejs-twilio-happy && /usr/bin/node scripts/daily-email-report.js --yesterday >> /var/log/twilio-report.log 2>&1
```

Log dosyasını kontrol edin:

```bash
tail -f /var/log/twilio-report.log
```

---

## 🎯 Özet Checklist

- [ ] `.env` dosyasına email ayarları eklendi
- [ ] Gmail App Password oluşturuldu (Gmail kullanıyorsanız)
- [ ] Backend çalışıyor (`http://localhost:3001` erişilebilir)
- [ ] Script manuel test edildi (`node scripts/daily-email-report.js`)
- [ ] Email başarıyla alındı
- [ ] Plesk'te cron job oluşturuldu
- [ ] Cron job testi yapıldı
- [ ] PM2 ile backend sürekli çalışıyor (opsiyonel ama önerilen)

---

## 📞 İletişim

Sorun yaşarsanız log çıktılarını kontrol edin:

```bash
node scripts/daily-email-report.js --yesterday
```

Email gönderilemiyorsa, email ayarlarınızı ve SMTP bağlantınızı kontrol edin.

