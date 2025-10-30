# 📊 Günlük Çağrı Özeti Modülü - Kullanım Kılavuzu

## Genel Bakış

Günlük Çağrı Özeti modülü, Twilio API'den doğrudan gerçek zamanlı çağrı verilerini çekerek, **inbound** ve **outbound** çağrıları detaylı bir şekilde görüntülemenizi sağlar. TalkYto ile yapılan tüm outbound çağrılar da bu modülde listelenir.

## 🎯 Özellikler

### ✅ Düzeltilen Hatalar

1. **Inbound Calls - Sadece Günlük Veriler**: Artık sadece seçilen günün verileri gösterilir, tüm çağrılar değil
2. **Outbound Calls - TalkYto Dahil**: TalkYto ile yapılan tüm outbound çağrılar artık listeleniyor (22 Ekim sınırı kaldırıldı)

### 🚀 Yeni Özellikler

- **Gerçek Zamanlı Veri**: Twilio API'den doğrudan çekiliyor
- **Tarih Filtreleme**: Bugün, dün veya özel tarih seçimi
- **İstatistikler**: Detaylı inbound/outbound istatistikleri
- **CSV Export**: Her iki yön için ayrı CSV indirme
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu
- **Manuel Yenileme**: İstediğiniz zaman verileri güncelleyebilme

## 📁 Dosya Yapısı

### Backend (routes/voice.js)
```javascript
GET /api/calls/daily-summary?date=YYYY-MM-DD&direction=all
```

### Frontend
```
voice-dashboard/src/
├── app/
│   └── call-summary/
│       └── page.tsx                    # Ana sayfa
├── components/
│   └── call-summary/
│       ├── summary-stats-cards.tsx     # İstatistik kartları
│       ├── summary-calls-table.tsx     # Çağrı tablosu
│       └── date-filter.tsx             # Tarih filtresi
├── lib/
│   └── api.ts                          # API fonksiyonları
└── types/
    └── index.ts                        # TypeScript tipleri
```

## 🔧 Environment Variables

**⚠️ Önemli**: İki farklı `.env` dosyası var - karıştırmayın!

### Backend Environment Variables (Ana Klasör)

Aşağıdaki **YENİ** değişkenleri **ana klasördeki** `.env` dosyanıza eklemelisiniz:

```bash
#PolishCallSummary Env
# Günlük Çağrı Özeti için Ayrı Twilio Hesap Bilgileri
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=your_daily_summary_account_sid
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=your_daily_summary_auth_token
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx
```

### Tam Backend .env Örneği (Ana Klasör)

Dosya: `E:\nodejs-twilio-happy\.env`

```bash
# Twilio Configuration (Ana İşlemler için - Mevcut)
TWILIO_ACCOUNT_SID=your_main_account_sid
TWILIO_AUTH_TOKEN=your_main_auth_token
TWILIO_PHONE_NUMBER=+90xxxxxxxxxx
TWILIO_FLOW_SID=your_flow_sid

# #PolishCallSummary Env
# Günlük Çağrı Özeti için Ayrı Twilio Hesap Bilgileri (YENİ - EKLE)
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=your_daily_summary_account_sid
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=your_daily_summary_auth_token
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx

# Server Configuration
PORT=3001
NGROK_URL=https://your-ngrok-url.ngrok.io
```

### Frontend Environment Variables (voice-dashboard Klasörü)

Dosya: `E:\nodejs-twilio-happy\voice-dashboard\.env.local`

**Bu dosyayı manuel oluşturmalısınız!**

