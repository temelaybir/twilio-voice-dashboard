// config/database.js
const { DataSource } = require('typeorm');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Veritabanı dizinini oluştur
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// SQLite veritabanı bağlantısı
const AppDataSource = new DataSource({
  type: 'sqlite',
  database: path.join(dataDir, 'database.sqlite'),
  entities: [path.join(__dirname, '../models/*.js')],
  synchronize: true,
  logging: false,
});

// Veritabanını başlat
async function initializeDatabase() {
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