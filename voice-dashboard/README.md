# Twilio Voice Dashboard UI v2.0

Modern, otomatik yenilenen çağrı izleme ve yönetim dashboard'u.

## 🎉 Yeni v2.0

⚠️ **Önemli**: Socket.IO kaldırıldı. Sistem artık REST API polling ile otomatik yenileniyor (5 saniyede bir).

## 🚀 Özellikler

- **Otomatik Yenileme**: 5 saniyede bir API'den güncel veri çekme
- **Backend Bağlantı İzleme**: API bağlantı durumu kontrolü
- **Toplu Arama**: 10 numarayı aynı anda arama desteği
- **DTMF Etkileşim**: Kullanıcı tuş basımlarının takibi
- **Modern UI/UX**: Next.js 14, Tailwind CSS ile geliştirildi
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **TypeScript**: Tam tip güvenliği
- **Vercel Uyumlu**: Serverless fonksiyonlar ile tam uyumlu

## 🛠️ Teknoloji Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Data Fetching**: REST API + Polling
- **Form Validation**: React Hook Form + Zod
- **UI Components**: Shadcn/ui

## 📋 Gereksinimler

- Node.js 18+
- npm veya yarn
- Backend API'nin çalışıyor olması (port 3001)

## 🚀 Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Development server'ı başlatın:**
   ```bash
   npm run dev
   ```

3. **Tarayıcıda açın:**
   ```
   http://localhost:3000
   ```

## 🔧 Available Scripts

- `npm run dev` - Development server başlatır
- `npm run build` - Production build oluşturur  
- `npm run start` - Production server başlatır
- `npm run lint` - ESLint kontrolü yapar

## 🔌 Backend Entegrasyonu

Dashboard, backend REST API ile entegre çalışır:

- **API Base URL**: `http://localhost:3001/api`
- **Auto-Refresh**: Her 5 saniyede bir otomatik güncelleme
- **Environment Variable**: `NEXT_PUBLIC_API_URL` (default: http://localhost:3001)

### Environment Setup

`.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Production için:
```env
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

## 📱 Kullanım

### Tekil Çağrı
1. Sol panelde telefon numarası girin
2. "Ara" butonuna tıklayın
3. Çağrı durumunu otomatik yenileme ile takip edin (5s)

### Toplu Çağrı  
1. "Toplu Arama" moduna geçin
2. En fazla 10 numara ekleyin
3. "Toplu Arama Başlat" butonuna tıklayın

## 📊 İstatistikler

Dashboard aşağıdaki metrikleri gerçek zamanlı olarak gösterir:

- Toplam çağrı sayısı
- Aktif çağrılar
- Yanıtlanan çağrılar
- Meşgul çağrılar
- Başarısız çağrılar

## 🚀 Production Deployment

1. **Build oluşturun:**
   ```bash
   npm run build
   ```

2. **Server başlatın:**
   ```bash
   npm run start
   ``` 