```bash
# Frontend için (sadece public değerler)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Önemli**: 
- Backend Twilio credentials'ları frontend'e **ASLA** eklemeyin!
- Frontend sadece API URL'sine ihtiyaç duyar
- `NEXT_PUBLIC_` prefix'i zorunlu (Next.js kuralı)

### Neden Ayrı Hesap Bilgileri?

- Ana `TWILIO_ACCOUNT_SID` ve `TWILIO_AUTH_TOKEN` başka işlemler için kullanılıyor
- Günlük çağrı özeti için ayrı bir Twilio hesabı/subaccount kullanılıyor
- **`TWILIO_DAILY_SUMMARY_PHONE_NUMBER`**: Rapor alınacak telefon numarası (inbound: bu numaraya gelen, outbound: bu numaradan giden çağrılar)
- Her endpoint kendi Twilio client'ını oluşturuyor
- Bu sayede farklı hesaplardan ve farklı numaralardan veri çekebiliyoruz

**Önemli**: Bu üç değişkeni (Account SID, Auth Token, Phone Number) `.env` dosyanıza eklemeden günlük özet çalışmayacaktır!

## 🚀 Kurulum ve Başlatma

### 1. Backend Environment Variables Ekleyin
**Ana klasördeki** `.env` dosyanıza aşağıdaki satırları ekleyin:

```bash
#PolishCallSummary Env
TWILIO_DAILY_SUMMARY_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DAILY_SUMMARY_AUTH_TOKEN=your_auth_token_here
TWILIO_DAILY_SUMMARY_PHONE_NUMBER=+90xxxxxxxxxx
```

**Önemli**: 
- `TWILIO_DAILY_SUMMARY_PHONE_NUMBER`: Rapor alınacak Twilio telefon numarası
- **Inbound çağrılar**: Bu numaraya gelen çağrılar (to = bu numara)
- **Outbound çağrılar**: Bu numaradan giden çağrılar (from = bu numara)
- Bu üç değer olmadan günlük özet endpoint'i hata verecektir!

### 2. Frontend Environment Variables Oluşturun
**voice-dashboard klasöründe** `.env.local` dosyası oluşturun:

```bash
cd voice-dashboard

# Windows
type nul > .env.local

