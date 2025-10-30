# 🔒 Güvenlik Rehberi

Bu dokümantasyon, Twilio Voice Dashboard uygulamasının güvenli bir şekilde dağıtımı ve kullanımı için önemli güvenlik önlemlerini içerir.

## 📋 İçindekiler

1. [Ortam Değişkenleri](#ortam-değişkenleri)
2. [API Güvenliği](#api-güvenliği)
3. [Twilio Güvenliği](#twilio-güvenliği)
4. [Email Güvenliği](#email-güvenliği)
5. [Production Deployment](#production-deployment)
6. [Güvenlik Checklist](#güvenlik-checklist)

---

## 🔐 Ortam Değişkenleri

### ⚠️ KRİTİK: Asla Git'e Commit Etmeyin!

Aşağıdaki dosyaları **ASLA** git repository'nize commit etmeyin:

```
.env
.env.local
.env.development
.env.production
.env.test
voice-dashboard/.env.local
```

### ✅ Güvenli Kullanım

1. **Development:**
   - `.env` dosyasını kullanın
   - `env.example` dosyasını şablon olarak kullanın
   - `.gitignore`'da olduğundan emin olun

2. **Production:**
   - Ortam değişkenlerini hosting platformunda (Vercel, Heroku, etc.) ayarlayın
   - Dosya tabanlı .env kullanmayın

3. **Credentials Rotation:**
   - Twilio credentials'ı düzenli olarak yenileyin
   - Email passwords'ları düzenli olarak değiştirin
   - Eski credentials'ı iptal edin

---

## 🛡️ API Güvenliği

### CORS Ayarları

Backend'de CORS düzgün yapılandırılmış:

```javascript
// Production'da sadece kendi domain'inizden izin verin
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : '*',
  credentials: true
};
```

### Rate Limiting

API endpoint'lerine rate limiting ekleyin:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100 // maksimum 100 istek
});

app.use('/api/', limiter);
```

### Webhook Validation

Twilio webhook'larını doğrulayın:

```javascript
const twilio = require('twilio');

app.post('/api/calls/webhooks/status', (req, res) => {
  const signature = req.headers['x-twilio-signature'];
  const url = `${process.env.NGROK_URL}${req.originalUrl}`;
  
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).send('Forbidden');
  }
  
  // Webhook işleme...
});
```

---

## 📞 Twilio Güvenliği

### Account SID ve Auth Token

1. **Ayrı Credentials:**
   - Ana operasyonlar için: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
   - Daily summary için: `TWILIO_DAILY_SUMMARY_ACCOUNT_SID`, `TWILIO_DAILY_SUMMARY_AUTH_TOKEN`

2. **API Key Kullanımı (Önerilen):**
   - Account SID/Auth Token yerine API Keys kullanın
   - Twilio Console → API Keys → Create API Key
   - Her servis için ayrı API key oluşturun

3. **Permissions:**
   - Minimum gerekli permissions verin
   - Readonly operations için readonly API key kullanın

### Telefon Numarası Koruması

```javascript
// Internal redirect numbers - kodda saklamayın
const INTERNAL_REDIRECT_NUMBERS = 
  process.env.INTERNAL_NUMBERS?.split(',') || [];
```

---

## 📧 Email Güvenliği

### Gmail App Password

**⚠️ Gmail şifresi kullanmayın!**

1. Google Hesap → Security → 2-Step Verification
2. App Passwords → Generate
3. 16 karakterlik password'u `.env`'ye ekleyin

### SMTP Over TLS

```bash
EMAIL_PORT=587  # TLS için
EMAIL_SECURE=false  # startTLS kullanır

# VEYA

EMAIL_PORT=465  # SSL için
EMAIL_SECURE=true
```

### Email Validation

Kullanıcı girişlerini validate edin:

```javascript
const validator = require('validator');

if (!validator.isEmail(email)) {
  throw new Error('Invalid email address');
}
```

---

## 🚀 Production Deployment

### Environment Variables - Vercel

1. **Vercel Dashboard:**
   - Project Settings → Environment Variables
   - Her variable'ı ekleyin
   - Production, Preview, Development için ayrı ayarlayın

2. **Required Variables:**
```bash
# Backend (Node.js/Vercel Serverless)
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
TWILIO_FLOW_SID
TWILIO_DAILY_SUMMARY_ACCOUNT_SID
TWILIO_DAILY_SUMMARY_AUTH_TOKEN
TWILIO_DAILY_SUMMARY_PHONE_NUMBER
EMAIL_HOST
EMAIL_PORT
EMAIL_USER
EMAIL_PASSWORD
EMAIL_TO

# Frontend (Next.js)
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

### HTTPS Zorunlu

Production'da **sadece HTTPS** kullanın:

```javascript
// Backend - HTTPS redirect
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

### Helmet.js

HTTP headers güvenliği:

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## ✅ Güvenlik Checklist

### Pre-Deployment

- [ ] `.env` dosyası `.gitignore`'da
- [ ] `env.example` oluşturuldu (hassas bilgiler yok)
- [ ] Tüm credentials environment variables'da
- [ ] Kodda hardcoded credentials yok
- [ ] API keys rotasyonu planlandı
- [ ] CORS production için yapılandırıldı
- [ ] Rate limiting eklendi
- [ ] Webhook validation aktif
- [ ] HTTPS zorunlu (production)
- [ ] Helmet.js eklendi

### Post-Deployment

- [ ] Environment variables Vercel'de set edildi
- [ ] Twilio webhook URLs güncellendi
- [ ] Email test edildi
- [ ] API endpoints test edildi
- [ ] Logs izleniyor
- [ ] Sentry/monitoring kuruldu
- [ ] Backup stratejisi var
- [ ] Incident response planı hazır

### Düzenli Kontroller

- [ ] Monthly: API keys rotation
- [ ] Monthly: Dependencies update (`npm audit`)
- [ ] Quarterly: Security audit
- [ ] Yearly: Full penetration test

---

## 🚨 Incident Response

### Credentials Leak Olursa

1. **Hemen:**
   - Twilio Console → API Keys → Revoke compromised key
   - Gmail → Security → App Passwords → Delete
   - Tüm credentials'ı değiştirin

2. **Git History:**
```bash
# Hassas bilgileri git history'den kaldırın
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

3. **GitHub:**
   - Repository Settings → Secrets → Delete exposed secrets
   - Force push ile history'yi temizleyin

### Şüpheli Aktivite

1. **Logları kontrol edin:**
```bash
tail -f logs/combined.log | grep "ERROR"
```

2. **Twilio Usage:**
   - Twilio Console → Usage → Unexpected spikes?

3. **Database:**
   - Unauthorized access logs?

---

## 📚 Kaynaklar

- [Twilio Security Best Practices](https://www.twilio.com/docs/usage/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Vercel Security](https://vercel.com/docs/security)

---

## 📞 Security Issues

Güvenlik açığı bulursanız:

1. **Public issue açmayın**
2. Email gönderin: security@yourdomain.com
3. Responsible disclosure policy'yi takip edin

---

**🔒 Güvenlik önceliğimizdir!**

*Son güncelleme: 2025-10-30*

