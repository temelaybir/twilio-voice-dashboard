// Gerekli modülleri yükle
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const logger = require('./config/logger');

// Çevre değişkenlerini yükle (en başta)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Twilio kimlik bilgilerini kontrol et (debug için)
logger.info('Server.js - Twilio kimlik bilgilerini kontrol ediyorum:');
logger.info(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Tanımlı' : 'Tanımlı değil'}`);
logger.info(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Tanımlı' : 'Tanımlı değil'}`);

// Webhook URL belirleme (Production vs Development)
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'http://localhost:3001';
logger.info(`Webhook Base URL: ${WEBHOOK_BASE_URL}`);

// Koşullu olarak model ve database modüllerini yükle
let database = null;
let Call = null;

try {
  if (fs.existsSync('./config/database.js')) {
    database = require('./config/database');
    Call = require('./models/Call').Call;
    logger.info('Database modülü başarıyla yüklendi');
  } else {
    logger.warn('Database modülü bulunamadı, veritabanı olmadan devam ediliyor');
  }
} catch (error) {
  logger.error('Database modülü yüklenirken hata oluştu:', { message: error.message });
}

// Express uygulaması oluştur
const app = express();

// CORS Origins - Development ve Production
const corsOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
];

// Production frontend URL varsa ekle
if (process.env.FRONTEND_URL) {
  corsOrigins.push(process.env.FRONTEND_URL);
}

// Ngrok URL varsa ekle (development için)
if (process.env.NGROK_URL) {
  corsOrigins.push(process.env.NGROK_URL);
}

logger.info(`CORS Origins: ${corsOrigins.join(', ')}`);

// CORS Middleware - Frontend istekleri için
app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.raw({ type: '*/*' }));

// Ana sayfa route'u - API Status
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Twilio Voice API - Çalışıyor',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /api/calls/start': 'Yeni arama başlat',
      'GET /api/calls/history': 'Arama geçmişini getir',
      'GET /api/calls/summary': 'Arama özetini getir',
      'POST /api/calls/webhooks/flow': 'Twilio Flow webhook',
      'POST /api/calls/webhooks/status': 'Twilio Status webhook',
      'POST /api/calls/webhooks/dtmf': 'Twilio DTMF webhook'
    },
    database: database ? 'connected' : 'not configured',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rotaları yükle
app.use('/api/calls', require('./routes/voice'));

// Ana fonksiyon
async function startServer() {
  try {
    // Webhook base URL'ini temizle (trailing slash kaldır)
    const cleanWebhookUrl = WEBHOOK_BASE_URL.endsWith('/') 
      ? WEBHOOK_BASE_URL.slice(0, -1) 
      : WEBHOOK_BASE_URL;

    // Sunucu konfigürasyonu
    const config = {
      port: process.env.PORT || 3001,
      webhookBaseUrl: cleanWebhookUrl,
      webhooks: {
        flow: `${cleanWebhookUrl}/api/calls/webhooks/flow`,
        status: `${cleanWebhookUrl}/api/calls/webhooks/status`,
        dtmf: `${cleanWebhookUrl}/api/calls/webhooks/dtmf`
      },
      environment: process.env.NODE_ENV || 'development'
    };

    // Global olarak erişilebilir yap (webhook URL'leri için)
    global.webhookConfig = config;

    // Veritabanını başlat (varsa)
    if (database && database.initializeDatabase) {
      await database.initializeDatabase();
      logger.info('Veritabanı başarıyla başlatıldı');
    } else {
      logger.warn('Veritabanı olmadan devam ediliyor');
    }

    // Server'ı başlat
    app.listen(config.port, () => {
      logger.info(`✅ Server running on port ${config.port}`);
      logger.info(`Environment: ${config.environment}`);
      logger.info(`Webhook Base URL: ${config.webhookBaseUrl}`);
      logger.info('Webhook URLs:');
      logger.info(` - Flow: ${config.webhooks.flow}`);
      logger.info(` - Status: ${config.webhooks.status}`);
      logger.info(` - DTMF: ${config.webhooks.dtmf}`);
      
      if (process.env.NGROK_URL) {
        logger.info('🔄 Ngrok mode: Development webhook URLs active');
      } else if (process.env.WEBHOOK_BASE_URL) {
        logger.info('🚀 Production mode: Using WEBHOOK_BASE_URL');
      } else {
        logger.warn('⚠️  Local mode: Using localhost (webhooks may not work externally)');
      }
    });

    // Global config'i export et
    global.config = config;

  } catch (error) {
    logger.error('Server başlatılırken hata oluştu:', { error });
    process.exit(1);
  }
}

// Server'ı başlat
startServer(); 