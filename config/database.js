// config/database.js
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Vercel/Production environment kontrolü
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

let AppDataSource = null;

// SQLite sadece local development için
if (!isProduction) {
  try {
    // Veritabanı dizinini oluştur (sadece local'de)
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
    logger.warn('Database başlatılamadı:', error.message);
  }
} else {
  logger.info('Production mode: SQLite devre dışı (Vercel serverless)');
}

// Veritabanını başlat
async function initializeDatabase() {
  // Production'da database yok
  if (isProduction || !AppDataSource) {
    logger.info('Database başlatma atlanıyor (production/serverless mode)');
    return false;
  }

  try {
    await AppDataSource.initialize();
    logger.info('Veritabanı bağlantısı başarıyla kuruldu');
    return true;
  } catch (error) {
    logger.error('Veritabanı başlatma hatası:', { error });
    return false;
  }
}

module.exports = {
  initializeDatabase,
  AppDataSource
}; 