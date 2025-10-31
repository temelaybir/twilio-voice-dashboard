// config/database.js
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

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
    
    AppDataSource = new DataSource({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [path.join(__dirname, '../models/*.js')],
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

    // SQLite veritabanı bağlantısı
    AppDataSource = new DataSource({
      type: 'sqlite',
      database: path.join(dataDir, 'database.sqlite'),
      entities: [path.join(__dirname, '../models/*.js')],
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
    
    if (hasMySQL) {
      logger.info('✅ MySQL veritabanı bağlantısı başarıyla kuruldu');
    } else {
      logger.info('✅ SQLite veritabanı bağlantısı başarıyla kuruldu');
    }
    
    return true;
  } catch (error) {
    logger.error('❌ Veritabanı başlatma hatası:', { 
      error: error.message,
      code: error.code 
    });
    
    // MySQL bağlantı hataları için özel mesajlar
    if (error.code === 'ENOTFOUND') {
      logger.error('MySQL host bulunamadı. DB_HOST değişkenini kontrol edin.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error('MySQL erişim reddedildi. Kullanıcı adı/şifre kontrol edin.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      logger.error('MySQL veritabanı bulunamadı. DB_NAME değişkenini kontrol edin.');
    }
    
    return false;
  }
}

module.exports = {
  initializeDatabase,
  AppDataSource
}; 