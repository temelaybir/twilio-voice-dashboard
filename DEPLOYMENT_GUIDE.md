# 🚀 Vercel Deployment Guide

## 📦 Backend Deployment (Twilio Voice API)

### 1️⃣ Vercel CLI Kurulumu
```bash
npm install -g vercel
```

### 2️⃣ Backend Klasöründe Vercel Login
```bash
cd E:/nodejs-twilio-happy
vercel login
```

### 3️⃣ Backend Deploy
```bash
vercel
```

İlk deployment'ta sorulacak sorular:
- **Set up and deploy**: `Y`
- **Which scope**: Kendi hesabınızı seçin
- **Link to existing project**: `N`
- **Project name**: `twilio-voice-api` (veya istediğiniz isim)
- **Directory**: `.` (current directory)
- **Override settings**: `N`

### 4️⃣ Environment Variables Ekleyin

Vercel Dashboard'da (`vercel.com/dashboard`) projenizi açın ve **Settings > Environment Variables** bölümünden ekleyin:

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone
TWILIO_FLOW_SID=your_flow_sid

# Daily Summary (Opsiyonel)
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=your_daily_summary_sid
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=your_daily_summary_token
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=your_daily_summary_phone

# Email Settings (Opsiyonel)
EMAIL_HOST=your_smtp_host
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourdomain.com
EMAIL_TO=admin@yourdomain.com
CLINIC_NAME=Your Clinic Name

# Production URLs
WEBHOOK_BASE_URL=https://your-backend-url.vercel.app
FRONTEND_URL=https://your-frontend-url.vercel.app
BACKEND_API_URL=https://your-backend-url.vercel.app

# MySQL Database
DB_HOST=46.105.101.195
DB_PORT=3306
DB_USER=twilio_voice_db
DB_PASSWORD=your_db_password
DB_NAME=twilio_voice_db
DB_LOGGING=false
```

### 5️⃣ Production Deployment
```bash
vercel --prod
```

**Backend URL'nizi not edin**: `https://twilio-voice-api.vercel.app` (sizin URL'niz farklı olacak)

---

## 🎨 Frontend Deployment (Voice Dashboard)

### 1️⃣ Frontend Klasöründe
```bash
cd E:/nodejs-twilio-happy/voice-dashboard
```

### 2️⃣ Environment Variable Güncelleyin

`.env.local` dosyasını production backend URL'inize göre güncelleyin:
```bash
echo "NEXT_PUBLIC_API_URL=https://twilio-voice-api.vercel.app/api" > .env.local
```

### 3️⃣ Frontend Deploy
```bash
vercel
```

İlk deployment'ta sorulacak sorular:
- **Set up and deploy**: `Y`
- **Which scope**: Kendi hesabınızı seçin
- **Link to existing project**: `N`
- **Project name**: `voice-dashboard` (veya istediğiniz isim)
- **Directory**: `.` (current directory)
- **Override settings**: `N`

### 4️⃣ Environment Variables Ekleyin

Vercel Dashboard'da frontend projenizi açın ve **Settings > Environment Variables**:

```env
NEXT_PUBLIC_API_URL=https://twilio-voice-api.vercel.app/api
```

**ÖNEMLİ**: `/api` sonundaki path'i unutmayın!

### 5️⃣ Production Deployment
```bash
vercel --prod
```

**Frontend URL'nizi not edin**: `https://voice-dashboard.vercel.app` (sizin URL'niz farklı olacak)

---

## 🔄 Backend Environment Güncellemesi

Backend'e frontend production URL'ini ekleyin:

1. Vercel Dashboard > Backend Project > Settings > Environment Variables
2. `FRONTEND_URL` değişkenini frontend production URL'iniz ile güncelleyin:
   ```
   FRONTEND_URL=https://voice-dashboard.vercel.app
   ```
3. **Redeploy** butonuna basın veya:
   ```bash
   cd E:/nodejs-twilio-happy
   vercel --prod
   ```

---

## ✅ Deployment Kontrolü

### Backend Test:
```bash
curl https://twilio-voice-api.vercel.app
```

Cevap:
```json
{
  "status": "online",
  "message": "Twilio Voice API - Çalışıyor",
  "version": "2.0.0"
}
```

### Frontend Test:
Tarayıcıda frontend URL'inizi açın:
```
https://voice-dashboard.vercel.app
```

Dashboard açılmalı ve "Backend API: Bağlı" göstermeli.

---

## 🔧 Twilio Webhook Güncelleme

Twilio Studio Flow'unuzda webhook URL'lerini production URL'inize güncelleyin:

1. Twilio Console > Studio > Flows
2. Flow'unuzu açın
3. Webhook URL'lerini güncelleyin:
   - Flow: `https://twilio-voice-api.vercel.app/api/calls/webhooks/flow`
   - Status: `https://twilio-voice-api.vercel.app/api/calls/webhooks/status`
   - DTMF: `https://twilio-voice-api.vercel.app/api/calls/webhooks/dtmf`
4. **Publish** edin

---

## 🐛 Troubleshooting

### Backend Logları:
```bash
vercel logs your-backend-url.vercel.app
```

### Frontend Logları:
```bash
vercel logs your-frontend-url.vercel.app
```

### Yeniden Deploy:
```bash
# Backend
cd E:/nodejs-twilio-happy
vercel --prod

# Frontend
cd E:/nodejs-twilio-happy/voice-dashboard
vercel --prod
```

---

## 📝 Notlar

- ✅ Her iki proje de ayrı Vercel projeleri olarak deploy edilir
- ✅ Environment variables her projede ayrı ayrı tanımlanmalı
- ✅ Frontend her zaman backend production URL'ini kullanmalı
- ✅ Backend MySQL veritabanına bağlanır (Plesk)
- ✅ Her commit otomatik olarak preview deployment oluşturur
- ✅ Production deployment için `vercel --prod` kullanın

---

🎉 **Deployment Tamamlandı!** Sorularınız için: [Vercel Docs](https://vercel.com/docs)