# Linux/Mac
touch .env.local
```

İçeriği:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Backend'i Başlatın (Port 3001)
```bash
# Ana dizinde
npm install
npm start
```

### 4. Frontend'i Başlatın (Port 3000)
```bash
cd voice-dashboard
npm install
npm run dev
```

### 5. Tarayıcıda Açın
- Ana Dashboard: http://localhost:3000
- Günlük Özet: http://localhost:3000/call-summary

**Not**: Frontend ve Backend'in birlikte çalışması gerekir!

## 📱 Kullanım

### Ana Sayfadan Erişim
1. Ana dashboard'da sağ üst köşede **"Günlük Özet"** butonuna tıklayın
2. Otomatik olarak bugünün verileri yüklenecektir

### Tarih Seçimi
- **Bugün**: Bugünün tüm çağrılarını gösterir
- **Dün**: Dünün çağrılarını gösterir
- **7 Gün Önce**: 7 gün önceki çağrıları gösterir
- **Özel Tarih**: Manuel olarak tarih seçebilirsiniz

### Çağrı Görüntüleme
1. **Gelen (Inbound)** sekmesinde:
   - Tüm gelen çağrılar
   - Cevaplanan/Kaçırılan ayrımı
   - Kaçırılma oranı

2. **Giden (Outbound)** sekmesinde:
   - TalkYto dahil tüm outbound çağrılar
   - Tamamlanan/Başarısız ayrımı
   - Ortalama süre bilgisi

### CSV Export
1. İlgili sekmeyi seçin (Gelen veya Giden)
2. **"CSV İndir"** butonuna tıklayın
3. Dosya otomatik olarak indirilecektir

## 📊 İstatistikler

### Toplam Çağrı
- Günün toplam çağrı sayısı
- Toplam süre bilgisi

### Gelen Çağrılar
- Toplam gelen çağrı sayısı
- Cevaplanan çağrılar (✓)
- Kaçırılan çağrılar (✗)
- Kaçırılma oranı (%)

### Giden Çağrılar
- Toplam giden çağrı sayısı
- Tamamlanan çağrılar (✓)
- Başarısız çağrılar (✗)
- Ortalama süre

### Ortalama Süre
- Genel ortalama çağrı süresi
- Inbound ortalama
- Outbound ortalama
- En uzun çağrı süresi

## 🔍 API Detayları

### Endpoint
```
GET /api/calls/daily-summary
```

### Query Parameters
- `date` (opsiyonel): YYYY-MM-DD formatında tarih
  - Varsayılan: Bugünün tarihi (İstanbul saat dilimi UTC+3)
  - Örnek: `2024-10-30`

- `direction` (opsiyonel): 'all', 'inbound', 'outbound'
  - Varsayılan: 'all'
  - Örnek: `direction=inbound`

### Örnek İstek
```bash
curl http://localhost:3001/api/calls/daily-summary?date=2024-10-30&direction=all
```

### Örnek Yanıt
```json
{
  "success": true,
  "date": "30.10.2024",
  "stats": {
    "inbound": {
      "total": 15,
      "answered": 12,
      "missed": 3,
      "missedRatio": 20.0,
      "totalDuration": 1800,
      "avgDuration": 120,
      "maxDuration": 300
    },
    "outbound": {
      "total": 10,
      "completed": 8,
      "failed": 2,
      "totalDuration": 1200,
      "avgDuration": 120,
      "maxDuration": 250
    },
    "overall": {
      "totalCalls": 25,
      "totalDuration": 3000
    }
  },
  "calls": {
    "inbound": [...],
    "outbound": [...]
  }
}
```

## 🐛 Sorun Giderme

### Problem: "Daily Summary için Twilio kimlik bilgileri tanımlanmamış" Hatası
**Çözüm**: 
1. `.env` dosyanıza aşağıdaki satırları ekleyin:
   ```bash
   TWILIO_DAILY_SUMMARY_ACCOUNT_SID=your_account_sid
   TWILIO_DAILY_SUMMARY_AUTH_TOKEN=your_auth_token
   ```
2. Backend'i yeniden başlatın
3. Değerlerin doğru olduğundan emin olun

### Problem: Veri Gelmiyor
**Çözüm**: 
1. Backend'in çalıştığından emin olun (Port 3001)
2. `.env` dosyasındaki `TWILIO_DAILY_SUMMARY_*` değişkenlerini kontrol edin
3. Console'da hata mesajlarını kontrol edin
4. Backend loglarına bakın (terminal çıktısı)

### Problem: Eski Tarihler Gösterilmiyor
**Çözüm**:
1. Twilio API'nin ücretsiz plan limitleri olabilir
2. Tarih seçimini kontrol edin
3. Manuel yenileme yapın

### Problem: TalkYto Çağrıları Görünmüyor
**Çözüm**:
1. Bu düzeltme ile artık tüm outbound çağrılar görünüyor
2. Tarih filtresini kontrol edin
3. Yenile butonuna tıklayın

## 🎨 UI/UX Özellikleri

- **Loading States**: Veri yüklenirken skeleton animasyonlar
- **Error Handling**: Kullanıcı dostu hata mesajları
- **Responsive Design**: Tüm cihazlarda uyumlu
- **Status Badges**: Renkli durum göstergeleri
- **Quick Stats**: Sol tarafta hızlı istatistikler
- **Real-time Updates**: Manuel yenileme ile güncel veriler

## 📝 Notlar

1. **Saat Dilimi**: Tüm işlemler İstanbul saat dilimi (UTC+3) ile yapılır
2. **Veri Kaynağı**: Twilio API'den gerçek zamanlı
3. **Cache**: Veri cache'lenmez, her zaman güncel
4. **Performance**: 1000'e kadar çağrı optimize edilmiştir

## 🔗 Bağlantılar

- Ana Dashboard: [http://localhost:3000](http://localhost:3000)
- Günlük Özet: [http://localhost:3000/call-summary](http://localhost:3000/call-summary)
- Backend API: [http://localhost:3001/api/calls/daily-summary](http://localhost:3001/api/calls/daily-summary)

## 🎯 Gelecek Geliştirmeler

- [ ] Haftalık/aylık raporlar
- [ ] PDF export
- [ ] Email ile otomatik rapor gönderimi
- [ ] Grafik ve chart'lar
- [ ] Çağrı kayıtlarını dinleme
- [ ] İleri düzey filtreleme

---

**Son Güncelleme**: 30 Ekim 2024  
**Versiyon**: 1.0.0  
**Geliştirici**: Happy Smile Clinics Development Team

