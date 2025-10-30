# 🎨 Frontend Environment Variables Rehberi

## ⚠️ Önemli: İki Farklı .env Dosyası Var!

### 1️⃣ Ana Klasör - Backend (.env)
```
E:\nodejs-twilio-happy\.env
```
**Kullanım**: Backend server (server.js, routes/voice.js)

### 2️⃣ Frontend Klasörü - Next.js (.env.local)
```
E:\nodejs-twilio-happy\voice-dashboard\.env.local
```
**Kullanım**: Frontend dashboard (React/Next.js)

## 🚨 Karışmasınlar Diye!

Backend'deki Twilio bilgileri **ASLA** frontend'e konulmaz!
- ❌ Backend .env → Frontend'te kullanılmaz
- ✅ Frontend .env.local → Sadece API URL

## 📝 Frontend için .env.local Oluşturun

### Adım 1: Dosya Oluşturun
```bash
cd voice-dashboard
touch .env.local  # Linux/Mac
# veya Windows'ta:
# type nul > .env.local
```

### Adım 2: İçeriği Ekleyin
`voice-dashboard/.env.local` dosyasına:

```bash
# Frontend Environment Variables
# Next.js uygulaması için

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## ✅ Doğru Kullanım

### Backend (.env) - Ana Klasör
```bash
# Backend işlemleri için
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+90xxxxxxxxxx
TWILIO_FLOW_SID=FWxxxxxxxx

# #PolishCallSummary Env
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=ACxxxxxxxx
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=xxxxxxxx
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx

# Server Config
PORT=3001
NGROK_URL=https://xxxx.ngrok.io
```

### Frontend (.env.local) - voice-dashboard Klasörü
```bash
# Frontend için (sadece public değerler!)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 🔍 Neden Ayrı?

1. **Güvenlik**: Twilio credentials frontend'te görünmez
2. **İzolasyon**: Backend ve Frontend birbirinden bağımsız
3. **Next.js Kuralı**: `NEXT_PUBLIC_` prefix'i olanlar browser'da görünür
4. **Karışıklık Önleme**: Her klasör kendi environment'ını okur

## 📂 Klasör Yapısı

```
nodejs-twilio-happy/
├── .env                        ← Backend için (GİZLİ)
├── server.js
├── routes/
│   └── voice.js               ← Backend env kullanır
└── voice-dashboard/
    ├── .env.local             ← Frontend için (PUBLIC)
    ├── src/
    │   ├── lib/
    │   │   └── api.ts         ← Frontend env kullanır
    │   └── hooks/
    │       └── use-socket.ts  ← Hardcoded URL
    └── ...
```

## 🎯 Frontend'de Kullanım

### api.ts
```typescript
// Frontend env okur
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
```

**Not**: `NEXT_PUBLIC_` prefix'i **zorunlu**! 
- ✅ `NEXT_PUBLIC_API_URL` → Browser'da çalışır
- ❌ `API_URL` → Browser'da undefined olur

## 🔒 Güvenlik Notları

### ❌ YAPMAYIN
```bash
# voice-dashboard/.env.local içine ASLA eklemeyin:
TWILIO_AUTH_TOKEN=xxxxx          # GİZLİ!
TWILIO_ACCOUNT_SID=ACxxxxx        # GİZLİ!
DATABASE_PASSWORD=xxxxx           # GİZLİ!
```

### ✅ YAPIN
```bash
# voice-dashboard/.env.local içine ekleyebilirsiniz:
NEXT_PUBLIC_API_URL=http://localhost:3001/api  # Public
NEXT_PUBLIC_APP_NAME=Voice Dashboard            # Public
```

## 🚀 Deployment

### Development
```bash
# Backend
cd E:\nodejs-twilio-happy
npm start  # .env okur

# Frontend (ayrı terminal)
cd E:\nodejs-twilio-happy\voice-dashboard
npm run dev  # .env.local okur
```

### Production
```bash
# Backend .env
NGROK_URL=https://production-url.com

# Frontend .env.local
NEXT_PUBLIC_API_URL=https://production-url.com/api
```

## ❓ Sorun Giderme

### Problem: Frontend backend'e bağlanamıyor
```bash
# voice-dashboard/.env.local kontrol edin
NEXT_PUBLIC_API_URL=http://localhost:3001/api  # Doğru mu?
```

### Problem: Environment variable undefined
```bash
# Next.js'te mutlaka NEXT_PUBLIC_ prefix'i olmalı!
NEXT_PUBLIC_API_URL=...  # ✅ Doğru
API_URL=...               # ❌ Yanlış (browser'da undefined)
```

### Problem: Değişiklikler yansımıyor
```bash
# Frontend development server'ı yeniden başlatın
cd voice-dashboard
# Ctrl+C ile durdurun
npm run dev  # Tekrar başlatın
```

## 📋 Checklist

- [ ] Ana klasörde `.env` dosyası var mı? (Backend için)
- [ ] `voice-dashboard/.env.local` dosyası oluşturdunuz mu? (Frontend için)
- [ ] Frontend .env.local içinde sadece `NEXT_PUBLIC_API_URL` var mı?
- [ ] Backend .env içinde Twilio credentials var mı?
- [ ] İki dosya birbirine karışmıyor mu?

## ✅ Doğrulama

### Backend (.env)
```bash
cd E:\nodejs-twilio-happy
npm start
# Terminalde görmeli:
# "Server running on port 3001"
# "Daily Summary Account SID: ACxxxxxxxx..."
```

### Frontend (.env.local)
```bash
cd E:\nodejs-twilio-happy\voice-dashboard
npm run dev
# Tarayıcı console'da:
# API çağrıları http://localhost:3001/api'ye gitmeli
```

---

**Özet**: Ana klasördeki `.env` sadece backend için, `voice-dashboard/.env.local` sadece frontend için. Karışmazlar! 🎉

