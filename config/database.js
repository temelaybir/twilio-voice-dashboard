// config/database.js
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Entity'leri explicit olarak import et (Vercel uyumluluğu için)
let EventHistory = null;
let Call = null;

// Email modülü entity'leri
let EmailTemplate = null;
let EmailList = null;
let EmailSubscriber = null;
let EmailCampaign = null;
let EmailSend = null;

// Call Queue entity
let CallQueue = null;

// Entity dosyalarının path'lerini kontrol et
const eventHistoryPath = path.join(__dirname, '../models/EventHistory.js');
const callPath = path.join(__dirname, '../models/Call.js');

logger.info(`EventHistory path kontrolü: ${eventHistoryPath}`);
logger.info(`Call path kontrolü: ${callPath}`);
logger.info(`__dirname: ${__dirname}`);
logger.info(`File exists EventHistory: ${fs.existsSync(eventHistoryPath)}`);
logger.info(`File exists Call: ${fs.existsSync(callPath)}`);

try {
  // Absolute path ile require dene
  const resolvedPath = require.resolve('../models/EventHistory', { paths: [__dirname] });
  logger.info(`EventHistory resolved path: ${resolvedPath}`);
  
  const eventHistoryModule = require(resolvedPath);
  EventHistory = eventHistoryModule.EventHistory;
  
  if (!EventHistory) {
    logger.error('❌ EventHistory entity module\'dan export edilemedi');
    logger.error(`Module exports: ${Object.keys(eventHistoryModule).join(', ')}`);
  } else {
    logger.info('✅ EventHistory entity başarıyla import edildi');
    logger.info(`EventHistory entity type: ${typeof EventHistory}`);
    logger.info(`EventHistory options: ${JSON.stringify(EventHistory.options || {})}`);
  }
} catch (error) {
  logger.error('❌ EventHistory entity import hatası:', { 
    message: error.message,
    stack: error.stack,
    code: error.code,
    path: eventHistoryPath
  });
  // Hata durumunda null kalır, entity kullanılamaz
}

// Call entity'si de varsa ekle
try {
  const callModule = require('../models/Call');
  Call = callModule.Call;
  if (Call) {
    logger.info('✅ Call entity başarıyla import edildi');
  }
} catch (error) {
  // Call entity yoksa sorun değil (opsiyonel)
  logger.debug('Call entity import edilemedi (opsiyonel):', error.message);
}

// Email modülü entity'lerini import et
try {
  const emailTemplateModule = require('../models/EmailTemplate');
  EmailTemplate = emailTemplateModule.EmailTemplate;
  
  const emailListModule = require('../models/EmailList');
  EmailList = emailListModule.EmailList;
  
  const emailSubscriberModule = require('../models/EmailSubscriber');
  EmailSubscriber = emailSubscriberModule.EmailSubscriber;
  
  const emailCampaignModule = require('../models/EmailCampaign');
  EmailCampaign = emailCampaignModule.EmailCampaign;
  
  const emailSendModule = require('../models/EmailSend');
  EmailSend = emailSendModule.EmailSend;
  
  if (EmailTemplate && EmailList && EmailSubscriber && EmailCampaign && EmailSend) {
    logger.info('✅ Email modülü entity\'leri başarıyla import edildi');
  }
} catch (error) {
  logger.warn('⚠️ Email modülü entity\'leri import edilemedi (opsiyonel):', error.message);
}

// CallQueue entity import et
try {
  const callQueueModule = require('../models/CallQueue');
  CallQueue = callQueueModule.CallQueue;
  if (CallQueue) {
    logger.info('✅ CallQueue entity başarıyla import edildi');
  }
} catch (error) {
  logger.warn('⚠️ CallQueue entity import edilemedi (opsiyonel):', error.message);
}

// Vercel/Production environment kontrolü
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

let AppDataSource = null;

// MySQL configuration için gerekli değişkenler
const hasMySQL = process.env.DB_HOST && 
                 process.env.DB_USER && 
                 process.env.DB_NAME;

