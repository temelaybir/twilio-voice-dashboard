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

// Event History'ye kaydetme fonksiyonu
async function saveEventHistory(eventType, eventData) {
  if (!database || !database.AppDataSource || !EventHistory) {
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

// Koşullu Twilio istemcisi oluştur
let twilioClient = null;
try {
  logger.info('Twilio kimlik bilgileri kontrol ediliyor...');
  logger.info(`TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? 'Tanımlı' : 'Tanımlı değil'}`);
  logger.info(`TWILIO_FLOW_SID: ${process.env.TWILIO_FLOW_SID ? 'Tanımlı' : 'Tanımlı değil'}`);
  
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    logger.info('Twilio istemcisi başarıyla oluşturuldu');
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
        
        // Socket.IO ile anlık bildirim gönder
        if (global.io) {
          global.io.emit('bulkCallProgress', {
            type: 'success',
            to: phoneNumber,
            execution_sid: execution.sid
          });
        }
        
      } catch (err) {
        logger.error(`Toplu çağrı hatası (${phoneNumber}):`, { message: err.message, code: err.code });
        errors.push({ to: phoneNumber, error: err.message, code: err.code });
        
        // Socket.IO ile anlık bildirim gönder
        if (global.io) {
          global.io.emit('bulkCallProgress', {
            type: 'error',
            to: phoneNumber,
            error: err.message,
            code: err.code
          });
        }
      }
    };

    // Paralelliği kontrol etmek için Promise.all kullanma
    // Bunun yerine sırayla çağrı başlatacağız
    for (let i = 0; i < phoneNumbers.length; i++) {
      // Konsola ilerleme bilgisi
      logger.info(`Çağrı kuyruğa eklendi (${i+1}/${phoneNumbers.length}): ${phoneNumbers[i]}`);
      
      // Socket.IO ile ilerleme bildirimi gönder
      if (global.io) {
        global.io.emit('bulkCallProgress', {
          total: phoneNumbers.length,
          current: i+1,
          status: 'queued',
          phoneNumber: phoneNumbers[i]
        });
      }
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
      
      // Socket.IO ile tamamlandı bildirimi gönder
      if (global.io) {
        const socketData = {
          total: phoneNumbers.length,
          success: results.length,
          failed: errors.length,
          results,
          errors
        };
        logger.info('Socket.IO ile toplu çağrı tamamlama bildirimi gönderiliyor:', { socketData });
        global.io.emit('bulkCallComplete', socketData);
      }
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

// Flow webhook
router.post('/webhooks/flow', async (req, res) => {
  try {
    logger.info('Flow Webhook - Gelen veri:', { body: req.body });
    
    // Event history'ye kaydet
    await saveEventHistory('flow', req.body);
    
    // Socket.IO event'i gönder
    if (global.io) {
      logger.info('Socket.IO ile "flowUpdate" event\'i gönderiliyor');
      global.io.volatile.emit('flowUpdate', req.body);
    }
    
    res.sendStatus(200);
  } catch (error) {
    logger.error('Flow webhook hatası:', { error });
    res.sendStatus(500);
  }
});

// Status webhook
router.post('/webhooks/status', async (req, res) => {
  logger.info('Status webhook alındı:', { body: req.body });
  
  // Event history'ye kaydet
  await saveEventHistory('status', req.body);
  
  // Webhook'tan çağrı durumunu al
  const callStatus = req.body.CallStatus;
  const dialCallStatus = req.body.DialCallStatus;
  
  // Çağrı reddedildiğinde, CallStatus genellikle "completed" olacak,
  // ama DialCallStatus "busy" veya "canceled" veya "no-answer" olabilir
  const executionSid = req.body.CallSid || req.body.execution_sid;
  
  if (executionSid) {
    logger.debug(`Status webhook için executionSid: ${executionSid}, CallStatus: ${callStatus}, DialCallStatus: ${dialCallStatus}`);
    
    // Çağrı reddedildiğinde socket ile bilgilendir
    if (callStatus === 'completed' || 
        dialCallStatus === 'busy' || 
        dialCallStatus === 'canceled' || 
        dialCallStatus === 'no-answer') {
      // Çağrı reddine özel durum bildirimi
      const rejectStatus = dialCallStatus || 'canceled';
      
      // Socket.io ile durumu ilet
      if (global.io) {
        const socketData = {
          execution_sid: executionSid,
          event: rejectStatus,
          CallStatus: callStatus,
          DialCallStatus: dialCallStatus,
          To: req.body.To,
          timestamp: new Date().toISOString()
        };
        logger.info(`Socket.io ile reddedilen çağrı bilgisi gönderiliyor: ${executionSid}, durum: ${rejectStatus}`);
        global.io.emit('statusUpdate', socketData);
      } else {
        logger.error('Socket.io bağlantısı yok! (io objesi bulunmuyor)');
      }
      
      logger.info(`Çağrı reddedildi: ${executionSid}, durum: ${rejectStatus}`);
    } else {
      // Normal durum güncellemesi
      if (global.io) {
        const socketData = {
          execution_sid: executionSid,
          CallStatus: callStatus,
          DialCallStatus: dialCallStatus,
          To: req.body.To,
          timestamp: new Date().toISOString()
        };
        logger.info(`Socket.io ile normal durum güncellemesi gönderiliyor: ${executionSid}`);
        global.io.emit('statusUpdate', socketData);
      } else {
        logger.error('Socket.io bağlantısı yok! (io objesi bulunmuyor)');
      }
    }
  } else {
    logger.warn('Status webhook geçersiz executionSid ile alındı:', { body: req.body });
  }
  
  res.status(200).send('OK');
});

// DTMF webhook
router.post('/webhooks/dtmf', async (req, res) => {
  try {
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
      // Socket.IO event'i hazırlıkları
      dtmfData.is_action = hasAction;
      dtmfData.timestamp = Date.now();
      
      // İstemcilere doğrudan gönder ve cevap bekleme
      if (global.io) {
        logger.info('Socket.IO ile "dtmfUpdate" event\'i gönderiliyor');
        global.io.volatile.emit('dtmfUpdate', dtmfData);
        
        // Eğer bu bir aksiyon tuşlamasıysa, aynı zamanda bir durum güncellemesi olarak da gönder
        if (hasAction && dtmfData.action) {
          const statusData = {
            ...dtmfData,
            event: dtmfData.action, // action'ı event olarak ayarla
            timestamp: Date.now()
          };
          
          logger.info('Socket.IO ile "statusUpdate" (aksiyon) event\'i gönderiliyor');
          global.io.volatile.emit('statusUpdate', statusData);
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const eventRepository = database.AppDataSource.getRepository(EventHistory);
    
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
      time: event.timestamp,
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
          lastActivity: call.lastActivity,
          createdAt: call.createdAt,
          dtmfActions: events.filter(e => e.eventType === 'dtmf' && e.action).map(e => ({
            digits: e.dtmfDigits,
            action: e.action,
            timestamp: e.timestamp
          })),
          events: events.map(e => ({
            id: e.id,
            eventType: e.eventType,
            status: e.status,
            dtmfDigits: e.dtmfDigits,
            action: e.action,
            timestamp: e.timestamp,
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
        timestamp: e.timestamp,
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
    const weeklyStats = await eventRepository.query(`
      SELECT 
        DATE(datetime(timestamp/1000, 'unixepoch')) as date,
        COUNT(DISTINCT executionSid) as calls,
        COUNT(CASE WHEN eventType = 'dtmf' AND action = 'confirm_appointment' THEN 1 END) as confirmed,
        COUNT(CASE WHEN eventType = 'dtmf' AND action = 'cancel_appointment' THEN 1 END) as cancelled
      FROM event_history 
      WHERE timestamp >= ?
      GROUP BY DATE(datetime(timestamp/1000, 'unixepoch'))
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
          lastActivity: call.lastActivity,
          createdAt: call.createdAt,
          dtmfActions: events.filter(e => e.eventType === 'dtmf' && e.action).map(e => ({
            digits: e.dtmfDigits,
            action: e.action,
            timestamp: e.timestamp
          })),
          events: events.map(e => ({
            id: e.id,
            eventType: e.eventType,
            status: e.status,
            dtmfDigits: e.dtmfDigits,
            action: e.action,
            timestamp: e.timestamp,
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
    logger.debug(`Daily Summary Account SID: ${dailySummaryAccountSid.substring(0, 10)}...`);
    logger.debug(`Daily Summary Phone Number: ${dailySummaryPhoneNumber}`);

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
    const inbound = inboundCalls.filter((c) => !c.parentCallSid);
    
    // Outbound için dahili yönlendirme numaralarını filtrele
    // +447707964726 gibi Studio Flow dahili yönlendirme numaraları gerçek çağrı değil
    const INTERNAL_REDIRECT_NUMBERS = ['+447707964726'];
    
    // Outbound çağrıları filtrele:
    // 1. parentCallSid olan çağrılar (gerçek müşteri çağrıları)
    // 2. Dahili yönlendirme numaralarına GİTMEYEN çağrılar
    const outbound = outboundCalls.filter((c) => {
      const isRedirectNumber = INTERNAL_REDIRECT_NUMBERS.includes(c.to);
      const hasParent = !!c.parentCallSid;
      
      // Sadece parent'lı VE yönlendirme numarasına gitmeyen çağrıları al
      return hasParent && !isRedirectNumber;
    });
    
    // Debug: Filtreleme analizi
    const totalOutbound = outboundCalls.length;
    const redirectCalls = outboundCalls.filter(c => INTERNAL_REDIRECT_NUMBERS.includes(c.to)).length;
    const withoutParent = outboundCalls.filter(c => !c.parentCallSid).length;
    
    logger.debug(`🔍 Outbound analizi: Toplam ${totalOutbound}, Yönlendirme ${redirectCalls}, Parent'sız ${withoutParent}, Gerçek ${outbound.length}`);
    
    if (redirectCalls > 0) {
      logger.info(`🚫 ${redirectCalls} adet dahili yönlendirme çağrısı filtrelendi`);
    }
    
    if (outbound.length > 0) {
      logger.info(`✅ ${outbound.length} gerçek TalkYto çağrısı bulundu`);
      // İlk çağrının detayını logla
      logger.debug(`İlk gerçek outbound: to=${outbound[0].to}, from=${outbound[0].from}, parent=${outbound[0].parentCallSid ? 'var' : 'yok'}`);
    }
    
    // DEBUG MODE: Tüm outbound çağrıların detaylarını göster
    if (debugMode && totalOutbound > 0) {
      logger.warn('📋 ===== TÜM OUTBOUND ÇAĞRILAR (SON 30 GÜN) =====');
      outboundCalls.forEach((call, index) => {
        const isRedirect = INTERNAL_REDIRECT_NUMBERS.includes(call.to);
        const hasParent = !!call.parentCallSid;
        logger.warn(`${index + 1}. FROM: ${call.from} → TO: ${call.to} | Direction: ${call.direction} | Parent: ${hasParent ? '✓' : '✗'} | Redirect: ${isRedirect ? '✓' : '✗'} | Status: ${call.status} | ${call.startTime}`);
      });
      logger.warn('📋 ===== DETAYLI ANALİZ =====');
      logger.warn(`Toplam Outbound: ${totalOutbound}`);
      logger.warn(`Yönlendirme numarasına (${INTERNAL_REDIRECT_NUMBERS.join(', ')}): ${redirectCalls}`);
      logger.warn(`Parent'lı çağrılar: ${outboundCalls.filter(c => c.parentCallSid).length}`);
      logger.warn(`Parent'sız çağrılar: ${withoutParent}`);
      logger.warn(`Gerçek TalkYto çağrıları (parent'lı + yönlendirme değil): ${outbound.length}`);
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

    const answeredInbound = inbound.filter((c) => c.status === 'completed').length;
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

module.exports = router; 