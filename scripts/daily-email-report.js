#!/usr/bin/env node

/**
 * Günlük Çağrı Özeti Email Raporu
 * 
 * Bu script günlük çağrı istatistiklerini backend API'den çekip
 * email olarak gönderir. Plesk cron job ile çalıştırılabilir.
 * 
 * Kullanım:
 *   node scripts/daily-email-report.js
 *   node scripts/daily-email-report.js --date=2025-10-30
 *   node scripts/daily-email-report.js --yesterday
 */

require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

// Konfigürasyon
const CONFIG = {
  // Backend API URL (local veya production)
  apiUrl: process.env.BACKEND_API_URL || 'http://localhost:3001',
  
  // Email ayarları
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
  },
  
  // Twilio bilgileri (email'de gösterilecek)
  clinicName: process.env.CLINIC_NAME || 'Happy Smile Clinics',
  phoneNumber: process.env.TWILIO_DAILY_SUMMARY_PHONE_NUMBER || 'N/A',
};

/**
 * Tarih parametresini parse et
 */
function getTargetDate() {
  const args = process.argv.slice(2);
  
  // --yesterday parametresi
  if (args.includes('--yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  
  // --date=YYYY-MM-DD parametresi
  const dateArg = args.find(arg => arg.startsWith('--date='));
  if (dateArg) {
    return dateArg.split('=')[1];
  }
  
  // Default: bugün
  return new Date().toISOString().split('T')[0];
}

/**
 * Backend API'den günlük özeti çek
 */
async function fetchDailySummary(date, logger = console) {
  try {
    const url = `${CONFIG.apiUrl}/api/calls/daily-summary?date=${date}&direction=all`;
    logger.log(`📡 API çağrısı yapılıyor: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 30000, // 30 saniye timeout
    });
    
    if (!response.data || !response.data.success) {
      throw new Error('API yanıtı başarısız');
    }
    
    logger.log('✅ Veri başarıyla çekildi');
    return response.data;
  } catch (error) {
    logger.error('❌ API hatası:', error.message);
    if (error.response) {
      logger.error('Response:', error.response.data);
    }
    throw error;
  }
}

/**
 * Süreyi formatla (saniye -> dakika:saniye)
 */
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}d ${secs}sn`;
}

/**
 * Telefon numarasını formatla
 */
function formatPhone(phone) {
  if (!phone) return 'N/A';
  // +48 gibi ülke kodlarını koru
  return phone;
}

/**
 * HTML email template'i oluştur
 */
function generateEmailHTML(data) {
  const { date, stats, calls } = data;
  const { inbound, outbound, overall } = stats;
  
  // Çağrı listesi HTML'i
  const inboundCallsHTML = calls.inbound.slice(0, 10).map(call => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(call.startTime).toLocaleTimeString('tr-TR')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatPhone(call.from)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        <span style="
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          ${call.status === 'completed' ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}
        ">
          ${call.status === 'completed' ? '✓ Tamamlandı' : '✗ Kaçırıldı'}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDuration(call.duration)}</td>
    </tr>
  `).join('');
  
  const outboundCallsHTML = calls.outbound.slice(0, 10).map(call => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(call.startTime).toLocaleTimeString('tr-TR')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatPhone(call.to)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        <span style="
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          ${call.status === 'completed' ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}
        ">
          ${call.status === 'completed' ? '✓ Tamamlandı' : '✗ Başarısız'}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDuration(call.duration)}</td>
    </tr>
  `).join('');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Günlük Çağrı Özeti - ${date}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 800px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 28px;">📊 Günlük Çağrı Özeti</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${CONFIG.clinicName}</p>
      <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${date} - ${CONFIG.phoneNumber}</p>
    </div>
    
    <!-- Özet İstatistikler -->
    <div style="padding: 30px;">
      <h2 style="color: #333; margin-top: 0;">Genel Özet</h2>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
        <!-- Gelen Çağrılar -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745;">
          <h3 style="margin: 0 0 15px 0; color: #28a745; font-size: 18px;">📞 Gelen Çağrılar</h3>
          <div style="font-size: 32px; font-weight: bold; color: #333; margin-bottom: 10px;">${inbound.total}</div>
          <div style="color: #666; font-size: 14px; margin-bottom: 5px;">✓ Yanıtlanan: <strong>${inbound.answered}</strong></div>
          <div style="color: #666; font-size: 14px; margin-bottom: 5px;">✗ Kaçırılan: <strong>${inbound.missed}</strong></div>
          <div style="color: #666; font-size: 14px; margin-bottom: 5px;">📊 Kaçırma Oranı: <strong>${inbound.missedRatio}%</strong></div>
          <div style="color: #666; font-size: 14px; margin-bottom: 5px;">⏱ Ort. Süre: <strong>${formatDuration(inbound.avgDuration)}</strong></div>
          <div style="color: #666; font-size: 14px;">⌚ Toplam: <strong>${formatDuration(inbound.totalDuration)}</strong></div>
        </div>
        
        <!-- Giden Çağrılar -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
          <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px;">📱 Giden Çağrılar</h3>
          <div style="font-size: 32px; font-weight: bold; color: #333; margin-bottom: 10px;">${outbound.total}</div>
          <div style="color: #666; font-size: 14px; margin-bottom: 5px;">✓ Tamamlanan: <strong>${outbound.completed}</strong></div>
          <div style="color: #666; font-size: 14px; margin-bottom: 5px;">✗ Başarısız: <strong>${outbound.failed}</strong></div>
          <div style="color: #666; font-size: 14px; margin-bottom: 5px;">⏱ Ort. Süre: <strong>${formatDuration(outbound.avgDuration)}</strong></div>
          <div style="color: #666; font-size: 14px;">⌚ Toplam: <strong>${formatDuration(outbound.totalDuration)}</strong></div>
        </div>
      </div>
      
      <!-- Toplam İstatistikler -->
      <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">📈 Toplam İstatistikler</h3>
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="font-size: 28px; font-weight: bold;">${overall.totalCalls}</div>
            <div style="opacity: 0.9; font-size: 14px;">Toplam Çağrı</div>
          </div>
          <div>
            <div style="font-size: 28px; font-weight: bold;">${formatDuration(overall.totalDuration)}</div>
            <div style="opacity: 0.9; font-size: 14px;">Toplam Süre</div>
          </div>
        </div>
      </div>
      
      <!-- Gelen Çağrılar Tablosu -->
      ${inbound.total > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333;">📞 Gelen Çağrılar Detayı ${inbound.total > 10 ? `(İlk 10 / ${inbound.total})` : ''}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Saat</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Arayan</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Durum</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Süre</th>
            </tr>
          </thead>
          <tbody>
            ${inboundCallsHTML}
          </tbody>
        </table>
      </div>
      ` : '<p style="color: #666; text-align: center; padding: 20px;">Bugün gelen çağrı yok.</p>'}
      
      <!-- Giden Çağrılar Tablosu -->
      ${outbound.total > 0 ? `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333;">📱 Giden Çağrılar Detayı ${outbound.total > 10 ? `(İlk 10 / ${outbound.total})` : ''}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Saat</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Aranan</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Durum</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Süre</th>
            </tr>
          </thead>
          <tbody>
            ${outboundCallsHTML}
          </tbody>
        </table>
      </div>
      ` : '<p style="color: #666; text-align: center; padding: 20px;">Bugün giden çağrı yok.</p>'}
      
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; font-size: 12px;">
      <p style="margin: 0;">Bu rapor otomatik olarak oluşturulmuştur.</p>
      <p style="margin: 5px 0 0 0;">Twilio Voice Dashboard - ${new Date().toLocaleString('tr-TR')}</p>
    </div>
    
  </div>
</body>
</html>
  `;
}

/**
 * Email gönder
 */
async function sendEmail(htmlContent, date, logger = console) {
  try {
    logger.log('📧 Email gönderiliyor...');
    
    // Şifre ve kullanıcı adını temizle (başta/sonda boşluk varsa)
    const cleanUser = CONFIG.email.auth.user ? CONFIG.email.auth.user.trim() : '';
    const cleanPassword = CONFIG.email.auth.pass ? CONFIG.email.auth.pass.trim() : '';
    
    // Nodemailer transporter oluştur
    // server.plante.biz için özel ayarlar
    const transporter = nodemailer.createTransport({
      host: CONFIG.email.host,
      port: CONFIG.email.port,
      secure: CONFIG.email.secure, // false for 587, true for 465
      requireTLS: !CONFIG.email.secure, // Port 587 için TLS gerektir (secure false ise)
      auth: {
        user: cleanUser,
        pass: cleanPassword
      },
      tls: {
        rejectUnauthorized: false, // Self-signed certificate için
        minVersion: 'TLSv1' // Minimum TLS versiyonu
      },
      connectionTimeout: 30000, // 30 saniye timeout
      greetingTimeout: 30000,
      socketTimeout: 30000
    });
    
    // Email ayarları
    // EMAIL_TO virgülle ayrılmış birden fazla alıcı olabilir
    const recipients = CONFIG.email.to ? CONFIG.email.to.split(',').map(email => email.trim()) : [];
    
    const mailOptions = {
      from: `"${CONFIG.clinicName} - Polonya Çağrı Raporu" <${CONFIG.email.from}>`,
      to: recipients.join(', '), // Birden fazla alıcıyı düzgün formatla
      subject: `📊 Günlük Çağrı Özeti - ${date} - ${CONFIG.clinicName}`,
      html: htmlContent,
    };
    
    // Email gönder
    const info = await transporter.sendMail(mailOptions);
    
    logger.log('✅ Email başarıyla gönderildi:', info.messageId);
    logger.log('📬 Alıcı:', CONFIG.email.to);
    
    return info;
  } catch (error) {
    logger.error('❌ Email gönderme hatası:', error.message);
    throw error;
  }
}

/**
 * Ana fonksiyon
 * @param {string} targetDate - Rapor tarihi (YYYY-MM-DD formatında), null ise bugünü kullanır
 * @param {Function} logger - Logger fonksiyonu (opsiyonel, console.log yerine)
 * @returns {Promise<void>}
 */
async function main(targetDate = null, logger = console) {
  logger.log('🚀 Günlük Email Raporu Script Başlatıldı');
  logger.log('═'.repeat(50));
  
  try {
    // Email ayarlarını kontrol et
    if (!CONFIG.email.auth.user || !CONFIG.email.auth.pass) {
      throw new Error('Email kimlik bilgileri eksik! EMAIL_USER ve EMAIL_PASSWORD .env dosyasında tanımlanmalı.');
    }
    
    if (!CONFIG.email.to) {
      throw new Error('Email alıcısı eksik! EMAIL_TO .env dosyasında tanımlanmalı.');
    }
    
    // Tarih belirle
    const date = targetDate || getTargetDate();
    logger.log(`📅 Rapor tarihi: ${date}`);
    
    // Backend'in çalıştığını kontrol et
    logger.log(`🔍 Backend kontrol ediliyor: ${CONFIG.apiUrl}`);
    
    // Günlük özeti çek
    const summaryData = await fetchDailySummary(date, logger);
    
    logger.log(`📊 İstatistikler:`);
    logger.log(`   - Gelen: ${summaryData.stats.inbound.total} (Yanıtlanan: ${summaryData.stats.inbound.answered})`);
    logger.log(`   - Giden: ${summaryData.stats.outbound.total} (Tamamlanan: ${summaryData.stats.outbound.completed})`);
    logger.log(`   - Toplam: ${summaryData.stats.overall.totalCalls} çağrı`);
    
    // HTML email oluştur
    const htmlContent = generateEmailHTML(summaryData);
    
    // Email gönder
    await sendEmail(htmlContent, summaryData.date, logger);
    
    logger.log('═'.repeat(50));
    logger.log('✅ İşlem başarıyla tamamlandı!');
    
  } catch (error) {
    logger.error('═'.repeat(50));
    logger.error('❌ Hata:', error.message);
    logger.error('═'.repeat(50));
    throw error; // Modül kullanımında hata fırlatılmalı
  }
}

// Modül olarak export et (server.js'den kullanım için)
module.exports = { main, sendEmail, fetchDailySummary, generateEmailHTML };

// Eğer script doğrudan çalıştırılıyorsa (CLI)
if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Script hatası:', error.message);
    process.exit(1);
  });
}

