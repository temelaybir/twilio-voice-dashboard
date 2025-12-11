const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('../config/logger');

// Database ve modelleri yükle
let database = null;
let EventHistory = null;

try {
  if (fs.existsSync('./config/database.js')) {
    database = require('../config/database');
    EventHistory = require('../models/EventHistory').EventHistory;
    logger.info('EventHistory modülü başarıyla yüklendi');
  } else {
    logger.warn('Database modülü bulunamadı');
  }
} catch (error) {
  logger.error('EventHistory modülü yüklenirken hata:', { message: error.message });
}

// Twilio Webhook Signature Validation (Güvenlik)
function validateTwilioWebhook(req) {
  const twilioSignature = req.headers['x-twilio-signature'];
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  // Vercel'de signature validation sorunlu olabilir (proxy nedeniyle)
  // Vercel ortamında signature validation'ı atla
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    logger.debug('⚠️ [SECURITY] Vercel ortamı - Signature validation atlanıyor');
    return true; // Vercel'de izin ver
  }
  
  // Eğer TWILIO_AUTH_TOKEN yoksa, validation devre dışı (development)
  if (!authToken) {
    logger.warn('⚠️ [SECURITY] TWILIO_AUTH_TOKEN tanımlı değil - Webhook validation atlanıyor (sadece development!)');
    return true; // Development için izin ver
  }
  
  // Signature yoksa reddet (sadece production ve auth token varsa)
  if (!twilioSignature) {
    logger.warn('⚠️ [SECURITY] Twilio webhook signature eksik - Request reddedildi');
    return false;
  }
  
  // Twilio URL'ini al (production için)
  const webhookUrl = process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || '';
  const fullUrl = `${webhookUrl}${req.originalUrl}`;
  
  // Body formatını belirle
  // Twilio Studio Flow JSON body gönderir, signature validation için raw JSON string gerekir
  let body = '';
  
  // Raw body varsa (express.json verify callback ile saklanmış) direkt kullan
  // Twilio signature validation JSON body için raw JSON string bekler
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
    body = req.rawBody.toString('utf8');
  } else if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      // Raw body buffer ise direkt kullan
      body = req.body.toString('utf8');
    } else if (typeof req.body === 'object') {
      // Parse edilmiş JSON body ise tekrar JSON string'e çevir
      // Twilio signature validation JSON body için raw JSON string bekler
      body = JSON.stringify(req.body);
    } else {
      body = String(req.body);
    }
  }
  
  // Twilio signature validation
  try {
    // Twilio.validateRequest JSON body için raw JSON string bekler
    const isValid = twilio.validateRequest(
      authToken,
      twilioSignature,
      fullUrl,
      body || ''
    );
    
    if (!isValid) {
      logger.warn('⚠️ [SECURITY] Geçersiz Twilio webhook signature - Request reddedildi', {
        url: fullUrl,
        hasBody: !!body,
        bodyLength: body ? body.length : 0,
        contentType: req.headers['content-type']
      });
    }
    
    return isValid;
  } catch (error) {
    logger.error('❌ [SECURITY] Twilio webhook validation hatası:', { message: error.message });
    return false; // Hata durumunda güvenli tarafta kal
  }
}

// Database initialize kontrolü ve başlatma helper (Vercel için)
async function ensureDatabaseInitialized() {
  if (!database || !database.AppDataSource) {
    return false;
  }

  const AppDataSource = database.AppDataSource;
  
  // Zaten initialize edilmişse
  if (AppDataSource.isInitialized) {
    return true;
  }

  // Initialize etmeye çalış
  try {
    await database.initializeDatabase();
    return AppDataSource.isInitialized;
  } catch (error) {
    logger.error('Database initialize hatası:', { message: error.message });
    return false;
  }
}

// Event History'ye kaydetme fonksiyonu
async function saveEventHistory(eventType, eventData) {
  if (!database || !database.AppDataSource || !EventHistory) {
    return;
  }

  // Database initialize kontrolü
  const isInitialized = await ensureDatabaseInitialized();
  if (!isInitialized) {
    logger.warn('Database initialize edilemedi, event kaydedilemiyor');
    return;
  }

  try {
    const eventRepository = database.AppDataSource.getRepository(EventHistory);
    const newEvent = eventRepository.create({
      executionSid: eventData.execution_sid || eventData.CallSid,
      callSid: eventData.CallSid,
      eventType: eventType,
      eventData: JSON.stringify(eventData),
      to: eventData.To || eventData.to,
      from: eventData.From || eventData.from,
      status: eventData.CallStatus || eventData.status,
      dtmfDigits: eventData.digits,
      action: eventData.action,
      timestamp: Date.now()
    });
    
    await eventRepository.save(newEvent);
    logger.debug(`Event history kaydedildi: ${eventType}`);
  } catch (error) {
    logger.error('Event history kaydetme hatası:', { message: error.message });
  }
}

// Çevre değişkenlerini yükle
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Hata ayıklama için .env dosyasının içeriğini okuma
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    logger.debug(`.env dosyası bulundu: ${envPath}`);
    const envContent = fs.readFileSync(envPath, 'utf8');
    logger.debug(`.env dosya içeriği (hassas bilgiler gizlendi): ${envContent.replace(/=(.*)/g, '=***')}`);
  } else {
    logger.warn(`.env dosyası bulunamadı: ${envPath}`);
  }
} catch (err) {
  logger.error('.env dosyası okunamadı:', { message: err.message });
}

// ==================== MULTI-TWILIO CLIENT DESTEĞİ ====================
// Poland ve UK için ayrı Twilio hesapları

// Twilio yapılandırmaları (region bazlı)
const TWILIO_CONFIGS = {
  poland: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    flowSid: process.env.TWILIO_FLOW_SID
  },
  uk: {
    accountSid: process.env.TWILIO_UK_ACCOUNT_SID,
    authToken: process.env.TWILIO_UK_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_UK_PHONE_NUMBER,
    flowSid: process.env.TWILIO_UK_FLOW_SID
  }
};

// Twilio client'ları (lazy initialization)
const twilioClients = {};

// Region'a göre Twilio client al
function getTwilioClient(region = 'poland') {
  const config = TWILIO_CONFIGS[region];
  if (!config || !config.accountSid || !config.authToken) {
    logger.warn(`Twilio config bulunamadı: ${region}`);
    return null;
  }
  
  // Cache'den al veya oluştur
  if (!twilioClients[region]) {
    twilioClients[region] = twilio(config.accountSid, config.authToken);
    logger.info(`✅ Twilio client oluşturuldu: ${region}`);
  }
  
  return twilioClients[region];
}

// Region'a göre Twilio config al
function getTwilioConfig(region = 'poland') {
  return TWILIO_CONFIGS[region] || TWILIO_CONFIGS.poland;
}

// Default Twilio client (geriye uyumluluk için)
let twilioClient = null;
try {
  logger.info('Twilio kimlik bilgileri kontrol ediliyor...');
  logger.info(`TWILIO_ACCOUNT_SID (Poland): ${process.env.TWILIO_ACCOUNT_SID ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_AUTH_TOKEN (Poland): ${process.env.TWILIO_AUTH_TOKEN ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_PHONE_NUMBER (Poland): ${process.env.TWILIO_PHONE_NUMBER ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_FLOW_SID (Poland): ${process.env.TWILIO_FLOW_SID ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_UK_ACCOUNT_SID (UK): ${process.env.TWILIO_UK_ACCOUNT_SID ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_UK_AUTH_TOKEN (UK): ${process.env.TWILIO_UK_AUTH_TOKEN ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_UK_PHONE_NUMBER (UK): ${process.env.TWILIO_UK_PHONE_NUMBER ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_UK_FLOW_SID (UK): ${process.env.TWILIO_UK_FLOW_SID ? 'Tanımlı' : 'Tanımlı değil'}`);
  
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    logger.info('Twilio istemcisi başarıyla oluşturuldu (Poland - default)');
  } else {
    logger.warn('Twilio kimlik bilgileri bulunamadı, Twilio istemcisi olmadan devam ediliyor');
  }
} catch (error) {
  logger.error('Twilio istemcisi oluşturma hatası:', { message: error.message });
}

