const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Vercel/Production environment kontrolü
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// Log seviyeleri ve renkleri
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const levelColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(levelColors);

// Geliştirme ve Production için farklı formatlar
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Log transportları
const transports = [
  // Konsol logları (her zaman aktif)
  new winston.transports.Console({
    format: isProduction ? format : consoleFormat, // Production'da renkli format yok
  }),
];

// Local development için file transportları ekle
if (!isProduction) {
  try {
    // Log dizinini oluştur (sadece local'de)
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // File transportları ekle
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: winston.format.json(),
      }),
      new winston.transports.File({
        level: 'error',
        filename: path.join(logDir, 'error.log'),
        format: winston.format.json(),
      })
    );
  } catch (error) {
    console.warn('Log dizini oluşturulamadı, sadece console logging kullanılacak:', error.message);
  }
}

// Logger'ı oluştur
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  levels: logLevels,
  format,
  transports,
  exitOnError: false, // Hata durumunda uygulamayı kapatma
});

// Morgan için stream objesi
logger.stream = {
  write: (message) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};

module.exports = logger; 