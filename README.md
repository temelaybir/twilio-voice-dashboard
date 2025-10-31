# Twilio Voice Dashboard v2.0

Bu proje, Twilio Voice API kullanarak çağrı yönetimi ve izleme için bir dashboard uygulamasıdır. MySQL database desteği ile Vercel ve diğer serverless platformlarda çalışmak üzere optimize edilmiştir.

## 🎉 Yeni Versiyon 2.0

⚠️ **Önemli**: v2.0'da Socket.IO kaldırılmıştır. Sistem artık REST API tabanlıdır ve Vercel serverless fonksiyonları ile tam uyumludur.

## Özellikler

### Backend
- Twilio Studio Flow ile çağrı yönetimi
- REST API ile çağrı durumu güncellemeleri
- DTMF tuş basımlarının izlenmesi
- **Dual Database**: MySQL (Production) + SQLite (Development)
- Toplu çağrı desteği (10 numarayı aynı anda)
- Vercel serverless ile tam uyumluluk
- Plesk/cPanel MySQL entegrasyonu

### Frontend Dashboard
- **Modern UI/UX**: Next.js 14, Tailwind CSS, Shadcn/ui ile geliştirildi
- **Toplu Arama**: 10 numarayı aynı anda arama desteği
- **DTMF Etkileşim**: Kullanıcı tuş basımlarının takibi
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **İstatistikler**: Detaylı çağrı analitiği ve metrikleri

## Kurulum

### Gereksinimler

- Node.js (v16+)
- WSL (Windows Subsystem for Linux)
- Ngrok hesabı

### WSL Kurulumu

1. PowerShell'i yönetici olarak açın ve şu komutu çalıştırın:
   ```
   wsl --install
   ```

2. WSL'de Node.js kurulumu:
   ```
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. WSL'de Ngrok kurulumu:
   ```
   curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
   echo 'deb https://ngrok-agent.s3.amazonaws.com buster main' | sudo tee /etc/apt/sources.list.d/ngrok.list
   sudo apt update
   sudo apt install ngrok
   ```

### Proje Kurulumu

1. Projeyi klonlayın:
   ```
   git clone https://github.com/kullaniciadi/twilio-voice-dashboard.git
   cd twilio-voice-dashboard
   ```

2. Backend bağımlılıklarını yükleyin:
   ```bash
   npm install
   ```

3. Frontend dashboard bağımlılıklarını yükleyin:
   ```bash
   cd voice-dashboard
   npm install
   cd ..
   ```

4. `.env` dosyasını oluşturun (env.example'dan kopyalayın):
   ```bash
   cp env.example .env
   ```
   
   Ardından `.env` dosyasını düzenleyin:
   ```env
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_phone_number
   TWILIO_FLOW_SID=your_flow_sid
   
   # Server Configuration
   PORT=3001
   NGROK_URL=your_ngrok_url  # Development için
   WEBHOOK_BASE_URL=          # Production için
   
   # MySQL Database (Production - Opsiyonel)
   # Local development için boş bırakın, SQLite kullanılacak
   DB_HOST=your-mysql-host.com
   DB_PORT=3306
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_NAME=your_database_name
   ```

## 🚀 Hızlı Başlangıç

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   cd voice-dashboard && npm install && cd ..
   ```

2. **Dashboard'u başlatın:**
   ```bash
   basit.bat
   ```

3. **Dashboard'a erişin:**
   - http://localhost:3000

## Çalıştırma

### Otomatik Başlatma (Windows)

Dashboard ve backend'i birlikte başlatmak için:

```bash
basit.bat
```

Bu betik:
1. Ngrok tünelini başlatır
2. .env dosyalarını günceller  
3. Backend sunucusunu başlatır (Port 3001)
4. Frontend dashboard'unu başlatır (Port 3000)
5. Dashboard'u tarayıcıda açar

**İlk kullanım öncesi:**
```bash
cd voice-dashboard
npm install
```

### Manuel Başlatma

1. **Backend'i başlatın:**
   ```bash
   # Ngrok'u başlatın (ayrı terminal)
   ngrok http 3001
   
   # Backend sunucusunu başlatın
   node server.js
   ```

2. **Frontend'i başlatın:**
   ```bash
   cd voice-dashboard
   npm run dev
   ```

3. **Tarayıcıda açın:**
   - Frontend Dashboard: http://localhost:3000
   - Backend API: http://localhost:3001

### Eski Otomatik Başlatma (Linux/WSL)

```bash
chmod +x .startauto
./.startauto
```

Bu betik:
1. Ngrok tünelini başlatır
2. Ortam değişkenlerini günceller
3. Backend sunucusunu başlatır
4. Twilio Flow'u günceller

## Twilio Studio Flow Yapılandırması

1. Twilio Studio'da yeni bir Flow oluşturun
2. `flow.json` dosyasını içe aktarın
3. Webhook URL'lerini güncelleyin:
   - Flow Webhook: `https://your-ngrok-url/api/calls/webhooks/flow`
   - Status Webhook: `https://your-ngrok-url/api/calls/webhooks/status`
   - DTMF Webhook: `https://your-ngrok-url/api/calls/webhooks/dtmf`

## Proje Yapısı