// Production veya MySQL varsa MySQL kullan
if (hasMySQL) {
  try {
    logger.info('MySQL bağlantısı yapılandırılıyor...');
    
    // Entity kontrolü
    if (!EventHistory) {
      logger.error('❌ EventHistory entity import edilemedi - MySQL bağlantısı oluşturulamıyor');
      throw new Error('EventHistory entity bulunamadı');
    }
    
    // Entity listesini oluştur
    const entities = [EventHistory];
    if (Call) entities.push(Call);
    if (EmailTemplate) entities.push(EmailTemplate);
    if (EmailList) entities.push(EmailList);
    if (EmailSubscriber) entities.push(EmailSubscriber);
    if (EmailCampaign) entities.push(EmailCampaign);
    if (EmailSend) entities.push(EmailSend);
    if (CallQueue) entities.push(CallQueue);
    
    logger.info(`MySQL için ${entities.length} entity yüklenecek: ${entities.map(e => e.options?.name || 'unknown').join(', ')}`);
    
    AppDataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      // Entity'leri explicit olarak belirt (Vercel uyumluluğu için)
      entities: entities,
      synchronize: true, // Production'da false yapın ve migration kullanın
      logging: process.env.DB_LOGGING === 'true',
      charset: 'utf8mb4',
      timezone: '+00:00',
      // Vercel MySQL için gerekli ayarlar
      extra: {
        connectionLimit: 5,
      }
    });
    
    logger.info(`MySQL bağlantı ayarları: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT || '3306'}/${process.env.DB_NAME}`);
  } catch (error) {
    logger.error('MySQL Database başlatma hatası:', error.message);
  }
} 
// Local development için SQLite
else if (!isProduction) {
  try {
    logger.info('SQLite kullanılıyor (local development)...');
    
    // Veritabanı dizinini oluştur
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Entity kontrolü
    if (!EventHistory) {
      logger.error('❌ EventHistory entity import edilemedi - SQLite bağlantısı oluşturulamıyor');
      throw new Error('EventHistory entity bulunamadı');
    }
    
    // Entity listesini oluştur
    const entities = [EventHistory];
    if (Call) entities.push(Call);
    if (EmailTemplate) entities.push(EmailTemplate);
    if (EmailList) entities.push(EmailList);
    if (EmailSubscriber) entities.push(EmailSubscriber);
    if (EmailCampaign) entities.push(EmailCampaign);
    if (EmailSend) entities.push(EmailSend);
    if (CallQueue) entities.push(CallQueue);
    
    logger.info(`SQLite için ${entities.length} entity yüklenecek: ${entities.map(e => e.options?.name || 'unknown').join(', ')}`);
    
    // SQLite veritabanı bağlantısı
    AppDataSource = new DataSource({
      type: 'sqlite',
      database: path.join(dataDir, 'database.sqlite'),
      // Entity'leri explicit olarak belirt (Vercel uyumluluğu için)
      entities: entities,
      synchronize: true,
      logging: false,
    });
  } catch (error) {
    logger.warn('SQLite başlatılamadı:', error.message);
  }
} else {
  logger.warn('Database yapılandırılmadı - MySQL bilgilerini .env dosyasına ekleyin');
}

// Veritabanını başlat
async function initializeDatabase() {
  if (!AppDataSource) {
    logger.warn('Database yapılandırılmamış - başlatma atlanıyor');
    return false;
  }

  try {
    await AppDataSource.initialize();
    
    // Entity metadata kontrolü (Vercel debug için)
    const metadataCount = AppDataSource.entityMetadatas.length;
    logger.info(`✅ Database initialize edildi - ${metadataCount} entity yüklendi`);
    
    // EventHistory entity kontrolü
    const eventHistoryMetadata = AppDataSource.entityMetadatas.find(
      metadata => metadata.name === 'EventHistory'
    );
    if (eventHistoryMetadata) {
      logger.info('✅ EventHistory entity metadata bulundu');
    } else {
      logger.error('❌ EventHistory entity metadata BULUNAMADI!');
      logger.error(`Yüklenen entity'ler: ${AppDataSource.entityMetadatas.map(m => m.name).join(', ')}`);
    }
    
    if (hasMySQL) {
      logger.info('✅ MySQL veritabanı bağlantısı başarıyla kuruldu');
    } else {
      logger.info('✅ SQLite veritabanı bağlantısı başarıyla kuruldu');
    }
    
    return true;
  } catch (error) {
    logger.error(`❌ Veritabanı başlatma hatası: ${error.message}`);
    logger.error(`Error stack: ${error.stack}`);
    
    // MySQL bağlantı hataları için özel mesajlar
    if (error.code === 'ENOTFOUND') {
      logger.error('→ MySQL host bulunamadı. DB_HOST değişkenini kontrol edin.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('→ MySQL erişim reddedildi. Kullanıcı adı/şifre kontrol edin.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      logger.error('→ MySQL veritabanı bulunamadı. DB_NAME değişkenini kontrol edin.');
    } else if (error.code) {
      logger.error(`→ MySQL Error Code: ${error.code}`);
    }
    
    return false;
  }
}

module.exports = {
  initializeDatabase,
  AppDataSource
}; 