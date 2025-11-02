// Gerekli modülleri yükle
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const logger = require('./config/logger');
const cron = require('node-cron');
const { exec } = require('child_process');
const dailyEmailReport = require('./scripts/daily-email-report.js');

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

// Vercel frontend URL'leri (production)
// Örnek: https://voice-dashboard-six.vercel.app
if (process.env.VERCEL_FRONTEND_URL) {
  corsOrigins.push(process.env.VERCEL_FRONTEND_URL);
}

// Vercel preview URL'leri için wildcard (development/preview)
// *.vercel.app pattern'i için dynamic origin kontrolü yapılacak
const isVercelPreview = (origin) => {
  if (!origin) return false;
  return /^https:\/\/.*\.vercel\.app$/.test(origin);
};

// Ngrok URL varsa ekle (development için)
if (process.env.NGROK_URL) {
  corsOrigins.push(process.env.NGROK_URL);
}

logger.info(`CORS Origins: ${corsOrigins.join(', ')}`);
if (process.env.VERCEL_FRONTEND_URL) {
  logger.info(`Vercel Frontend URL: ${process.env.VERCEL_FRONTEND_URL}`);
}

// CORS Middleware - Frontend istekleri için
app.use(cors({
  origin: (origin, callback) => {
    // Origin yoksa (same-origin request veya Postman gibi tools)
    if (!origin) {
      return callback(null, true);
    }
    
    // CORS whitelist'te varsa izin ver
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Vercel preview URL'leri için (development/preview)
    if (isVercelPreview(origin)) {
      logger.info(`✅ [CORS] Vercel preview URL izin verildi: ${origin}`);
      return callback(null, true);
    }
    
    // İzin verilmeyen origin
    logger.warn(`⚠️ [CORS] İzin verilmeyen origin: ${origin}`);
    callback(new Error('CORS policy violation'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Middleware
app.use(morgan('combined', { stream: logger.stream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.raw({ type: '*/*' }));

// Ana sayfa route'u - API Status (static files'dan önce!)
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Twilio Voice API Service',
    version: '2.0.0'
  });
});

// Daily email endpoint - Production için (API key ile korumalı)
// Güvenlik: X-API-Key header'ı ile korumalı
app.post('/api/daily-email', async (req, res) => {
  // API Key kontrolü
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.EMAIL_REPORT_API_KEY;
  
  if (!expectedApiKey) {
    logger.warn('⚠️ [SECURITY] EMAIL_REPORT_API_KEY environment variable tanımlı değil');
    return res.status(500).json({ 
      error: 'Server configuration error: API key not configured' 
    });
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    logger.warn('⚠️ [SECURITY] Geçersiz API key ile daily email endpoint erişim denemesi:', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid or missing API key',
      hint: 'Please provide a valid X-API-Key header'
    });
  }
  
  try {
    logger.info('📧 [DAILY EMAIL] Günlük email endpoint çağrıldı', {
      ip: req.ip,
      date: req.body.date
    });
    
    const { date } = req.body;
    const testDate = date || new Date().toLocaleDateString('en-CA', { 
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    logger.info(`📧 [DAILY EMAIL] Rapor tarihi: ${testDate}`);
    
    const loggerWrapper = {
      log: (msg, ...args) => logger.info(`📧 [EMAIL] ${msg}`, ...args),
      error: (msg, ...args) => logger.error(`❌ [EMAIL ERROR] ${msg}`, ...args)
    };
    
    await dailyEmailReport.main(testDate, loggerWrapper);
    
    res.json({ 
      success: true, 
      message: 'Test email başarıyla gönderildi',
      date: testDate
    });
  } catch (error) {
    logger.error('❌ [DAILY EMAIL] Email gönderme hatası:', { 
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Email gönderme hatası',
      message: error.message
    });
  }
});

// Test email endpoint (sadece TEST_EMAIL_SCHEDULER=true ise - backward compatibility)
app.post('/api/test-email', async (req, res) => {
  // Endpoint aktif mi kontrol et
  if (process.env.TEST_EMAIL_SCHEDULER !== 'true') {
    return res.status(403).json({ 
      error: 'Test email endpoint disabled. Use /api/daily-email instead or set TEST_EMAIL_SCHEDULER=true.',
      hint: 'Production için /api/daily-email endpoint\'ini kullanın (API key ile korumalı)'
    });
  }
  
  // API Key kontrolü (aynı)
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.EMAIL_REPORT_API_KEY;
  
  if (!expectedApiKey) {
    logger.warn('⚠️ [SECURITY] EMAIL_REPORT_API_KEY environment variable tanımlı değil');
    return res.status(500).json({ 
      error: 'Server configuration error: API key not configured' 
    });
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    logger.warn('⚠️ [SECURITY] Geçersiz API key ile test email endpoint erişim denemesi:', {
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid or missing API key',
      hint: 'Please provide a valid X-API-Key header'
    });
  }
  
  try {
    logger.info('🧪 [TEST] Test email endpoint çağrıldı (güvenli)', {
      ip: req.ip,
      date: req.body.date
    });
    
    const { date } = req.body;
    const testDate = date || new Date().toLocaleDateString('en-CA', { 
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    logger.info(`🧪 [TEST] Test tarihi: ${testDate}`);
    
    const loggerWrapper = {
      log: (msg, ...args) => logger.info(`🧪 [TEST] ${msg}`, ...args),
      error: (msg, ...args) => logger.error(`🧪 [TEST ERROR] ${msg}`, ...args)
    };
    
    await dailyEmailReport.main(testDate, loggerWrapper);
    
    res.json({ 
      success: true, 
      message: 'Test email başarıyla gönderildi',
      date: testDate
    });
  } catch (error) {
    logger.error('❌ [TEST] Test email hatası:', { 
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Test email gönderme hatası',
      message: error.message
    });
  }
});

// Rotaları yükle (static files'dan ÖNCE!)
app.use('/api/calls', require('./routes/voice'));

// Static files (API routes'tan SONRA!)
app.use(express.static(path.join(__dirname, 'public')));

// Webhook base URL'ini temizle (trailing slash kaldır)
const cleanWebhookUrl = WEBHOOK_BASE_URL.endsWith('/') 
  ? WEBHOOK_BASE_URL.slice(0, -1) 
  : WEBHOOK_BASE_URL;

// Sunucu konfigürasyonu (hemen oluştur - Vercel için)
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
global.config = config;

// Veritabanını lazy initialize et (Vercel'de cold start sırasında sorun olabilir)
let dbInitialized = false;
async function initializeDatabaseIfNeeded() {
  if (dbInitialized) return;
  
  if (database && database.initializeDatabase) {
    try {
      const initialized = await database.initializeDatabase();
      if (!initialized) {
        logger.warn('⚠️ Veritabanı başlatılamadı, API-only modda devam ediliyor');
      } else {
        dbInitialized = true;
      }
    } catch (dbError) {
      logger.error('❌ Veritabanı bağlantı hatası:', { 
        message: dbError.message,
        stack: dbError.stack 
      });
      logger.warn('⚠️ API-only modda devam ediliyor (database olmadan)');
    }
  }
}

// Ana fonksiyon (sadece local development için)
async function startServer() {
  try {
    // Veritabanını başlat (local development için)
    await initializeDatabaseIfNeeded();

    // Server'ı başlat (sadece local development için)
    // Vercel'de app.listen() çalışmaz, Vercel kendi server'ını kullanır
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

    // Vercel'de bu log'lar çalışmayacak
    if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
      logger.info('🚀 Vercel Serverless Function mode');
      logger.info(`Webhook Base URL: ${config.webhookBaseUrl}`);
    }

    // Günlük Email Raporu Scheduler - Türkiye saati ile 23:59'da
    // node-cron timezone desteği ile Türkiye saati (Europe/Istanbul)
    // Vercel'de cron job'lar çalışmaz, sadece local/standalone server'larda
    if (process.env.ENABLE_DAILY_EMAIL !== 'false' && process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
      // Cron job'ı tanımla
      const emailJob = cron.schedule('59 23 * * *', async () => {
        logger.info('📧 Günlük email raporu gönderiliyor (Türkiye saati: 23:59)...');
        
        // Türkiye saatine göre bugünün tarihini al
        // 23:59'da o günün raporunu gönder
        const now = new Date();
        // Türkiye saati için format (YYYY-MM-DD)
        const turkiyeDateStr = now.toLocaleDateString('en-CA', { 
          timeZone: 'Europe/Istanbul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        // en-CA formatı zaten YYYY-MM-DD formatında döner
        const targetDate = turkiyeDateStr;
        
        logger.info(`📅 Rapor tarihi: ${targetDate} (Türkiye saati)`);
        
        try {
          // Modül olarak doğrudan çağır (Vercel uyumlu)
          const loggerWrapper = {
            log: (msg, ...args) => logger.info(msg, ...args),
            error: (msg, ...args) => logger.error(msg, ...args)
          };
          
          await dailyEmailReport.main(targetDate, loggerWrapper);
          
          logger.info('✅ Günlük email raporu başarıyla gönderildi');
        } catch (error) {
          logger.error('❌ Günlük email raporu hatası:', { 
            error: error.message,
            stack: error.stack
          });
        }
      }, {
        timezone: 'Europe/Istanbul', // Türkiye saati
        scheduled: true // Açıkça aktif olarak ayarla
      });
      
      // Scheduler'ın durumunu kontrol et
      // Not: emailJob.running hemen true olmayabilir, bir sonraki tick'te true olur
      logger.info('⏰ Günlük email raporu scheduler aktif - Her gün 23:59 (Türkiye saati)');
      logger.info(`   Scheduler durumu: ÇALIŞIYOR ✅ (scheduled: ${emailJob.scheduled})`);
      logger.info('   Raporu devre dışı bırakmak için: ENABLE_DAILY_EMAIL=false');
      
      // Test modu: 10 saniye sonra test email gönder (opsiyonel)
      // Vercel'de TEST_EMAIL_SCHEDULER=true ekleyin, testten sonra kaldırın
      if (process.env.TEST_EMAIL_SCHEDULER === 'true') {
        logger.info('🧪 Test modu: 10 saniye sonra test email gönderilecek...');
        const testTimeout = setTimeout(async () => {
          try {
            logger.info('🧪 [TEST] Test email gönderme başlatıldı...');
            const testDate = new Date();
            const testDateStr = testDate.toLocaleDateString('en-CA', { 
              timeZone: 'Europe/Istanbul',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
            
            logger.info(`🧪 [TEST] Test tarihi: ${testDateStr}`);
            
            const loggerWrapper = {
              log: (msg, ...args) => logger.info(`🧪 [TEST] ${msg}`, ...args),
              error: (msg, ...args) => logger.error(`🧪 [TEST ERROR] ${msg}`, ...args)
            };
            
            logger.info('🧪 [TEST] Email modülü çağrılıyor...');
            await dailyEmailReport.main(testDateStr, loggerWrapper);
            logger.info('✅ [TEST] Test email başarıyla gönderildi');
          } catch (error) {
            logger.error('❌ [TEST] Test email hatası:', { 
              message: error.message,
              stack: error.stack,
              name: error.name
            });
          }
        }, 10000); // 10 saniye = 10000 ms (test için daha hızlı)
        
        // Timeout'un kaybolmaması için global'a ekle
        global.testEmailTimeout = testTimeout;
        logger.info(`🧪 [TEST] Timeout ID: ${testTimeout}`);
      }
    } else {
      logger.info('⏰ Günlük email raporu scheduler devre dışı (ENABLE_DAILY_EMAIL=false)');
    }

  } catch (error) {
    logger.error('Server başlatılırken hata oluştu:', { error });
    process.exit(1);
  }
}

// Vercel Serverless Functions için export
// Vercel'de app.listen() çalışmaz, sadece app'i export ediyoruz
module.exports = app;

// Local development için server'ı başlat
// Vercel'de bu çalışmayacak (environment variable kontrolü ile)
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  startServer();
} 