```
nodejs-twilio-happy/
├── server.js                      # Ana backend sunucu dosyası
├── config/                        # Backend yapılandırma dosyaları
│   ├── database.js               # SQLite veritabanı yapılandırması
│   └── logger.js                 # Winston logger yapılandırması
├── models/                        # Backend veritabanı modelleri
│   └── Call.js                   # Çağrı veri modeli
├── routes/                        # Backend API rotaları
│   └── voice.js                  # Çağrı API endpoint'leri
├── voice-dashboard/               # Frontend Next.js uygulaması
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   ├── components/           # React bileşenleri
│   │   ├── hooks/                # Custom React hooks
│   │   ├── lib/                  # Utility fonksiyonları
│   │   └── types/                # TypeScript tip tanımları
│   ├── package.json              # Frontend bağımlılıkları
│   └── README.md                 # Frontend dokümantasyonu
├── flow.json                      # Twilio Studio Flow tanımı
├── basit.bat                      # Windows otomatik başlatma (Ngrok + Dashboard)
├── .startauto                     # Linux/WSL otomatik başlatma
└── README.md                      # Ana proje dokümantasyonu
```

## 📊 Günlük Email Raporu

Otomatik günlük çağrı raporları için:

```bash
# Email ayarlarını yapılandır
npm run setup:email

# Manuel test
npm run report

# Dünün raporu
npm run report:yesterday
```

**Detaylı Bilgi:** [docs/DAILY_REPORT_README.md](./docs/DAILY_REPORT_README.md)

## 📚 Dokümantasyon

### Kurulum ve Yapılandırma
- **[Güvenlik Rehberi](./docs/SECURITY.md)** - Güvenlik önlemleri ve best practices
- **[Environment Variables](./docs/ENV_SETUP_GUIDE.md)** - Ortam değişkenleri kurulumu
- **[Email Report Setup](./docs/EMAIL_REPORT_SETUP.md)** - Günlük email raporu kurulumu
- **[Quick Start Guide](./docs/EMAIL_REPORT_QUICKSTART.md)** - 5 dakikada başlangıç

### Geliştirme
- **[System Documentation](./docs/SYSTEM_DOCUMENTATION.md)** - Sistem mimarisi
- **[API Documentation](./docs/SECURITY_AND_API_DOCUMENTATION.md)** - API referansı
- **[Frontend Docs](./docs/frontend/CALL_SUMMARY_DOCS.md)** - Frontend dokümantasyonu

## 🔒 Güvenlik

**⚠️ ÖNEMLİ:**

1. **.env dosyasını ASLA commit etmeyin**
2. `env.example` dosyasını şablon olarak kullanın
3. Production'da environment variables kullanın
4. API keys'leri düzenli olarak rotate edin

**Detaylı Bilgi:** [docs/SECURITY.md](./docs/SECURITY.md)

## 🚀 Production Deployment

### Vercel Deployment

1. **Backend:**
```bash
# Vercel CLI kur
npm i -g vercel

# Deploy
vercel

# Environment variables'ı Vercel Dashboard'dan ekleyin
```

2. **Frontend:**
```bash
cd voice-dashboard
vercel

# NEXT_PUBLIC_API_URL'i production backend URL'i ile set edin
```

### Environment Variables

Production'da şu environment variables'ı set edin:

```bash
# Backend
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
TWILIO_FLOW_SID
TWILIO_DAILY_SUMMARY_ACCOUNT_SID
TWILIO_DAILY_SUMMARY_AUTH_TOKEN
TWILIO_DAILY_SUMMARY_PHONE_NUMBER
EMAIL_HOST
EMAIL_USER
EMAIL_PASSWORD
EMAIL_TO

# Frontend
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## 📦 NPM Scripts

```bash
# Backend
npm run dev              # Development mode (nodemon)
npm start                # Production mode

# Email Reports
npm run setup:email      # Configure email settings
npm run report           # Send today's report
npm run report:yesterday # Send yesterday's report

# Frontend
cd voice-dashboard
npm run dev              # Development
npm run build            # Production build
npm start                # Start production server
```

## 🐛 Sorun Giderme

### Backend başlamıyor

```bash
# Port kullanımda mı?
netstat -ano | findstr :3001

# Logs'ı kontrol et
tail -f logs/combined.log
```

### Email gönderilmiyor

```bash
# Email ayarlarını test et
npm run report

# Gmail için App Password kullanın (normal şifre çalışmaz)
```

### Twilio webhook'ları çalışmıyor

1. Ngrok çalışıyor mu? `ngrok http 3001`
2. Webhook URL'leri Twilio Console'da güncel mi?
3. Webhook validation aktif mi?

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'feat: Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📝 Changelog

### v2.0.0 - 2025-10-30
- ✨ Günlük email raporu sistemi eklendi
- ✨ Call summary dashboard eklendi
- 🔒 Güvenlik iyileştirmeleri
- 📚 Kapsamlı dokümantasyon

### v2.0.0 - 2024-10-31
- 🚀 Socket.IO kaldırıldı (Vercel serverless uyumluluğu)
- 🗄️ MySQL database desteği eklendi
- 📦 Dual database modu (MySQL/SQLite)
- 🎨 Yeni API status sayfası
- ⚡ REST API optimizasyonu
- 🔒 Geliştirilmiş güvenlik

### v1.0.0 - 2024
- 🎉 İlk sürüm
- 📞 Twilio Voice entegrasyonu
- 📊 Dashboard UI

## 📄 Lisans

ISC

## 🙏 Teşekkürler

- [Twilio](https://www.twilio.com/) - Voice API
- [Next.js](https://nextjs.org/) - React Framework
- [TypeORM](https://typeorm.io/) - Database ORM
- [MySQL](https://www.mysql.com/) - Database
- [Shadcn/ui](https://ui.shadcn.com/) - UI Components

---

**⚡ Built with ❤️ for Happy Smile Clinics** 