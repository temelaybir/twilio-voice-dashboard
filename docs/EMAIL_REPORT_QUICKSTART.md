# Günlük Email Raporu - Hızlı Başlangıç

## 🚀 5 Dakikada Kurulum

### 1️⃣ `.env` Dosyasına Email Ayarlarını Ekleyin

`.env` dosyasını açın ve en alta şu satırları ekleyin:

```bash
# ==========================================
# Email Rapor Ayarları
# ==========================================

# Backend API URL
BACKEND_API_URL=http://localhost:3001

# Gmail SMTP Ayarları
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false

# Email Kimlik Bilgileri
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=your_app_password_here

# Gönderen ve Alıcı
EMAIL_FROM=youremail@gmail.com
EMAIL_TO=recipient@example.com

# Klinik Bilgileri
CLINIC_NAME=Happy Smile Clinics
```

### 2️⃣ Gmail App Password Oluşturun (Gmail Kullanıyorsanız)

1. https://myaccount.google.com/apppasswords adresine gidin
2. **Select app**: "Mail" 
3. **Select device**: "Other" → "Twilio Report"
4. **Generate** → 16 karakterlik şifreyi kopyalayın
5. `.env` dosyasındaki `EMAIL_PASSWORD` yerine yapıştırın (boşlukları kaldırın)

**Not:** Gmail kullanmıyorsanız, kendi email servisinizin SMTP ayarlarını kullanın.

### 3️⃣ Backend'i Başlatın

```bash
npm run dev
```

Backend `http://localhost:3001` adresinde çalışmalı.

### 4️⃣ Email Raporunu Test Edin

```bash
# Bugünün raporu
npm run report

# Dünün raporu
npm run report:yesterday
```

**Beklenen Çıktı:**

```
🚀 Günlük Email Raporu Script Başlatıldı
══════════════════════════════════════════════════
📅 Rapor tarihi: 2025-10-30
🔍 Backend kontrol ediliyor: http://localhost:3001
📡 API çağrısı yapılıyor...
✅ Veri başarıyla çekildi
📊 İstatistikler:
   - Gelen: 10 (Yanıtlanan: 8)
   - Giden: 5 (Tamamlanan: 4)
   - Toplam: 15 çağrı
📧 Email gönderiliyor...
✅ Email başarıyla gönderildi!
📬 Alıcı: recipient@example.com
══════════════════════════════════════════════════
✅ İşlem başarıyla tamamlandı!
```

### 5️⃣ Email'i Kontrol Edin

📬 Gelen kutunuzu (ve spam klasörünü) kontrol edin!

---

## ⏰ Plesk'te Otomatik Gönderim (Cron Job)

### Basit Kurulum:

1. **Plesk Panel** → **Scheduled Tasks**
2. **Add Task** butonuna tıklayın
3. Aşağıdaki ayarları yapın:

**Her gün sabah 09:00'da dünün raporu:**

- **Minutes**: 0
- **Hours**: 9
- **Days of month**: *
- **Months**: *
- **Days of week**: *
- **Command**:
  ```bash
  cd /var/www/vhosts/yourdomain.com/nodejs-twilio-happy && /usr/bin/node scripts/daily-email-report.js --yesterday
  ```

### Alternatif Zamanlamalar:

| Ne Zaman | Cron İfadesi | Komut |
|----------|-------------|-------|
| Her gün 09:00 (dün) | `0 9 * * *` | `node scripts/daily-email-report.js --yesterday` |
| Her gün 23:00 (bugün) | `0 23 * * *` | `node scripts/daily-email-report.js` |
| Hafta içi 08:00 | `0 8 * * 1-5` | `node scripts/daily-email-report.js --yesterday` |

---

## 🔧 Sorun Giderme

### ❌ "Email kimlik bilgileri eksik"

**Çözüm:** `.env` dosyasında `EMAIL_USER` ve `EMAIL_PASSWORD` olduğundan emin olun.

### ❌ "Invalid login: 535-5.7.8 Username and Password not accepted"

**Çözüm:** Gmail App Password kullanın (normal şifre çalışmaz).

### ❌ "ECONNREFUSED" veya "API yanıtı başarısız"

**Çözüm:** Backend çalışmıyor. Önce backend'i başlatın:

```bash
npm run dev
```

### ❌ Email gelmiyor

1. **Spam klasörünü** kontrol edin
2. Email loglarını kontrol edin:
   ```bash
   node scripts/daily-email-report.js
   # Console çıktısını okuyun
   ```
3. SMTP ayarlarını doğrulayın

---

## 📊 Email İçeriği

Email raporu şunları içerir:

- 📊 Özet istatistikler (gelen/giden çağrılar)
- 📞 İlk 10 gelen çağrı detayı
- 📱 İlk 10 giden çağrı detayı
- ⏱ Süre istatistikleri
- 📈 Kaçırma oranı
- ✅ Modern ve profesyonel HTML tasarım

---

## 💡 İpuçları

### Production'da Kullanım

Production ortamında `.env` dosyasındaki `BACKEND_API_URL`'i güncelleyin:

```bash
BACKEND_API_URL=https://yourdomain.com
```

### PM2 ile Backend Sürekli Çalıştırma

Cron job'un çalışması için backend'in aktif olması gerekir:

```bash
# PM2 kur
npm install -g pm2

# Backend'i başlat
pm2 start server.js --name twilio-backend

# Otomatik başlatma
pm2 startup
pm2 save

# Durumu kontrol et
pm2 status
```

### Birden Fazla Alıcıya Gönderim

```bash
EMAIL_TO=email1@example.com,email2@example.com,email3@example.com
```

### Farklı SMTP Servisleri

**Outlook/Office 365:**
```bash
EMAIL_HOST=smtp.office365.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Yahoo:**
```bash
EMAIL_HOST=smtp.mail.yahoo.com
EMAIL_PORT=587
EMAIL_SECURE=false
```

**Custom SMTP:**
```bash
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=465
EMAIL_SECURE=true
```

---

## 📞 Test Komutları

```bash
# Manuel test (bugün)
npm run report

# Manuel test (dün)
npm run report:yesterday

# Belirli tarih
node scripts/daily-email-report.js --date=2025-10-30

# Backend API test
curl http://localhost:3001/api/calls/daily-summary?date=2025-10-30
```

---

## ✅ Kurulum Checklist

- [ ] `.env` dosyasına email ayarları eklendi
- [ ] Gmail App Password oluşturuldu
- [ ] Backend çalışıyor (`npm run dev`)
- [ ] Script test edildi (`npm run report`)
- [ ] Email başarıyla alındı
- [ ] Plesk cron job kuruldu
- [ ] PM2 ile backend sürekli çalışıyor (production için)

---

## 📚 Detaylı Dokümantasyon

Daha detaylı bilgi için: [EMAIL_REPORT_SETUP.md](./EMAIL_REPORT_SETUP.md)

---

**İyi çalışmalar! 🎉**

