# Twilio Voice Dashboard - Sistem Dokümantasyonu

## İçindekiler
1. [Sistem Genel Bakış](#sistem-genel-bakış)
2. [Teknoloji Stack](#teknoloji-stack)
3. [Proje Yapısı](#proje-yapısı)
4. [Bağımlılıklar](#bağımlılıklar)
5. [Çağrı Modeli](#çağrı-modeli)
6. [API Rotaları](#api-rotaları)
7. [Twilio Flow Yapılandırması](#twilio-flow-yapılandırması)
8. [Server Yapılandırması](#server-yapılandırması)
9. [Veritabanı Yapılandırması](#veritabanı-yapılandırması)
10. [Webhook Sistemi](#webhook-sistemi)
11. [Socket.IO Entegrasyonu](#socketio-entegrasyonu)
12. [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
13. [Çevre Değişkenleri](#çevre-değişkenleri)
14. [Hata Yönetimi](#hata-yönetimi)

---

## Sistem Genel Bakış

Bu sistem, Twilio Studio Flow kullanarak otomatik çağrı yapabilen, gerçek zamanlı çağrı durumlarını takip edebilen ve DTMF (tuş basımı) etkileşimlerini yönetebilen bir voice dashboard uygulamasıdır.

### Ana Özellikler:
- **Otomatik Çağrı Başlatma**: Tekil ve toplu çağrı desteği
- **Gerçek Zamanlı İzleme**: Socket.IO ile canlı çağrı durumu takibi
- **DTMF Etkileşim**: Kullanıcı tuş basımlarının yakalanması ve işlenmesi
- **Webhook Entegrasyonu**: Twilio webhooks ile tam entegrasyon
- **Veritabanı Yönetimi**: SQLite ile çağrı verilerinin saklanması
- **Dinamik URL Yönetimi**: Ngrok ile geliştirme ortamı desteği

---

## Teknoloji Stack

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **Socket.IO**: Gerçek zamanlı iletişim
- **TypeORM**: ORM (Object-Relational Mapping)
- **SQLite**: Veritabanı
- **Twilio SDK**: Telefon hizmetleri

### Geliştirme Araçları
- **Ngrok**: Localhost tunneling
- **Nodemon**: Development server
- **Dotenv**: Environment variable management

### Doğrulama ve Güvenlik
- **Zod**: Schema validation
- **CORS**: Cross-origin resource sharing
- **Body-parser**: Request parsing

---

## Proje Yapısı

```
nodejs-twilio-happy/
├── config/
│   └── database.js          # Veritabanı yapılandırması
├── data/
│   ├── database.sqlite      # SQLite veritabanı dosyası
│   └── .gitkeep            # Git klasör takibi
├── models/
│   └── Call.js             # Çağrı veri modeli
├── routes/
│   └── voice.js            # API endpoint'leri
├── node_modules/           # NPM bağımlılıkları
├── .gitignore             # Git ignore rules
├── .env                   # Çevre değişkenleri
├── basit.bat              # Windows başlatma scripti
├── flow.json              # Twilio Studio Flow tanımı
├── package.json           # NPM proje yapılandırması
├── package-lock.json      # NPM lock dosyası
├── README.md              # Proje açıklaması
├── server.js              # Ana server dosyası
├── stop.bat              # Windows durdurma scripti
└── stop.sh               # Unix durdurma scripti
```

---

## Bağımlılıklar

### Ana Bağımlılıklar (dependencies)

```json
{
  "body-parser": "^1.20.2",      // HTTP request parsing
  "cors": "^2.8.5",              // Cross-origin resource sharing
  "dotenv": "^16.3.1",           // Environment variables
  "express": "^4.18.2",          // Web framework
  "lodash": "^4.17.21",          // Utility library
  "reflect-metadata": "^0.2.1",  // TypeORM requirement
  "socket.io": "^4.7.2",         // Real-time communication
  "sqlite3": "^5.1.7",           // SQLite database driver
  "twilio": "^4.19.0",           // Twilio SDK
  "typeorm": "^0.3.21",          // ORM
  "zod": "^3.22.4"               // Schema validation
}
```

### Geliştirme Bağımlılıkları (devDependencies)

```json
{
  "nodemon": "^3.0.2"            // Development server auto-reload
}
```

---

## Çağrı Modeli

### Call Entity Yapısı

```javascript
const Call = new EntitySchema({
  name: 'Call',
  tableName: 'calls',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    executionSid: {           // Twilio Studio Flow execution ID
      type: 'varchar',
      nullable: true
    },
    callSid: {               // Twilio Call ID
      type: 'varchar',
      nullable: true
    },
    to: {                    // Aranan numara
      type: 'varchar',
      nullable: true
    },
    from: {                  // Arayan numara
      type: 'varchar',
      nullable: true
    },
    status: {                // Çağrı durumu
      type: 'varchar',
      nullable: true
    },
    direction: {             // Çağrı yönü (inbound/outbound)
      type: 'varchar',
      nullable: true
    },
    duration: {              // Çağrı süresi (saniye)
      type: 'int',
      default: 0
    },
    dtmfDigits: {           // Basılan tuşlar
      type: 'text',
      nullable: true
    },
    recordingUrl: {         // Kayıt URL'si
      type: 'varchar',
      nullable: true
    },
    createdAt: {            // Oluşturulma zamanı
      type: 'datetime',
      createDate: true
    },
    updatedAt: {            // Güncellenme zamanı
      type: 'datetime',
      updateDate: true
    }
  }
});
```

### Çağrı Durumları

- **initiated**: Çağrı başlatıldı
- **ringing**: Çalıyor
- **answered**: Yanıtlandı
- **busy**: Meşgul
- **no-answer**: Yanıtlanmadı
- **failed**: Başarısız
- **completed**: Tamamlandı
- **canceled**: İptal edildi

---

## API Rotaları

### 1. Tekil Çağrı Başlatma
```http
POST /api/calls/start
Content-Type: application/json

{
  "to": "+901234567890"
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Çağrı başlatıldı",
  "data": {
    "execution_sid": "FN123..."
  }
}
```

### 2. Toplu Çağrı Başlatma
```http
POST /api/calls/start-bulk
Content-Type: application/json

{
  "phoneNumbers": [
    "+901234567890",
    "+905555555555"
  ]
}
```

**Yanıt:**
```json
{
  "success": true,
  "message": "Toplu arama başlatıldı",
  "data": {
    "total": 2,
    "initiated": 2
  }
}
```

### 3. Webhook Endpoint'leri

#### Flow Webhook
```http
POST /api/calls/webhooks/flow
```
Twilio Studio Flow durumlarını alır.

#### Status Webhook
```http
POST /api/calls/webhooks/status
```
Çağrı durum güncellemelerini alır.

#### DTMF Webhook
```http
POST /api/calls/webhooks/dtmf
```
Kullanıcı tuş basımlarını alır.

---

## Twilio Flow Yapılandırması

### Flow Widget'ları

1. **Trigger**: Flow başlangıç noktası
2. **set_variables_1**: Çevre değişkenlerini ayarlar
3. **call_user_1**: Outbound çağrı yapar
4. **detection_machine**: Makine/insan tespiti
5. **happy-outgoing**: Ana menü ses kaydı ve DTMF toplama
6. **stage_1**: Kullanıcı seçimlerine göre yönlendirme
7. **confirmed/cancelled**: Sonuç durumları
8. **record_voicemail_1**: Sesli mesaj kaydı

### Flow Parametreleri

```json
{
  "NGROK_URL": "https://7758-213-194-69-194.ngrok-free.app",
  "call_hash": "{{flow.sid | replace: '-', ''}}_{{now | date: '%s'}}",
  "timeout": 60,
  "machineDetection": "Enable"
}
```

### Ana Menü Metni

> "Hello, This is Happy Smile Clinics calling to remind you about your appointment for the Kingston upon Hull Free Dental Consultation event. Our event will take place this weekend at Hull Marina Hotel Holiday Inn. If you're attending, please press 1. If you're no longer interested, press 2. To leave a voicemail, please press 0."

### DTMF Etkileşimleri

- **1**: Randevu onaylama (`confirm_appointment`)
- **2**: Randevu iptali (`cancel_appointment`)
- **0**: Sesli mesaj bırakma (`connect_to_representative`)

---

## Server Yapılandırması

### Ana Server (server.js)

```javascript
// Express app oluşturma
const app = express();
const server = http.createServer(app);

// Socket.IO kurulumu
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', process.env.NGROK_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling']
});

// CORS yapılandırması
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = ['http://localhost:3000'];
    if (process.env.NGROK_URL) {
      allowedOrigins.push(process.env.NGROK_URL);
    }
    callback(null, allowedOrigins.indexOf(origin) !== -1 || !origin);
  }
}));
```

### Middleware Stack

1. **express.json()**: JSON parsing
2. **express.urlencoded()**: URL encoding
3. **bodyParser.raw()**: Raw data parsing
4. **CORS**: Cross-origin support

---

## Veritabanı Yapılandırması

### TypeORM Konfigürasyonu

```javascript
const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(dataDir, 'database.sqlite'),
  entities: [path.join(__dirname, '../models/*.js')],
  synchronize: true,  // Otomatik schema güncellemesi
  logging: false      // SQL logging kapalı
});
```

### Veritabanı Başlatma

```javascript
async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Veritabanı bağlantısı başarıyla kuruldu');
    return true;
  } catch (error) {
    console.error('Veritabanı başlatma hatası:', error);
    return false;
  }
}
```

---

## Webhook Sistemi

### 1. Flow Webhook
- **Amaç**: Studio Flow durum güncellemeleri
- **İşlev**: Socket.IO ile real-time bildirimi
- **Event**: `flowUpdate`

### 2. Status Webhook
- **Amaç**: Çağrı durum değişiklikleri
- **İşlev**: Çağrı durumlarını takip etme
- **Event**: `statusUpdate`
- **Özel Durumlar**: busy, no-answer, canceled

### 3. DTMF Webhook
- **Amaç**: Kullanıcı tuş basımları
- **İşlev**: Menü seçimlerini işleme
- **Event**: `dtmfUpdate`
- **Aksiyon Türleri**: 
  - `confirm_appointment`
  - `cancel_appointment`
  - `connect_to_representative`

---

## Socket.IO Entegrasyonu

### Client Event'leri

```javascript
// Çağrı durum güncellemeleri
io.emit('statusUpdate', {
  execution_sid: 'FN123...',
  CallStatus: 'completed',
  DialCallStatus: 'busy',
  To: '+901234567890',
  timestamp: '2024-03-21T10:30:00Z'
});

// DTMF güncellemeleri
io.emit('dtmfUpdate', {
  execution_sid: 'FN123...',
  digits: '1',
  action: 'confirm_appointment',
  is_action: true,
  timestamp: 1647857400000
});

// Toplu çağrı tamamlama
io.emit('bulkCallComplete', {
  total: 10,
  success: 8,
  failed: 2,
  results: [...],
  errors: [...]
});
```

### Bağlantı Yönetimi

```javascript
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  console.log(`Aktif bağlantı sayısı: ${io.engine.clientsCount}`);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

---

## Kurulum ve Çalıştırma

### 1. Önkoşullar
- Node.js (v16+)
- NPM
- Twilio hesabı
- Ngrok

### 2. Kurulum
```bash
# Bağımlılıkları yükle
npm install

# Çevre değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle
```

### 3. Çalıştırma (Windows)
```batch
# Otomatik başlatma scripti
basit.bat

# Manuel başlatma
ngrok http 3001
node server.js
```

### 4. Çalıştırma (Unix/Linux)
```bash
# Ngrok başlat
ngrok http 3001

# Server başlat
npm start
```

---

## Çevre Değişkenleri

### Gerekli Değişkenler

```env
# Twilio Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_FLOW_SID=FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server Configuration
PORT=3001
NGROK_URL=https://xxxxxxxx.ngrok-free.app

# Database (opsiyonel)
DATABASE_URL=./data/database.sqlite
```

### Değişken Açıklamaları

- **TWILIO_ACCOUNT_SID**: Twilio hesap ID'si
- **TWILIO_AUTH_TOKEN**: Twilio authentication token
- **TWILIO_PHONE_NUMBER**: Çağrı yapacak telefon numarası
- **TWILIO_FLOW_SID**: Studio Flow ID'si
- **PORT**: Server port numarası
- **NGROK_URL**: Ngrok tunnel URL'si

---

## Hata Yönetimi

### 1. Twilio Hataları
```javascript
// Twilio hata yakalama
try {
  const execution = await twilioClient.studio.v2.flows(flowSid)
    .executions.create({...});
} catch (error) {
  if (error.code) {
    console.error(`Twilio Error ${error.code}: ${error.message}`);
  }
}
```

### 2. Veritabanı Hataları
```javascript
// Veritabanı hatalarını yoksay ve devam et
try {
  await callRepository.save(newCall);
} catch (dbError) {
  console.warn('Veritabanı kaydı oluşturulamadı:', dbError.message);
  // Hata olsa da çağrı devam eder
}
```

### 3. Webhook Hataları
```javascript
// Webhook hatalarında 500 döndür
router.post('/webhooks/dtmf', (req, res) => {
  try {
    // Webhook işleme
    res.sendStatus(200);
  } catch (error) {
    console.error('DTMF webhook hatası:', error);
    res.sendStatus(500);
  }
});
```

### 4. Socket.IO Hataları
```javascript
// Socket.IO bağlantı kontrolü
if (global.io) {
  global.io.emit('statusUpdate', data);
} else {
  console.error('Socket.io bağlantısı yok!');
}
```

---

## Performans Optimizasyonları

### 1. Socket.IO Optimizasyonları
- **Volatile events**: Kayıp toleranslı mesajlar için
- **Double sending**: Kritik mesajlar için çift gönderim
- **Timeout delays**: Ağ gecikmelerini telafi etme

### 2. Twilio Optimizasyonları
- **Active execution cleanup**: Önceki çağrıları temizleme
- **Bulk call management**: Toplu çağrılarda sınırlama (max 10)
- **Parallel processing**: Promise.all ile paralel işleme

### 3. Veritabanı Optimizasyonları
- **Synchronize mode**: Geliştirme için otomatik schema
- **Logging disabled**: Performans için SQL logging kapalı
- **Connection pooling**: TypeORM otomatik havuzlama

---

## Güvenlik Önlemleri

### 1. CORS Yapılandırması
- Sınırlı origin listesi
- Ngrok URL dinamik ekleme
- Credentials desteği

### 2. Webhook Güvenliği
- Request validation
- Error handling
- Rate limiting (gelecekte eklenebilir)

### 3. Environment Variables
- Hassas bilgilerin .env dosyasında saklanması
- Production ortamında farklı değerler

---

Bu dokümantasyon, sistemin tam yapısını ve çalışma mantığını detaylı olarak açıklamaktadır. Herhangi bir bölüm hakkında daha fazla bilgiye ihtiyaç duyarsanız, lütfen belirtin. 