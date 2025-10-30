# Twilio Voice Dashboard UI

Modern, gerçek zamanlı çağrı izleme ve yönetim dashboard'u.

## 🚀 Özellikler

- **Gerçek Zamanlı İzleme**: Socket.IO ile anlık çağrı durumu güncellemeleri
- **Toplu Arama**: 10 numarayı aynı anda arama desteği
- **DTMF Etkileşim**: Kullanıcı tuş basımlarının gerçek zamanlı takibi
- **Modern UI/UX**: Next.js 14, Tailwind CSS ile geliştirildi
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **TypeScript**: Tam tip güvenliği

## 🛠️ Teknoloji Stack

- **Frontend**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Real-time**: Socket.IO Client
- **Form Validation**: React Hook Form + Zod

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

Dashboard, backend API ile entegre çalışır:

- **API Base URL**: `http://localhost:3001/api`
- **Socket.IO**: `http://localhost:3001`

## 📱 Kullanım

### Tekil Çağrı
1. Sol panelde telefon numarası girin
2. "Ara" butonuna tıklayın
3. Çağrı durumunu gerçek zamanlı takip edin

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