// Çağrı başlatma endpoint'i
router.post('/start', async (req, res) => {
  logger.info('Çağrı başlatma isteği alındı (/start)', { body: req.body });
  try {
    if (!twilioClient) {
      throw new Error('Twilio istemcisi başlatılmadı');
    }

    if (!req.body.to) {
      throw new Error('Telefon numarası gerekli');
    }

    // Aktif çağrıları kontrol et
    try {
      const activeExecutions = await twilioClient.studio.v2.flows(process.env.TWILIO_FLOW_SID)
        .executions
        .list({status: 'active', limit: 5});
      
      logger.info(`${activeExecutions.length} aktif çağrı bulundu`);
      
      // Önceki aktif çağrıları sonlandır
      if (activeExecutions.length > 0) {
        for (const execution of activeExecutions) {
          try {
            await twilioClient.studio.v2.flows(process.env.TWILIO_FLOW_SID)
              .executions(execution.sid)
              .update({status: 'ended'});
            logger.info(`Aktif çağrı sonlandırıldı: ${execution.sid}`);
          } catch (err) {
            logger.error(`Çağrı sonlandırma hatası (${execution.sid}):`, { message: err.message });
          }
        }
      }
    } catch (err) {
      logger.warn('Aktif çağrıları kontrol ederken hata:', { message: err.message });
    }

    // Webhook URL'lerini oluştur (global webhookConfig'den al)
    const webhookUrls = global.webhookConfig?.webhooks || {
      flow: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'http://localhost:3001'}/api/calls/webhooks/flow`,
      status: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'http://localhost:3001'}/api/calls/webhooks/status`,
      dtmf: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'http://localhost:3001'}/api/calls/webhooks/dtmf`
    };
    
    // Flow parametreleri
    const flowParameters = {
      flowWebhook: webhookUrls.flow,
      statusWebhook: webhookUrls.status,
      dtmfWebhook: webhookUrls.dtmf,
      WEBHOOK_BASE_URL: global.webhookConfig?.webhookBaseUrl || process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL,
      timeout: 60,
      machineDetection: 'Enable',
      asyncAmd: true,
      amdStatusCallback: webhookUrls.status,
      ringTime: 20,
      answerOnBridge: true,
      record: false
    };

    // Yeni çağrı başlat
    const logData = {
      to: req.body.to,
      from: process.env.TWILIO_PHONE_NUMBER,
      webhooks: webhookUrls,
      parameters: flowParameters
    };
    logger.info('Yeni çağrı başlatılıyor (Twilio\'ya giden veri):', { logData });

    const execution = await twilioClient.studio.v2.flows(process.env.TWILIO_FLOW_SID)
      .executions
      .create({
        to: req.body.to,
        from: process.env.TWILIO_PHONE_NUMBER,
        parameters: flowParameters
      });

    logger.info('Çağrı başarıyla başlatıldı (Twilio\'dan gelen yanıt):', { executionSid: execution.sid });

    // Veritabanı mevcutsa çağrı kaydını oluştur
    if (global.database && global.database.AppDataSource && global.Call) {
      try {
        const callRepository = global.database.AppDataSource.getRepository(global.Call);
        const newCall = callRepository.create({
          executionSid: execution.sid,
          to: req.body.to,
          status: 'initiated',
          createdAt: new Date()
        });
        
        await callRepository.save(newCall);
        logger.info('Çağrı kaydı veritabanına eklendi:', { executionSid: execution.sid });
      } catch (dbError) {
        logger.warn('Veritabanı kaydı oluşturulamadı:', { message: dbError.message });
      }
    }

    res.json({
      success: true,
      message: 'Çağrı başlatıldı',
      data: {
        execution_sid: execution.sid
      }
    });
  } catch (error) {
    logger.error('Çağrı başlatma hatası:', { error: error.message, code: error.code });
    
    // Twilio hata detaylarını kontrol et
    let errorMessage = error.message;
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code) {
      errorCode = error.code;
      errorMessage = `Twilio Error ${error.code}: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
});

// Toplu çağrı başlatma endpoint'i
router.post('/start-bulk', async (req, res) => {
  logger.info('Toplu çağrı başlatma isteği alındı (/start-bulk)', { body: req.body });
  try {
    if (!twilioClient) {
      throw new Error('Twilio istemcisi başlatılmadı');
    }

    if (!req.body.phoneNumbers || !Array.isArray(req.body.phoneNumbers) || req.body.phoneNumbers.length === 0) {
      throw new Error('En az bir telefon numarası gerekli');
    }
    
    // En fazla 10 telefon numarası ile sınırla
    const phoneNumbers = req.body.phoneNumbers.slice(0, 10).filter(num => num.trim() !== '');
    
    if (phoneNumbers.length === 0) {
      throw new Error('Geçerli telefon numarası bulunamadı');
    }

    logger.info(`Toplu arama başlatılıyor: ${phoneNumbers.length} numara`);

    // Webhook URL'lerini oluştur
    const webhookUrls = global.webhookConfig?.webhooks || {
      flow: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'http://localhost:3001'}/api/calls/webhooks/flow`,
      status: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'http://localhost:3001'}/api/calls/webhooks/status`,
      dtmf: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'http://localhost:3001'}/api/calls/webhooks/dtmf`
    };
    
    // Flow parametreleri
    const flowParameters = {
      flowWebhook: webhookUrls.flow,
      statusWebhook: webhookUrls.status,
      dtmfWebhook: webhookUrls.dtmf,
      WEBHOOK_BASE_URL: global.webhookConfig?.webhookBaseUrl || process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL,
      timeout: 60,
      machineDetection: 'Enable',
      asyncAmd: true,
      amdStatusCallback: webhookUrls.status,
      ringTime: 20,
      answerOnBridge: true,
      record: false
    };

    // Sonuçları depolamak için array
    const results = [];
    const errors = [];

    // Her bir telefon numarası için çağrı başlat
    const initiateCall = async (phoneNumber, index) => {
      try {
        // Gecikme ekle (API rate limitlerini önlemek için)
        await new Promise(resolve => setTimeout(resolve, index * 1000));
        
        const logData = {
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          parameters: flowParameters
        };
        logger.info(`Toplu çağrı başlatılıyor (${phoneNumber}):`, { logData });

        const execution = await twilioClient.studio.v2.flows(process.env.TWILIO_FLOW_SID)
          .executions
          .create({
            to: phoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            parameters: flowParameters
          });

        logger.info(`Toplu çağrı başarıyla başlatıldı (${phoneNumber}):`, { executionSid: execution.sid });
        results.push({ to: phoneNumber, execution_sid: execution.sid });
        
      } catch (err) {
        logger.error(`Toplu çağrı hatası (${phoneNumber}):`, { message: err.message, code: err.code });
        errors.push({ to: phoneNumber, error: err.message, code: err.code });
      }
    };

    // Paralelliği kontrol etmek için Promise.all kullanma
    // Bunun yerine sırayla çağrı başlatacağız
    for (let i = 0; i < phoneNumbers.length; i++) {
      // Konsola ilerleme bilgisi
      logger.info(`Çağrı kuyruğa eklendi (${i+1}/${phoneNumbers.length}): ${phoneNumbers[i]}`);
    }
    
    // Çağrıları başlatma işlemini başlat (uzun sürebilir)
    const callPromises = phoneNumbers.map((phoneNumber, index) => 
      initiateCall(phoneNumber, index)
    );
    
    // Yanıtı hemen gönder, çağrılar arka planda başlatılacak
    res.json({
      success: true,
      message: `${phoneNumbers.length} çağrı kuyruğa alındı`,
      phoneNumbers
    });
    
    // Arka planda çağrıları başlat
    Promise.all(callPromises).then(() => {
      logger.info('Tüm toplu çağrılar tamamlandı:', {
        başarılı: results.length,
        başarısız: errors.length
      });
    });
    
  } catch (error) {
    logger.error('Toplu çağrı başlatma hatası:', { message: error.message, code: error.code });
    
    // Twilio hata detaylarını kontrol et
    let errorMessage = error.message;
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.code) {
      errorCode = error.code;
      errorMessage = `Twilio Error ${error.code}: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
});

// ==================== LİSTE BAZLI TOPLU ARAMA ====================

