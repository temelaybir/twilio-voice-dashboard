# 🚀 Deployment Guide

Bu rehber, Twilio Voice Dashboard uygulamasını production ortamına deploy etmek için adım adım talimatlar içerir.

## 📋 İçindekiler

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Vercel Deployment](#vercel-deployment)
3. [Alternative Platforms](#alternative-platforms)
4. [Post-Deployment](#post-deployment)
5. [Monitoring](#monitoring)

---

## ✅ Pre-Deployment Checklist

### Güvenlik

- [ ] `.env` dosyası `.gitignore`'da
- [ ] Tüm hassas bilgiler environment variables'da
- [ ] `env.example` dosyası güncel
- [ ] Kodda hardcoded credentials yok
- [ ] CORS production için yapılandırıldı
- [ ] Rate limiting eklendi (önerilen)
- [ ] Helmet.js eklendi (önerilen)

### Kod Kalitesi

- [ ] Tüm testler geçiyor
- [ ] Linter hatası yok
- [ ] Dependencies güncellendi (`npm audit`)
- [ ] Production build başarılı
- [ ] Log levels production için ayarlandı

### Dokümantasyon

- [ ] README.md güncel
- [ ] API documentation tamamlandı
- [ ] Environment variables dokümante edildi

---

## 🎯 Vercel Deployment

Vercel, Next.js ve Node.js uygulamaları için en kolay deployment platformudur.

### 1️⃣ Vercel CLI Kurulumu

```bash
npm install -g vercel
```

### 2️⃣ Backend Deployment

```bash
# Project root'ta
vercel

# İlk deployment'ta sorulacaklar:
# - Set up and deploy? Yes
# - Which scope? (Your account)
# - Link to existing project? No
# - Project name? twilio-backend
# - Directory? ./
# - Override settings? No
```

### 3️⃣ Backend Environment Variables

Vercel Dashboard'da:

1. Project → Settings → Environment Variables
2. Her variable'ı ekleyin:

```bash
# Twilio Main
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_FLOW_SID=FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Twilio Daily Summary
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=your_auth_token
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+1234567890

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_TO=recipient@example.com
CLINIC_NAME=Your Clinic Name

# Server
PORT=3001
BACKEND_API_URL=https://your-backend.vercel.app
```

**Environment için:**
- Production: ✅
- Preview: ✅ (opsiyonel)
- Development: ⬜ (local .env kullanın)

### 4️⃣ Frontend Deployment

```bash
cd voice-dashboard

# Deploy
vercel

# İlk deployment'ta sorulacaklar:
# - Project name? twilio-dashboard
# - Directory? ./
```

### 5️⃣ Frontend Environment Variables

Vercel Dashboard'da frontend project'i için:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

**Not:** `NEXT_PUBLIC_` prefix'i önemli! Client-side'da erişilebilir olması için gerekli.

### 6️⃣ Production URL'leri Alın

Deployment tamamlandıktan sonra:

```
Backend: https://twilio-backend-xxx.vercel.app
Frontend: https://twilio-dashboard-xxx.vercel.app
```

### 7️⃣ Twilio Webhook URL'lerini Güncelleyin

Twilio Console → Studio → Flows → Your Flow:

```
Flow Webhook: https://twilio-backend-xxx.vercel.app/api/calls/webhooks/flow
Status Webhook: https://twilio-backend-xxx.vercel.app/api/calls/webhooks/status
DTMF Webhook: https://twilio-backend-xxx.vercel.app/api/calls/webhooks/dtmf
```

---

## 🌐 Alternative Platforms

### Heroku

#### Backend

1. **Heroku CLI Kurulumu:**
```bash
npm install -g heroku
heroku login
```

2. **Create App:**
```bash
heroku create twilio-backend
```

3. **Environment Variables:**
```bash
heroku config:set TWILIO_ACCOUNT_SID=ACxxx
heroku config:set TWILIO_AUTH_TOKEN=xxx
# ... diğer variables
```

4. **Deploy:**
```bash
git push heroku main
```

5. **Database (Heroku Postgres):**
```bash
heroku addons:create heroku-postgresql:mini
```

#### Frontend

```bash
cd voice-dashboard
heroku create twilio-dashboard
heroku config:set NEXT_PUBLIC_API_URL=https://twilio-backend.herokuapp.com
git push heroku main
```

### Railway

1. **Railway CLI:**
```bash
npm i -g @railway/cli
railway login
```

2. **Create Project:**
```bash
railway init
railway up
```

3. **Environment Variables:**
Railway Dashboard → Variables → Add

4. **Domain:**
Railway Dashboard → Settings → Generate Domain

### DigitalOcean App Platform

1. **GitHub Repository Bağla**
2. **Environment Variables Ekle**
3. **Build & Run Commands:**
   - Build: `npm install && npm run build`
   - Run: `npm start`

---

## 🔧 Post-Deployment

### 1️⃣ Health Check

```bash
# Backend
curl https://your-backend.vercel.app/api/calls/history

# Frontend
curl https://your-dashboard.vercel.app
```

### 2️⃣ Test Email Report

```bash
# Local'de production backend'e point ederek
BACKEND_API_URL=https://your-backend.vercel.app npm run report
```

### 3️⃣ Test Twilio Integration

1. Twilio Console'dan test çağrısı yapın
2. Dashboard'da real-time updates'i kontrol edin
3. Webhook logs'ları kontrol edin

### 4️⃣ CORS Kontrolü

```bash
curl -H "Origin: https://your-dashboard.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     --verbose \
     https://your-backend.vercel.app/api/calls/daily-summary
```

### 5️⃣ SSL Sertifikası

Vercel otomatik HTTPS sağlar, kontrol edin:

```bash
curl -I https://your-backend.vercel.app
# HTTP/2 200 görmeli
```

---

## 📊 Monitoring

### Vercel Analytics

1. Vercel Dashboard → Analytics
2. Enable Web Vitals
3. Enable Speed Insights

### Log Monitoring

#### Vercel Logs

```bash
# Real-time logs
vercel logs --follow

# Specific deployment
vercel logs [deployment-url]
```

#### Custom Logging

Winston logs production'da:

```javascript
// config/logger.js
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new winston.transports.Console(),
    // Production için external service ekleyin
    // new winston.transports.Http({
    //   host: 'logs.example.com',
    //   port: 443,
    //   path: '/logs'
    // })
  ]
});
```

### Error Tracking - Sentry (Önerilen)

1. **Sentry Kurulumu:**
```bash
npm install @sentry/node @sentry/nextjs
```

2. **Backend (server.js):**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Error handler
app.use(Sentry.Handlers.errorHandler());
```

3. **Frontend (next.config.js):**
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // ... your config
});
```

### Uptime Monitoring

**UptimeRobot** veya **Pingdom** kullanın:

```
Monitor URL: https://your-backend.vercel.app/api/calls/history
Interval: 5 minutes
```

---

## 🔄 Continuous Deployment

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Run Tests
        run: npm test
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Auto-Deploy from Git

Vercel otomatik olarak:
- `main` branch → Production
- Feature branches → Preview deployments

---

## 🚨 Rollback

### Vercel

1. **Dashboard'dan:**
   - Deployments → Previous Deployment → Promote to Production

2. **CLI'dan:**
```bash
vercel rollback
```

### Manual Rollback

```bash
# Previous commit'e dön
git revert HEAD
git push origin main

# Veya specific commit
git revert [commit-hash]
git push origin main
```

---

## 📝 Environment-Specific Configs

### vercel.json (Backend)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### vercel.json (Frontend)

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

---

## 🎯 Performance Optimization

### Backend

1. **Enable Compression:**
```bash
npm install compression
```

```javascript
const compression = require('compression');
app.use(compression());
```

2. **Cache Headers:**
```javascript
app.use('/api/calls/history', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
});
```

### Frontend

1. **Next.js Optimizations:**
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/webp'],
  },
  compress: true,
  poweredByHeader: false,
};
```

2. **Bundle Analysis:**
```bash
npm install @next/bundle-analyzer
```

---

## ✅ Deployment Checklist

- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set
- [ ] Twilio webhooks updated
- [ ] SSL working
- [ ] CORS configured
- [ ] Health checks passing
- [ ] Logs monitoring setup
- [ ] Error tracking setup (Sentry)
- [ ] Uptime monitoring setup
- [ ] Email reports tested
- [ ] Dashboard tested
- [ ] Performance optimized
- [ ] Documentation updated

---

**🎉 Deployment tamamlandı!**

*Last updated: 2025-10-30*

