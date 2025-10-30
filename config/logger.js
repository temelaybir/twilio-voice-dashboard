const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Log dizinini oluştur
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

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
    format: consoleFormat,
  }),
  // Birleşik log dosyası
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: winston.format.json(),
  }),
  // Hata log dosyası
  new winston.transports.File({
    level: 'error',
    filename: path.join(logDir, 'error.log'),
    format: winston.format.json(),
  }),
];

// Logger'ı oluştur
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
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