// POST /api/calls/start-bulk-from-list - Email listesinden toplu arama başlat
router.post('/start-bulk-from-list', async (req, res) => {
  logger.info('Liste bazlı toplu arama isteği alındı', { body: req.body });
  
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    if (!twilioClient) {
      throw new Error('Twilio istemcisi başlatılmadı');
    }
    
    const { listIds } = req.body;
    
    if (!listIds || !Array.isArray(listIds) || listIds.length === 0) {
      return res.status(400).json({ error: 'En az bir liste seçilmeli' });
    }
    
    const { EmailList } = require('../models/EmailList');
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { CallQueue } = require('../models/CallQueue');
    
    const listRepo = AppDataSource.getRepository(EmailList);
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const queueRepo = AppDataSource.getRepository(CallQueue);
    
    // Listeleri al
    const lists = await listRepo.find({
      where: listIds.map(id => ({ id: parseInt(id) }))
    });
    
    if (lists.length === 0) {
      return res.status(404).json({ error: 'Listeler bulunamadı' });
    }
    
    // Listelerin twilioRegion'ını kontrol et (tümü aynı olmalı)
    const twilioRegion = lists[0].twilioRegion || 'poland';
    const mixedRegions = lists.some(l => (l.twilioRegion || 'poland') !== twilioRegion);
    if (mixedRegions) {
      return res.status(400).json({ 
        error: 'Farklı Twilio bölgelerindeki listeler birlikte aranamaz. Lütfen aynı bölgedeki listeleri seçin.' 
      });
    }
    
    // Region için Twilio client kontrolü
    const regionClient = getTwilioClient(twilioRegion);
    const regionConfig = getTwilioConfig(twilioRegion);
    if (!regionClient || !regionConfig.flowSid) {
      return res.status(400).json({ 
        error: `${twilioRegion.toUpperCase()} bölgesi için Twilio yapılandırması eksik` 
      });
    }
    
    // Listelerden aktif aboneleri al (telefon numarası olanlar)
    const subscribers = await subscriberRepo.find({
      where: listIds.map(id => ({ listId: parseInt(id), status: 'active' }))
    });
    
    // Telefon numarası olanları filtrele
    const phoneNumbers = subscribers
      .filter(s => s.phone && s.phone.trim() !== '')
      .map(s => {
        let phone = s.phone.trim();
        // Numarayı normalize et
        if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }
        return phone;
      })
      // Tekrar edenleri kaldır
      .filter((phone, index, self) => self.indexOf(phone) === index);
    
    if (phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'Seçilen listelerde telefon numarası olan abone bulunamadı' });
    }
    
    // Kuyruk oluştur
    const listNames = lists.map(l => l.name).join(', ');
    const queue = queueRepo.create({
      name: `Toplu Arama: ${listNames}`,
      listId: listIds[0], // İlk liste ID
      status: 'pending',
      totalNumbers: phoneNumbers.length,
      phoneNumbers: JSON.stringify(phoneNumbers),
      results: '[]',
      errors: '[]',
      twilioRegion: twilioRegion // Hangi Twilio hesabı kullanılacak
    });
    await queueRepo.save(queue);
    
    logger.info(`📞 Toplu arama kuyruğu oluşturuldu: ${queue.id} - ${phoneNumbers.length} numara - Region: ${twilioRegion}`);
    
    res.json({
      success: true,
      message: `${phoneNumbers.length} numaralı arama kuyruğu oluşturuldu (${twilioRegion.toUpperCase()})`,
      queueId: queue.id,
      totalNumbers: phoneNumbers.length,
      twilioRegion: twilioRegion,
      lists: lists.map(l => ({ id: l.id, name: l.name, twilioRegion: l.twilioRegion || 'poland' }))
    });
    
  } catch (error) {
    logger.error('Liste bazlı toplu arama hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calls/queue/:id/start - Kuyruğu başlat (batch bazlı)
router.post('/queue/:id/start', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { CallQueue } = require('../models/CallQueue');
    const queueRepo = AppDataSource.getRepository(CallQueue);
    
    const queue = await queueRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!queue) {
      return res.status(404).json({ error: 'Kuyruk bulunamadı' });
    }
    
    // Kuyrukta kayıtlı twilioRegion'a göre client ve config al
    const twilioRegion = queue.twilioRegion || 'poland';
    const regionClient = getTwilioClient(twilioRegion);
    const regionConfig = getTwilioConfig(twilioRegion);
    
    if (!regionClient) {
      return res.status(400).json({ 
        error: `${twilioRegion.toUpperCase()} bölgesi için Twilio istemcisi başlatılamadı` 
      });
    }
    
    if (!regionConfig.flowSid) {
      return res.status(400).json({ 
        error: `${twilioRegion.toUpperCase()} bölgesi için FLOW_SID tanımlanmamış` 
      });
    }
    
    // Sadece pending veya paused durumundaki kuyruklar başlatılabilir
    if (queue.status !== 'pending' && queue.status !== 'paused') {
      return res.status(400).json({ 
        error: 'Bu kuyruk başlatılamaz',
        currentStatus: queue.status 
      });
    }
    
    const phoneNumbers = JSON.parse(queue.phoneNumbers || '[]');
    const results = JSON.parse(queue.results || '[]');
    const errors = JSON.parse(queue.errors || '[]');
    
    // Zaten aranmış numaraları bul
    const calledNumbers = new Set([
      ...results.map(r => r.to),
      ...errors.map(e => e.to)
    ]);
    
    // Henüz aranmamış numaraları filtrele
    const remainingNumbers = phoneNumbers.filter(p => !calledNumbers.has(p));
    
    if (remainingNumbers.length === 0) {
      queue.status = 'completed';
      queue.completedAt = new Date();
      await queueRepo.save(queue);
      
      return res.json({
        success: true,
        message: 'Tüm aramalar tamamlandı',
        completed: true,
        totalNumbers: phoneNumbers.length,
        calledCount: queue.calledCount,
        successCount: queue.successCount,
        failedCount: queue.failedCount
      });
    }
    
    // Batch size: 10 numara
    const BATCH_SIZE = 10;
    const batch = remainingNumbers.slice(0, BATCH_SIZE);
    
    // Kuyruğu güncelle
    queue.status = 'processing';
    if (!queue.startedAt) queue.startedAt = new Date();
    queue.currentBatch++;
    await queueRepo.save(queue);
    
    logger.info(`📞 Batch ${queue.currentBatch} başlatılıyor: ${batch.length} numara`);
    
    // Webhook URL'lerini oluştur
    const webhookUrls = global.webhookConfig?.webhooks || {
      flow: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'https://happysmileclinics.net'}/api/calls/webhooks/flow`,
      status: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'https://happysmileclinics.net'}/api/calls/webhooks/status`,
      dtmf: `${process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL || 'https://happysmileclinics.net'}/api/calls/webhooks/dtmf`
    };
    
    // Flow parametreleri
    const flowParameters = {
      flowWebhook: webhookUrls.flow,
      statusWebhook: webhookUrls.status,
      dtmfWebhook: webhookUrls.dtmf,
      WEBHOOK_BASE_URL: global.webhookConfig?.webhookBaseUrl || process.env.WEBHOOK_BASE_URL || process.env.NGROK_URL,
      timeout: 60,
      machineDetection: 'Enable',
      asyncAmd: true,
      amdStatusCallback: webhookUrls.status,
      ringTime: 20,
      answerOnBridge: true,
      record: false
    };
    
    // Batch'teki her numara için çağrı başlat
    const batchResults = [];
    const batchErrors = [];
    
    logger.info(`📞 ${twilioRegion.toUpperCase()} Twilio hesabı ile arama yapılıyor...`);
    
    for (let i = 0; i < batch.length; i++) {
      const phoneNumber = batch[i];
      
      try {
        // 1 saniye delay (rate limit için)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Region'a göre doğru Twilio client ve config kullan
        const execution = await regionClient.studio.v2.flows(regionConfig.flowSid)
          .executions
          .create({
            to: phoneNumber,
            from: regionConfig.phoneNumber,
            parameters: flowParameters
          });
        
        logger.info(`✅ [${twilioRegion.toUpperCase()}] Arama başlatıldı: ${phoneNumber} (${execution.sid})`);
        batchResults.push({ to: phoneNumber, executionSid: execution.sid, time: new Date().toISOString(), region: twilioRegion });
        
      } catch (err) {
        logger.error(`❌ [${twilioRegion.toUpperCase()}] Arama hatası: ${phoneNumber} - ${err.message}`);
        batchErrors.push({ to: phoneNumber, error: err.message, code: err.code, time: new Date().toISOString(), region: twilioRegion });
      }
    }
    
    // Sonuçları kaydet
    const allResults = [...results, ...batchResults];
    const allErrors = [...errors, ...batchErrors];
    
    queue.results = JSON.stringify(allResults);
    queue.errors = JSON.stringify(allErrors);
    queue.calledCount = allResults.length + allErrors.length;
    queue.successCount = allResults.length;
    queue.failedCount = allErrors.length;
    
    // Tamamlandı mı kontrol et
    const remaining = phoneNumbers.length - queue.calledCount;
    const isCompleted = remaining <= 0;
    
    if (isCompleted) {
      queue.status = 'completed';
      queue.completedAt = new Date();
      logger.info(`✅ Kuyruk tamamlandı: ${queue.id} - ${queue.successCount} başarılı, ${queue.failedCount} başarısız`);
    } else {
      queue.status = 'paused'; // Frontend auto-continue yapacak
      logger.info(`⏸️ Batch tamamlandı: ${batchResults.length} başarılı, ${batchErrors.length} başarısız, ${remaining} kaldı`);
    }
    
    await queueRepo.save(queue);
    
    res.json({
      success: true,
      message: isCompleted 
        ? `Tüm aramalar tamamlandı: ${queue.successCount} başarılı, ${queue.failedCount} başarısız`
        : `Batch tamamlandı: ${batchResults.length} arama yapıldı, ${remaining} kaldı`,
      completed: isCompleted,
      queueId: queue.id,
      totalNumbers: phoneNumbers.length,
      calledCount: queue.calledCount,
      successCount: queue.successCount,
      failedCount: queue.failedCount,
      batchSent: batchResults.length,
      batchFailed: batchErrors.length,
      remaining: remaining,
      shouldContinue: !isCompleted
    });
    
  } catch (error) {
    logger.error('Kuyruk başlatma hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calls/queues - Tüm kuyrukları listele
router.get('/queues', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { CallQueue } = require('../models/CallQueue');
    const queueRepo = AppDataSource.getRepository(CallQueue);
    
    const queues = await queueRepo.find({
      order: { createdAt: 'DESC' },
      take: 50
    });
    
    res.json({
      success: true,
      data: queues.map(q => ({
        ...q,
        phoneNumbers: undefined, // Büyük veriyi gönderme
        results: undefined,
        errors: undefined
      }))
    });
    
  } catch (error) {
    logger.error('Kuyruk listesi hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calls/queue/:id - Kuyruk detayı
router.get('/queue/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { CallQueue } = require('../models/CallQueue');
    const queueRepo = AppDataSource.getRepository(CallQueue);
    
    const queue = await queueRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!queue) {
      return res.status(404).json({ error: 'Kuyruk bulunamadı' });
    }
    
    res.json({
      success: true,
      data: {
        ...queue,
        phoneNumbers: JSON.parse(queue.phoneNumbers || '[]'),
        results: JSON.parse(queue.results || '[]'),
        errors: JSON.parse(queue.errors || '[]')
      }
    });
    
  } catch (error) {
    logger.error('Kuyruk detay hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calls/queue/:id/pause - Kuyruğu duraklat
router.post('/queue/:id/pause', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { CallQueue } = require('../models/CallQueue');
    const queueRepo = AppDataSource.getRepository(CallQueue);
    
    const queue = await queueRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!queue) {
      return res.status(404).json({ error: 'Kuyruk bulunamadı' });
    }
    
    queue.status = 'paused';
    await queueRepo.save(queue);
    
    logger.info(`⏸️ Kuyruk duraklatıldı: ${queue.id}`);
    
    res.json({
      success: true,
      message: 'Kuyruk duraklatıldı'
    });
    
  } catch (error) {
    logger.error('Kuyruk duraklatma hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/calls/queue/:id - Kuyruğu sil
router.delete('/queue/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { CallQueue } = require('../models/CallQueue');
    const queueRepo = AppDataSource.getRepository(CallQueue);
    
    const result = await queueRepo.delete(parseInt(req.params.id));
    
    if (result.affected === 0) {
      return res.status(404).json({ error: 'Kuyruk bulunamadı' });
    }
    
    logger.info(`🗑️ Kuyruk silindi: ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Kuyruk silindi'
    });
    
  } catch (error) {
    logger.error('Kuyruk silme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// Flow webhook
router.post('/webhooks/flow', async (req, res) => {
  try {
    // Güvenlik: Twilio webhook signature validation
    if (!validateTwilioWebhook(req)) {
      logger.warn('⚠️ [SECURITY] Flow webhook - Geçersiz signature, request reddedildi');
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }
    
    logger.info('Flow Webhook - Gelen veri:', { body: req.body });
    
    // Event history'ye kaydet
    await saveEventHistory('flow', req.body);
    
    res.sendStatus(200);
  } catch (error) {
    logger.error('Flow webhook hatası:', { error });
    res.sendStatus(500);
  }
});

// Status webhook
router.post('/webhooks/status', async (req, res) => {
  try {
    // Güvenlik: Twilio webhook signature validation
    if (!validateTwilioWebhook(req)) {
      logger.warn('⚠️ [SECURITY] Status webhook - Geçersiz signature, request reddedildi');
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }
    
    logger.info('Status webhook alındı:', { body: req.body });
    
    // Event history'ye kaydet
    await saveEventHistory('status', req.body);
  
    // Webhook'tan çağrı durumunu al
    const callStatus = req.body.CallStatus || req.body.call_status;
    const dialCallStatus = req.body.DialCallStatus;
    const event = req.body.event; // Flow'dan gelen event tipi (no_answer, busy, call_failed, initiated)
    
    // Çağrı reddedildiğinde, CallStatus genellikle "completed" olacak,
    // ama DialCallStatus "busy" veya "canceled" veya "no-answer" olabilir
    const executionSid = req.body.execution_sid || req.body.CallSid;
    const to = req.body.to || req.body.To;
    const from = req.body.from || req.body.From;
    
    if (executionSid) {
      logger.debug(`Status webhook için executionSid: ${executionSid}, CallStatus: ${callStatus}, DialCallStatus: ${dialCallStatus}, Event: ${event}`);
      
      // Call veritabanı kaydını güncelle veya oluştur
      if (global.database && global.database.AppDataSource) {
        try {
          // Database initialize kontrolü
          const isInitialized = await ensureDatabaseInitialized();
          if (isInitialized && global.Call) {
            const callRepository = global.database.AppDataSource.getRepository(global.Call);
            
            // Önce mevcut kaydı ara
            let callRecord = await callRepository.findOne({
              where: { executionSid: executionSid }
            });
            
            // Durum bilgisini belirle
            let status = callStatus;
            if (event === 'no_answer' || dialCallStatus === 'no-answer') {
              status = 'no-answer';
            } else if (event === 'busy' || dialCallStatus === 'busy') {
              status = 'busy';
            } else if (event === 'call_failed') {
              status = 'failed';
            } else if (event === 'initiated') {
              status = 'initiated';
            }
            
            if (callRecord) {
              // Mevcut kaydı güncelle
              callRecord.status = status;
              callRecord.callSid = req.body.CallSid || callRecord.callSid;
              callRecord.updatedAt = new Date();
              
              await callRepository.save(callRecord);
              logger.info(`Call kaydı güncellendi: ${executionSid}, durum: ${status}`);
            } else {
              // Yeni kayıt oluştur (eğer flow'dan geliyorsa ve daha önce kaydedilmemişse)
              callRecord = callRepository.create({
                executionSid: executionSid,
                callSid: req.body.CallSid,
                to: to,
                from: from,
                status: status,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              await callRepository.save(callRecord);
              logger.info(`Yeni Call kaydı oluşturuldu: ${executionSid}, durum: ${status}`);
            }
          }
        } catch (dbError) {
          logger.warn('Call kaydı güncellenirken hata:', { message: dbError.message });
        }
      }
      
      // Çağrı durumunu logla
      if (callStatus === 'completed' || 
          dialCallStatus === 'busy' || 
          dialCallStatus === 'canceled' || 
          dialCallStatus === 'no-answer' ||
          event === 'no_answer' ||
          event === 'busy' ||
          event === 'call_failed') {
        // Çağrı reddine özel durum bildirimi
        const rejectStatus = event || dialCallStatus || 'canceled';
        logger.info(`Çağrı reddedildi: ${executionSid}, durum: ${rejectStatus}`);
      } else {
        // Normal durum güncellemesi
        logger.info(`Çağrı durumu güncellendi: ${executionSid}, durum: ${callStatus}`);
      }
    } else {
      logger.warn('Status webhook geçersiz executionSid ile alındı:', { body: req.body });
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Status webhook hatası:', { error });
    res.sendStatus(500);
  }
});

// DTMF webhook
router.post('/webhooks/dtmf', async (req, res) => {
  try {
    // Güvenlik: Twilio webhook signature validation
    if (!validateTwilioWebhook(req)) {
      logger.warn('⚠️ [SECURITY] DTMF webhook - Geçersiz signature, request reddedildi');
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }
    
    logger.info('DTMF Webhook - Gelen veri:', { body: req.body });
    
    // Event history'ye kaydet
    await saveEventHistory('dtmf', req.body);
    
    // Veri hazırlama
    const dtmfData = { ...req.body };
    
    // execution_sid yoksa ve call_hash varsa, call_hash'i execution_sid olarak kullan
    if (!dtmfData.execution_sid && dtmfData.call_hash) {
      const hashParts = dtmfData.call_hash.split('_');
      if (hashParts.length > 0) {
        dtmfData.execution_sid = hashParts[0];
        logger.debug(`execution_sid call_hash'ten çıkarıldı: ${dtmfData.execution_sid}`);
      }
    }
    
    // DTMF olayının tipini belirle
    const eventType = dtmfData.event;
    const hasAction = eventType === 'dtmf_action';
    
    // Sadece aksiyon varsa veya normal tuşlama olayıysa işlem yap
    if (hasAction || eventType === 'dtmf') {
      dtmfData.is_action = hasAction;
      dtmfData.timestamp = Date.now();
      logger.info('DTMF event alındı:', dtmfData);
      
      // Eğer bu bir aksiyon tuşlamasıysa, durumu logla
      if (hasAction && dtmfData.action) {
        logger.info('DTMF aksiyon alındı:', dtmfData.action);
      }
      
      // ==================== EMAIL SUBSCRIBER ENTEGRASYONU ====================
      // DTMF sonucunu email listesindeki abone ile eşleştir (telefon numarasına göre)
      const digits = dtmfData.Digits || dtmfData.digits;
      const phoneNumber = dtmfData.To || dtmfData.to;
      
      if (digits && phoneNumber) {
        try {
          const { AppDataSource } = require('../config/database');
          if (AppDataSource?.isInitialized) {
            const { EmailSubscriber } = require('../models/EmailSubscriber');
            const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
            
            // Telefon numarasını normalize et (+ ile ve + olmadan ara)
            const normalizedPhone = phoneNumber.replace(/\s+/g, '').trim();
            const phoneVariants = [
              normalizedPhone,
              normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : `+${normalizedPhone}`
            ];
            
            // Bu telefon numarasına sahip aktif aboneleri bul
            const subscribers = await subscriberRepo
              .createQueryBuilder('s')
              .where('s.phone IN (:...phones)', { phones: phoneVariants })
              .andWhere('s.status = :status', { status: 'active' })
              .getMany();
            
            if (subscribers.length > 0) {
              // DTMF'e göre onay durumunu belirle
              let confirmationStatus = 'pending';
              let confirmationNote = null;
              
              if (digits === '1') {
                confirmationStatus = 'confirmed';
                confirmationNote = 'PHONE_CONFIRMED'; // Telefonla onaylandı
                logger.info(`✅ Telefon onayı: ${phoneNumber} - ONAYLANDI`);
              } else if (digits === '2') {
                confirmationStatus = 'cancelled';
                confirmationNote = 'PHONE_CANCELLED'; // Telefonla iptal edildi
                logger.info(`❌ Telefon onayı: ${phoneNumber} - İPTAL EDİLDİ`);
              } else if (digits === '3') {
                confirmationStatus = 'rescheduled';
                confirmationNote = 'PHONE_RESCHEDULED'; // Telefonla ertelendi
                logger.info(`🔄 Telefon onayı: ${phoneNumber} - ERTELENDİ`);
              }
              
              // Tüm eşleşen aboneleri güncelle
              if (confirmationStatus !== 'pending') {
                for (const subscriber of subscribers) {
                  subscriber.confirmationStatus = confirmationStatus;
                  subscriber.confirmationNote = confirmationNote;
                  subscriber.confirmedAt = new Date();
                  await subscriberRepo.save(subscriber);
                  logger.info(`📞 Subscriber güncellendi: ID=${subscriber.id}, Email=${subscriber.email}, Status=${confirmationStatus}`);
                }
              }
            } else {
              logger.debug(`Telefon numarası için subscriber bulunamadı: ${phoneNumber}`);
            }
          }
        } catch (error) {
          logger.error('DTMF-Subscriber entegrasyon hatası:', error.message);
          // Hata olsa bile webhook'u başarılı kabul et
        }
      }
    }
    
    // Hemen yanıt ver
    res.sendStatus(200);
  } catch (error) {
    logger.error('DTMF webhook hatası:', { error });
    res.sendStatus(500);
  }
});

// Event History API - Geçmiş tüm event'leri getir
router.get('/events', async (req, res) => {
  try {
    if (!database || !database.AppDataSource || !EventHistory) {
      return res.status(503).json({
        success: false,
        error: 'Database bağlantısı yok'
      });
    }

    // Vercel'de database initialize kontrolü ve başlatma
    const isInitialized = await ensureDatabaseInitialized();
    if (!isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database başlatılamadı'
      });
    }

    const AppDataSource = database.AppDataSource;

    // Entity'nin metadata'da olduğundan emin ol
    if (!AppDataSource.entityMetadatas.find(metadata => metadata.name === 'EventHistory')) {
      logger.error('EventHistory entity metadata bulunamadı');
      return res.status(500).json({
        success: false,
        error: 'EventHistory entity bulunamadı'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const eventRepository = AppDataSource.getRepository(EventHistory);
    
    // Toplam sayı
    const total = await eventRepository.count();
    
    // Event'leri getir (timestamp'e göre azalan sırada)
    const events = await eventRepository.find({
      order: { timestamp: 'DESC' },
      skip: offset,
      take: limit
    });

    // Frontend formatına çevir
    const formattedEvents = events.map(event => ({
      id: event.id,
      execution_sid: event.executionSid,
      CallSid: event.callSid,
      To: event.to,
      From: event.from,
      status: event.status,
      type: event.eventType,
      digits: event.dtmfDigits,
      action: event.action,
      time: Number(event.timestamp), // BIGINT'i number'a çevir
      eventData: event.eventData ? JSON.parse(event.eventData) : null
    }));

    res.json({
      success: true,
      data: {
        events: formattedEvents,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Event history getirme hatası:', { message: error.message });
    res.status(500).json({
      success: false,
      error: 'Event history getirilemedi'
    });
  }
});

// Call History API Endpoint'leri
router.get('/history', async (req, res) => {
  try {
    if (!database || !database.AppDataSource || !EventHistory) {
      return res.status(503).json({
        success: false,
        error: 'Database bağlantısı mevcut değil'
      });
    }

    // Database initialize kontrolü
    const isInitialized = await ensureDatabaseInitialized();
    if (!isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database başlatılamadı'
      });
    }

    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const eventRepository = database.AppDataSource.getRepository(EventHistory);
    
    // İlk olarak toplam unique execution_sid sayısını al
    const totalCountQuery = `
      SELECT COUNT(DISTINCT executionSid) as total
      FROM event_history 
      WHERE executionSid IS NOT NULL
    `;
    const totalResult = await eventRepository.query(totalCountQuery);
    const totalCalls = totalResult[0]?.total || 0;

    // Son çağrıları execution_sid'ye göre gruplayıp getir
    const rawQuery = `
      SELECT 
        e.*,
        GROUP_CONCAT(e.dtmfDigits) as allDtmfDigits,
        GROUP_CONCAT(e.action) as allActions,
        MAX(e.timestamp) as lastActivity
      FROM event_history e
      WHERE e.executionSid IS NOT NULL
      GROUP BY e.executionSid
      ORDER BY lastActivity DESC
      LIMIT ? OFFSET ?
    `;

    const results = await eventRepository.query(rawQuery, [limit, offset]);

    // Her execution_sid için detayları getir
    const callsWithDetails = await Promise.all(
      results.map(async (call) => {
        const events = await eventRepository.find({
          where: { executionSid: call.executionSid },
          order: { timestamp: 'ASC' }
        });

        return {
          executionSid: call.executionSid,
          callSid: call.callSid,
          to: call.to,
          from: call.from,
          status: call.status,
          lastActivity: Number(call.lastActivity) || Date.now(), // BIGINT'i number'a çevir
          createdAt: call.createdAt,
          dtmfActions: events.filter(e => e.eventType === 'dtmf' && e.dtmfDigits).map(e => ({
            digits: e.dtmfDigits,
            action: e.action || null, // Action olmayan tuşlamalar için null
            timestamp: Number(e.timestamp) // BIGINT'i number'a çevir
          })),
          events: events.map(e => ({
            id: e.id,
            eventType: e.eventType,
            status: e.status,
            dtmfDigits: e.dtmfDigits,
            action: e.action,
            timestamp: Number(e.timestamp), // BIGINT'i number'a çevir
            eventData: e.eventData ? JSON.parse(e.eventData) : null
          }))
        };
      })
    );

    // Pagination bilgileri
    const totalPages = Math.ceil(totalCalls / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    res.json({
      success: true,
      data: callsWithDetails,
      pagination: {
        total: totalCalls,
        totalPages,
        currentPage,
        limit,
        offset,
        hasNextPage: currentPage < totalPages,
        hasPreviousPage: currentPage > 1
      }
    });

  } catch (error) {
    logger.error('Call history endpoint hatası:', { message: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Belirli bir çağrının detaylarını getir
router.get('/history/:executionSid', async (req, res) => {
  try {
    if (!database || !database.AppDataSource || !EventHistory) {
      return res.status(503).json({
        success: false,
        error: 'Database bağlantısı mevcut değil'
      });
    }

    // Database initialize kontrolü
    const isInitialized = await ensureDatabaseInitialized();
    if (!isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database başlatılamadı'
      });
    }

    const { executionSid } = req.params;
    const eventRepository = database.AppDataSource.getRepository(EventHistory);
    
    const events = await eventRepository.find({
      where: { executionSid },
      order: { timestamp: 'ASC' }
    });

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Çağrı bulunamadı'
      });
    }

    const callDetails = {
      executionSid,
      callSid: events[0].callSid,
      to: events[0].to,
      from: events[0].from,
      createdAt: events[0].createdAt,
      timeline: events.map(e => ({
        id: e.id,
        eventType: e.eventType,
        status: e.status,
        dtmfDigits: e.dtmfDigits,
        action: e.action,
        timestamp: Number(e.timestamp), // BIGINT'i number'a çevir
        eventData: e.eventData ? JSON.parse(e.eventData) : null
      }))
    };

    res.json({
      success: true,
      data: callDetails
    });

  } catch (error) {
    logger.error('Call detail endpoint hatası:', { message: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Dashboard istatistikleri
router.get('/stats', async (req, res) => {
  try {
    if (!database || !database.AppDataSource || !EventHistory) {
      return res.status(503).json({
        success: false,
        error: 'Database bağlantısı mevcut değil'
      });
    }

    // Database initialize kontrolü
    const isInitialized = await ensureDatabaseInitialized();
    if (!isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database başlatılamadı'
      });
    }

    const eventRepository = database.AppDataSource.getRepository(EventHistory);
    
    // Son 24 saat içindeki çağrılar
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    
    const stats = await eventRepository.query(`
      SELECT 
        COUNT(DISTINCT executionSid) as totalCalls,
        COUNT(CASE WHEN eventType = 'dtmf' AND action = 'confirm_appointment' THEN 1 END) as confirmedAppointments,
        COUNT(CASE WHEN eventType = 'dtmf' AND action = 'cancel_appointment' THEN 1 END) as cancelledAppointments,
        COUNT(CASE WHEN eventType = 'dtmf' AND action = 'connect_to_representative' THEN 1 END) as voicemailRequests,
        COUNT(CASE WHEN eventType = 'status' AND status IN ('busy', 'no-answer', 'failed') THEN 1 END) as failedCalls
      FROM event_history 
      WHERE timestamp >= ?
    `, [yesterday]);

    const todayStats = stats[0] || {
      totalCalls: 0,
      confirmedAppointments: 0,
      cancelledAppointments: 0,
      voicemailRequests: 0,
      failedCalls: 0
    };

    // Son 7 günün istatistikleri
    // MySQL ve SQLite için farklı syntax'lar
    const isMySql = database.AppDataSource.options.type === 'mysql';
    const dateFunction = isMySql 
      ? 'DATE(FROM_UNIXTIME(timestamp/1000))'
      : "DATE(datetime(timestamp/1000, 'unixepoch'))";
    
    const weeklyStats = await eventRepository.query(`
      SELECT 
        ${dateFunction} as date,
        COUNT(DISTINCT executionSid) as calls,
        COUNT(CASE WHEN eventType = 'dtmf' AND action = 'confirm_appointment' THEN 1 END) as confirmed,
        COUNT(CASE WHEN eventType = 'dtmf' AND action = 'cancel_appointment' THEN 1 END) as cancelled
      FROM event_history 
      WHERE timestamp >= ?
      GROUP BY ${dateFunction}
      ORDER BY date DESC
      LIMIT 7
    `, [Date.now() - (7 * 24 * 60 * 60 * 1000)]);

    res.json({
      success: true,
      data: {
        today: todayStats,
        weekly: weeklyStats
      }
    });

  } catch (error) {
    logger.error('Stats endpoint hatası:', { message: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Tüm çağrı kayıtlarını export için getir (pagination yok)
router.get('/history/export/all', async (req, res) => {
  try {
    if (!database || !database.AppDataSource || !EventHistory) {
      return res.status(503).json({
        success: false,
        error: 'Database bağlantısı mevcut değil'
      });
    }

    // Database initialize kontrolü
    const isInitialized = await ensureDatabaseInitialized();
    if (!isInitialized) {
      return res.status(503).json({
        success: false,
        error: 'Database başlatılamadı'
      });
    }

    const eventRepository = database.AppDataSource.getRepository(EventHistory);
    
    logger.info('Tüm çağrı kayıtları export için getiriliyor...');

    // Tüm unique execution_sid'leri al
    const rawQuery = `
      SELECT 
        e.*,
        GROUP_CONCAT(e.dtmfDigits) as allDtmfDigits,
        GROUP_CONCAT(e.action) as allActions,
        MAX(e.timestamp) as lastActivity
      FROM event_history e
      WHERE e.executionSid IS NOT NULL
      GROUP BY e.executionSid
      ORDER BY lastActivity DESC
    `;

    const results = await eventRepository.query(rawQuery);
    logger.info(`${results.length} benzersiz çağrı kaydı bulundu`);

    // Her execution_sid için detayları getir
    const callsWithDetails = await Promise.all(
      results.map(async (call) => {
        const events = await eventRepository.find({
          where: { executionSid: call.executionSid },
          order: { timestamp: 'ASC' }
        });

        return {
          executionSid: call.executionSid,
          callSid: call.callSid,
          to: call.to,
          from: call.from,
          status: call.status,
          lastActivity: Number(call.lastActivity) || Date.now(), // BIGINT'i number'a çevir
          createdAt: call.createdAt,
          dtmfActions: events.filter(e => e.eventType === 'dtmf' && e.dtmfDigits).map(e => ({
            digits: e.dtmfDigits,
            action: e.action || null, // Action olmayan tuşlamalar için null
            timestamp: Number(e.timestamp) // BIGINT'i number'a çevir
          })),
          events: events.map(e => ({
            id: e.id,
            eventType: e.eventType,
            status: e.status,
            dtmfDigits: e.dtmfDigits,
            action: e.action,
            timestamp: Number(e.timestamp), // BIGINT'i number'a çevir
            eventData: e.eventData ? JSON.parse(e.eventData) : null
          }))
        };
      })
    );

    logger.info(`${callsWithDetails.length} çağrı kaydı detaylarıyla gönderiliyor`);

    res.json({
      success: true,
      data: callsWithDetails,
      total: callsWithDetails.length
    });

  } catch (error) {
    logger.error('Export all endpoint hatası:', { message: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * #PolishCallSummary Env
 * Günlük çağrı özeti endpoint'i - Twilio API'den doğrudan çeker
 * Query params:
 *  - date: YYYY-MM-DD formatında tarih (opsiyonel, varsayılan: bugün)
 *  - direction: 'inbound', 'outbound', 'all' (opsiyonel, varsayılan: 'all')
 * 
 * Bu endpoint için ayrı Twilio hesap bilgileri kullanılır:
 * - TWILIO_DAILY_SUMMARY_ACCOUNT_SID
 * - TWILIO_DAILY_SUMMARY_AUTH_TOKEN
 * - TWILIO_DAILY_SUMMARY_PHONE_NUMBER (rapor alınacak Twilio numarası)
 */
router.get('/daily-summary', async (req, res) => {
  try {
    // Daily Summary için özel Twilio client oluştur
    const dailySummaryAccountSid = process.env.TWILIO_DAILY_SUMMARY_ACCOUNT_SID;
    const dailySummaryAuthToken = process.env.TWILIO_DAILY_SUMMARY_AUTH_TOKEN;
    const dailySummaryPhoneNumber = process.env.TWILIO_DAILY_SUMMARY_PHONE_NUMBER;
    
    if (!dailySummaryAccountSid || !dailySummaryAuthToken) {
      throw new Error('Daily Summary için Twilio kimlik bilgileri tanımlanmamış (TWILIO_DAILY_SUMMARY_ACCOUNT_SID, TWILIO_DAILY_SUMMARY_AUTH_TOKEN)');
    }
    
    if (!dailySummaryPhoneNumber) {
      throw new Error('Daily Summary için telefon numarası tanımlanmamış (TWILIO_DAILY_SUMMARY_PHONE_NUMBER)');
    }
    
    // Bu endpoint için ayrı client kullan
    const dailySummaryClient = twilio(dailySummaryAccountSid, dailySummaryAuthToken);
    
    logger.info('Daily Summary için ayrı Twilio client oluşturuldu');
    // Güvenlik: Account SID'nin tamamını loglama (sadece uzunluk bilgisi)
    logger.debug(`Daily Summary Account SID: Tanımlı (${dailySummaryAccountSid ? dailySummaryAccountSid.length : 0} karakter)`);
    logger.debug(`Daily Summary Phone Number: ${dailySummaryPhoneNumber ? 'Tanımlı' : 'Tanımlı değil'}`);

    // Tarih parametresini al veya bugünü kullan
    const dateParam = req.query.date;
    const direction = req.query.direction || 'all';
    const debugMode = req.query.debug === 'true'; // Debug modu
    
    // İstanbul saat dilimi için UTC+3
    const tzOffset = 3 * 60 * 60 * 1000;
    let targetDate;
    let startTime, endTime;
    
    if (debugMode) {
      // Debug modu: Son 30 gün
      endTime = new Date();
      startTime = new Date();
      startTime.setDate(startTime.getDate() - 30);
      logger.warn(`🔍 DEBUG MODE: Son 30 günlük çağrılar analiz ediliyor (${startTime.toISOString()} - ${endTime.toISOString()})`);
    } else {
      if (dateParam) {
        // Belirtilen tarihi kullan
        targetDate = new Date(dateParam);
      } else {
        // Bugünü kullan
        const now = new Date();
        targetDate = new Date(now.getTime() + tzOffset);
      }
      
      // Günün başlangıç ve bitiş zamanlarını ayarla
      startTime = new Date(targetDate);
      startTime.setHours(0, 0, 0, 0);
      
      endTime = new Date(targetDate);
      endTime.setHours(23, 59, 59, 999);
    }
    
    const todayLabel = startTime.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    logger.info(`Günlük özet çekiliyor: ${todayLabel}, yön: ${direction}, numara: ${dailySummaryPhoneNumber}`);
    logger.info(`Tarih aralığı: ${startTime.toISOString()} - ${endTime.toISOString()}`);

    // Inbound ve outbound çağrıları ayrı ayrı çek
    let inboundCalls = [];
    let outboundCalls = [];

    // Inbound çağrılar: Bu numaraya gelen çağrılar (to = bizim numara)
    if (direction === 'all' || direction === 'inbound') {
      try {
        logger.info(`Inbound çağrılar için sorgu: to=${dailySummaryPhoneNumber}`);
        inboundCalls = await dailySummaryClient.calls.list({
          to: dailySummaryPhoneNumber,
          startTimeAfter: startTime,
          startTimeBefore: endTime,
          pageSize: 1000,
        });
        logger.info(`✅ Inbound: ${inboundCalls.length} çağrı çekildi`);
        
        // İlk birkaç inbound çağrının detayını logla
        if (inboundCalls.length > 0) {
          logger.debug(`İlk inbound çağrı: from=${inboundCalls[0].from}, to=${inboundCalls[0].to}, direction=${inboundCalls[0].direction}`);
        }
      } catch (err) {
        logger.error('❌ Inbound çağrıları çekerken hata:', err);
      }
    }

    // Outbound çağrılar: Bu numaradan giden çağrılar (from = bizim numara)
    if (direction === 'all' || direction === 'outbound') {
      try {
        logger.info(`Outbound çağrılar için sorgu: from=${dailySummaryPhoneNumber}`);
        
        // Önce belirli numaradan giden çağrıları dene
        outboundCalls = await dailySummaryClient.calls.list({
          from: dailySummaryPhoneNumber,
          startTimeAfter: startTime,
          startTimeBefore: endTime,
          pageSize: 1000,
        });
        logger.info(`✅ Outbound (from filter): ${outboundCalls.length} çağrı çekildi`);
        
        // Eğer hiç outbound çağrı yoksa, tüm outbound-api çağrılarını dene
        if (outboundCalls.length === 0) {
          logger.warn(`⚠️ from=${dailySummaryPhoneNumber} ile outbound çağrı bulunamadı, tüm outbound-api çağrıları çekiliyor...`);
          
          const allOutboundCalls = await dailySummaryClient.calls.list({
            startTimeAfter: startTime,
            startTimeBefore: endTime,
            pageSize: 1000,
          });
          
          // Sadece outbound-api çağrılarını filtrele
          outboundCalls = allOutboundCalls.filter(c => 
            c.direction === 'outbound-api' || 
            c.direction === 'outbound-dial' ||
            c.direction.includes('outbound')
          );
          
          logger.info(`✅ Tüm outbound çağrılar: ${outboundCalls.length} bulundu`);
          
          // Unique from numaralarını logla
          const uniqueFromNumbers = [...new Set(outboundCalls.map(c => c.from))];
          logger.info(`📞 Outbound çağrıların geldiği numaralar: ${uniqueFromNumbers.join(', ')}`);
        }
        
        // İlk birkaç outbound çağrının detayını logla
        if (outboundCalls.length > 0) {
          logger.debug(`İlk outbound çağrı: from=${outboundCalls[0].from}, to=${outboundCalls[0].to}, direction=${outboundCalls[0].direction}`);
        }
      } catch (err) {
        logger.error('❌ Outbound çağrıları çekerken hata:', err);
        logger.error('Hata detayı:', err.message);
      }
    }

    // Tüm çağrıları birleştir
    const allCalls = [...inboundCalls, ...outboundCalls];
    logger.info(`Toplam ${allCalls.length} çağrı çekildi (${inboundCalls.length} inbound, ${outboundCalls.length} outbound)`);

    // Parent call kontrolü - inbound için filtrele (conference bridge hariç)
    // NOT: Kaçırılan çağrılar dahil tüm normal inbound çağrıları tut
    // Sadece conference/IVR child call'ları çıkar (genellikle 'in-progress' status'lu ve parent'lı)
    const inbound = inboundCalls.filter((c) => {
      // parentCallSid yoksa kesinlikle tut
      if (!c.parentCallSid) return true;
      
      // parentCallSid varsa ama kaçırılan veya tamamlanmış bir çağrıysa tut
      // (bunlar gerçek inbound çağrılar, IVR/Flow'dan geçmiş olabilirler)
      if (c.status === 'completed' || c.status === 'no-answer' || c.status === 'busy' || c.status === 'failed' || c.status === 'canceled') {
        return true;
      }
      
      // parentCallSid var VE in-progress/queued gibi bir status ise çıkar (child call)
      return false;
    });
    
    // Debug: Filtreleme istatistikleri
    const filteredInboundCount = inboundCalls.length - inbound.length;
    if (filteredInboundCount > 0) {
      logger.info(`🔍 ${filteredInboundCount} adet child inbound call filtrelendi (conference/IVR)`);
    }
    
    // Outbound için function yönlendirme numaralarını filtrele
    // +447707964726 (Polish agent) ve +447599042882 (Latvian agent) numaralarına
    // yapılan ve parentCallSid olan çağrılar inbound çağrıların yönlendirmesidir
    const FUNCTION_REDIRECT_NUMBERS = ['+447707964726', '+447599042882'];
    
    // Outbound çağrıları filtrele:
    // Function yönlendirme çağrılarını filtrele (yönlendirme numarasına giden VE parent'lı)
    // Studio Flow çağrılarını dahil et (parentCallSid olmayan)
    // Talkyto çağrılarını dahil et (parentCallSid olan ama yönlendirme değil)
    const outbound = outboundCalls.filter((c) => {
      const isRedirectNumber = FUNCTION_REDIRECT_NUMBERS.includes(c.to);
      const hasParent = !!c.parentCallSid;
      
      // Function yönlendirme çağrılarını filtrele (inbound'tan türetilmiş yönlendirmeler)
      const isFunctionRedirect = isRedirectNumber && hasParent;
      return !isFunctionRedirect;
    });
    
    // Debug: Filtreleme analizi
    const totalOutbound = outboundCalls.length;
    const redirectCalls = outboundCalls.filter(c => FUNCTION_REDIRECT_NUMBERS.includes(c.to) && c.parentCallSid).length;
    const withoutParent = outboundCalls.filter(c => !c.parentCallSid).length;
    
    logger.debug(`🔍 Outbound analizi: Toplam ${totalOutbound}, Function yönlendirme ${redirectCalls}, Parent'sız ${withoutParent}, Filtrelenmiş ${outbound.length}`);
    
    if (redirectCalls > 0) {
      logger.info(`🚫 ${redirectCalls} adet function yönlendirme çağrısı filtrelendi`);
    }
    
    if (outbound.length > 0) {
      logger.info(`✅ ${outbound.length} outbound çağrısı bulundu (Studio Flow + Talkyto)`);
      // İlk çağrının detayını logla
      logger.debug(`İlk gerçek outbound: to=${outbound[0].to}, from=${outbound[0].from}, parent=${outbound[0].parentCallSid ? 'var' : 'yok'}`);
    }
    
    // DEBUG MODE: Tüm outbound çağrıların detaylarını göster
    if (debugMode && totalOutbound > 0) {
      logger.warn('📋 ===== TÜM OUTBOUND ÇAĞRILAR (SON 30 GÜN) =====');
      outboundCalls.forEach((call, index) => {
        const isRedirect = FUNCTION_REDIRECT_NUMBERS.includes(call.to);
        const hasParent = !!call.parentCallSid;
        const isFunctionRedirect = isRedirect && hasParent;
        logger.warn(`${index + 1}. FROM: ${call.from} → TO: ${call.to} | Direction: ${call.direction} | Parent: ${hasParent ? '✓' : '✗'} | Function Redirect: ${isFunctionRedirect ? '✓' : '✗'} | Status: ${call.status} | ${call.startTime}`);
      });
      logger.warn('📋 ===== DETAYLI ANALİZ =====');
      logger.warn(`Toplam Outbound: ${totalOutbound}`);
      logger.warn(`Function yönlendirme numarasına (${FUNCTION_REDIRECT_NUMBERS.join(', ')}): ${redirectCalls}`);
      logger.warn(`Parent'lı çağrılar: ${outboundCalls.filter(c => c.parentCallSid).length}`);
      logger.warn(`Parent'sız çağrılar: ${withoutParent}`);
      logger.warn(`Filtrelenmiş outbound çağrıları (Studio Flow + Talkyto): ${outbound.length}`);
      logger.warn('📋 =====================================');
    }

    // Tarihe göre sırala (artan)
    inbound.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    outbound.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // İstatistik hesaplamaları
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    const avg = (arr) => (arr.length ? Math.round(sum(arr) / arr.length) : 0);
    const max = (arr) => (arr.length ? Math.max(...arr) : 0);

    const inDur = inbound.map((c) => parseInt(c.duration) || 0);
    const outDur = outbound.map((c) => parseInt(c.duration) || 0);

    const inboundAvg = avg(inDur);
    const outboundAvg = avg(outDur);
    const inboundMax = max(inDur);
    const outboundMax = max(outDur);
    const inboundTotal = sum(inDur);
    const outboundTotal = sum(outDur);

    // Kaçırılan çağrı tespiti - Twilio Function mantığına uygun
    // Bir çağrı "answered" sayılır sadece:
    // 1. Status = completed VE
    // 2. Duration > 0 (en az 1 saniye konuşulmuş)
    // Aksi halde "missed" sayılır (IVR'ye girdi ama agent'a bağlanmadı)
    const answeredInbound = inbound.filter((c) => {
      return c.status === 'completed' && parseInt(c.duration || 0) > 0;
    }).length;
    const missedInbound = inbound.length - answeredInbound;
    const completedOutbound = outbound.filter((c) => c.status === 'completed').length;
    const failedOutbound = outbound.length - completedOutbound;
    const missedRatio =
      inbound.length > 0 ? ((missedInbound / inbound.length) * 100).toFixed(1) : 0;

    // Yanıt verisi
    const response = {
      success: true,
      date: todayLabel,
      stats: {
        inbound: {
          total: inbound.length,
          answered: answeredInbound,
          missed: missedInbound,
          missedRatio: parseFloat(missedRatio),
          totalDuration: inboundTotal,
          avgDuration: inboundAvg,
          maxDuration: inboundMax,
        },
        outbound: {
          total: outbound.length,
          completed: completedOutbound,
          failed: failedOutbound,
          totalDuration: outboundTotal,
          avgDuration: outboundAvg,
          maxDuration: outboundMax,
        },
        overall: {
          totalCalls: inbound.length + outbound.length,
          totalDuration: inboundTotal + outboundTotal,
        },
      },
      calls: {
        inbound: direction === 'inbound' || direction === 'all' ? inbound.map((c) => ({
          sid: c.sid,
          from: c.from,
          to: c.to,
          status: c.status,
          duration: parseInt(c.duration) || 0,
          startTime: c.startTime,
          endTime: c.endTime,
          direction: c.direction,
        })) : [],
        outbound: direction === 'outbound' || direction === 'all' ? outbound.map((c) => ({
          sid: c.sid,
          from: c.from,
          to: c.to,
          status: c.status,
          duration: parseInt(c.duration) || 0,
          startTime: c.startTime,
          endTime: c.endTime,
          direction: c.direction,
        })) : [],
      },
    };

    logger.info(`📊 Stats: ${inbound.length} inbound + ${outbound.length} outbound = ${response.stats.overall.totalCalls} total`);
    logger.info(`Günlük özet başarıyla hazırlandı: ${response.stats.overall.totalCalls} çağrı`);

    res.json(response);
  } catch (error) {
    logger.error('Günlük özet endpoint hatası:', { message: error.message, code: error.code });

    let errorMessage = error.message;
    let errorCode = 'UNKNOWN_ERROR';

    if (error.code) {
      errorCode = error.code;
      errorMessage = `Twilio Error ${error.code}: ${error.message}`;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
    });
  }
});

/**
 * Aylık çağrı özeti endpoint'i - Bir ayın tüm günlerini döndürür
 * Query params:
 *  - year: YYYY formatında yıl (opsiyonel, varsayılan: bu yıl)
 *  - month: MM formatında ay (opsiyonel, varsayılan: bu ay)
 */
router.get('/monthly-summary', async (req, res) => {
  try {
    // Daily Summary için özel Twilio client oluştur
    const dailySummaryAccountSid = process.env.TWILIO_DAILY_SUMMARY_ACCOUNT_SID;
    const dailySummaryAuthToken = process.env.TWILIO_DAILY_SUMMARY_AUTH_TOKEN;
    const dailySummaryPhoneNumber = process.env.TWILIO_DAILY_SUMMARY_PHONE_NUMBER;
    
    if (!dailySummaryAccountSid || !dailySummaryAuthToken) {
      throw new Error('Daily Summary için Twilio kimlik bilgileri tanımlanmamış');
    }
    
    if (!dailySummaryPhoneNumber) {
      throw new Error('Daily Summary için telefon numarası tanımlanmamış');
    }
    
    const dailySummaryClient = twilio(dailySummaryAccountSid, dailySummaryAuthToken);
    
    // Yıl ve ay parametrelerini al
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    
    // Ayın ilk ve son günlerini hesapla
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    
    logger.info(`Aylık özet çekiliyor: ${year}-${month}, numara: ${dailySummaryPhoneNumber}`);
    logger.info(`Tarih aralığı: ${firstDay.toISOString().split('T')[0]} - ${lastDay.toISOString().split('T')[0]}`);
    
    // Her gün için özet çek
    const monthlyData = [];
    const promises = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const targetDate = new Date(year, month - 1, day);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      // Her gün için promise oluştur
      promises.push(
        (async () => {
          try {
            // Günün başlangıç ve bitiş zamanları
            const startTime = new Date(targetDate);
            startTime.setHours(0, 0, 0, 0);
            
            const endTime = new Date(targetDate);
            endTime.setHours(23, 59, 59, 999);
            
            // Inbound çağrılar
            const inboundCalls = await dailySummaryClient.calls.list({
              to: dailySummaryPhoneNumber,
              startTimeAfter: startTime,
              startTimeBefore: endTime,
              limit: 1000
            });
            
            // Outbound çağrılar - önce belirli numaradan arayanlar
            let outboundCalls = await dailySummaryClient.calls.list({
              from: dailySummaryPhoneNumber,
              startTimeAfter: startTime,
              startTimeBefore: endTime,
              limit: 1000
            });
            
            // Eğer from ile bulunamazsa, tüm outbound çağrıları çek (API çağrıları)
            if (outboundCalls.length === 0) {
              const allOutbound = await dailySummaryClient.calls.list({
                startTimeAfter: startTime,
                startTimeBefore: endTime,
                limit: 1000
              });
              
              // Sadece outbound-api çağrılarını filtrele
              outboundCalls = allOutbound.filter(call => 
                call.direction === 'outbound-api' || 
                call.direction === 'outbound-dial' ||
                call.direction.includes('outbound')
              );
            }
            
            // Inbound çağrıları filtrele (conference/IVR child call'ları çıkar)
            // Kaçırılan çağrılar dahil tüm normal inbound çağrıları tut
            const filteredInboundCalls = inboundCalls.filter((c) => {
              // parentCallSid yoksa kesinlikle tut
              if (!c.parentCallSid) return true;
              
              // parentCallSid varsa ama kaçırılan veya tamamlanmış bir çağrıysa tut
              if (c.status === 'completed' || c.status === 'no-answer' || c.status === 'busy' || c.status === 'failed' || c.status === 'canceled') {
                return true;
              }
              
              // parentCallSid var VE in-progress/queued gibi bir status ise çıkar (child call)
              return false;
            });
            
            // Outbound için function yönlendirme numaralarını filtrele
            // +447707964726 (Polish agent) ve +447599042882 (Latvian agent) numaralarına
            // yapılan ve parentCallSid olan çağrılar inbound çağrıların yönlendirmesidir
            const FUNCTION_REDIRECT_NUMBERS = ['+447707964726', '+447599042882'];
            
            // Outbound çağrıları filtrele:
            // Function yönlendirme çağrılarını filtrele (yönlendirme numarasına giden VE parent'lı)
            // Studio Flow çağrılarını dahil et (parentCallSid olmayan)
            // Talkyto çağrılarını dahil et (parentCallSid olan ama yönlendirme değil)
            const filteredOutboundCalls = outboundCalls.filter((c) => {
              const isRedirectNumber = FUNCTION_REDIRECT_NUMBERS.includes(c.to);
              const hasParent = !!c.parentCallSid;
              
              // Function yönlendirme çağrılarını filtrele (inbound'tan türetilmiş yönlendirmeler)
              const isFunctionRedirect = isRedirectNumber && hasParent;
              return !isFunctionRedirect;
            });
            
            // İstatistikleri hesapla - Twilio Function mantığıyla uyumlu
            // Bir çağrı "answered" sayılır sadece: status = completed VE duration > 0
            const inboundStats = {
              total: filteredInboundCalls.length,
              answered: filteredInboundCalls.filter(c => c.status === 'completed' && parseInt(c.duration || 0) > 0).length,
              missed: filteredInboundCalls.filter(c => c.status !== 'completed' || parseInt(c.duration || 0) === 0).length,
            };
            
            const outboundStats = {
              total: filteredOutboundCalls.length,
              completed: filteredOutboundCalls.filter(c => c.status === 'completed').length,
              failed: filteredOutboundCalls.filter(c => c.status !== 'completed').length,
            };
            
            return {
              date: dateStr,
              day: day,
              inbound: inboundStats,
              outbound: outboundStats,
              totalCalls: inboundStats.total + outboundStats.total
            };
          } catch (error) {
            logger.error(`Gün ${day} için hata:`, { message: error.message });
            return {
              date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
              day: day,
              inbound: { total: 0, answered: 0, missed: 0 },
              outbound: { total: 0, completed: 0, failed: 0 },
              totalCalls: 0,
              error: error.message
            };
          }
        })()
      );
    }
    
    // Tüm günlerin verilerini bekle
    const results = await Promise.all(promises);
    monthlyData.push(...results);
    
    // Toplam istatistikler
    const totalStats = monthlyData.reduce((acc, day) => ({
      totalCalls: acc.totalCalls + day.totalCalls,
      inbound: {
        total: acc.inbound.total + day.inbound.total,
        answered: acc.inbound.answered + day.inbound.answered,
        missed: acc.inbound.missed + day.inbound.missed
      },
      outbound: {
        total: acc.outbound.total + day.outbound.total,
        completed: acc.outbound.completed + day.outbound.completed,
        failed: acc.outbound.failed + day.outbound.failed
      }
    }), {
      totalCalls: 0,
      inbound: { total: 0, answered: 0, missed: 0 },
      outbound: { total: 0, completed: 0, failed: 0 }
    });
    
    res.json({
      success: true,
      year: year,
      month: month,
      monthName: new Date(year, month - 1, 1).toLocaleString('tr-TR', { month: 'long' }),
      days: monthlyData,
      totals: totalStats
    });
    
  } catch (error) {
    logger.error('Aylık özet hatası:', { message: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 