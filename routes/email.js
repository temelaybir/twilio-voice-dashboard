/**
 * Email Campaign Routes
 * Toplu email gönderimi için API endpoint'leri
 * Google Workspace SMTP entegrasyonu
 */

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const XLSX = require('xlsx');
const logger = require('../config/logger');

// Rate limiting için basit in-memory store
const rateLimitStore = {
  emailsSentLastMinute: 0,
  lastResetTime: Date.now(),
  dailyEmailCount: 0,
  dailyResetDate: new Date().toDateString()
};

// Rate limit ayarları (Google Workspace limitleri)
const RATE_LIMITS = {
  emailsPerMinute: parseInt(process.env.BULK_EMAIL_RATE_PER_MINUTE || '30'),
  dailyLimit: parseInt(process.env.BULK_EMAIL_DAILY_LIMIT || '2000'),
  delayBetweenEmails: parseInt(process.env.BULK_EMAIL_DELAY_MS || '2000') // 2 saniye
};

// SMTP Transporter (lazy initialization)
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  
  // Bulk email için ayrı credentials kontrolü
  const emailUser = process.env.BULK_EMAIL_USER || process.env.EMAIL_USER;
  const emailPass = process.env.BULK_EMAIL_PASS || process.env.EMAIL_PASS;
  
  if (!emailUser || !emailPass) {
    logger.warn('⚠️ Email credentials not configured (BULK_EMAIL_USER/BULK_EMAIL_PASS or EMAIL_USER/EMAIL_PASS)');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    host: process.env.BULK_EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.BULK_EMAIL_PORT || '587'),
    secure: process.env.BULK_EMAIL_SECURE === 'true',
    auth: {
      user: emailUser,
      pass: emailPass
    },
    // Google Workspace için önerilen ayarlar
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: RATE_LIMITS.emailsPerMinute
  });
  
  logger.info(`✅ Email transporter oluşturuldu: ${emailUser}`);
  return transporter;
}

// Rate limit kontrolü
function checkRateLimit() {
  const now = Date.now();
  const today = new Date().toDateString();
  
  // Günlük sayacı sıfırla
  if (rateLimitStore.dailyResetDate !== today) {
    rateLimitStore.dailyEmailCount = 0;
    rateLimitStore.dailyResetDate = today;
  }
  
  // Dakikalık sayacı sıfırla
  if (now - rateLimitStore.lastResetTime > 60000) {
    rateLimitStore.emailsSentLastMinute = 0;
    rateLimitStore.lastResetTime = now;
  }
  
  // Limit kontrolleri
  if (rateLimitStore.emailsSentLastMinute >= RATE_LIMITS.emailsPerMinute) {
    return { allowed: false, reason: 'minute_limit', retryAfter: 60 - Math.floor((now - rateLimitStore.lastResetTime) / 1000) };
  }
  
  if (rateLimitStore.dailyEmailCount >= RATE_LIMITS.dailyLimit) {
    return { allowed: false, reason: 'daily_limit', retryAfter: 'tomorrow' };
  }
  
  return { allowed: true };
}

// Rate limit güncelle
function updateRateLimit() {
  rateLimitStore.emailsSentLastMinute++;
  rateLimitStore.dailyEmailCount++;
}

// Helper: Unsubscribe token oluştur
function generateUnsubscribeToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: Template değişkenlerini değiştir
function replaceTemplateVariables(content, variables) {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, value || '');
  }
  return result;
}

// Helper: Unsubscribe link ekle
function addUnsubscribeLink(htmlContent, unsubscribeUrl) {
  const unsubscribeHtml = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666;">
      <p>Bu e-postayı almak istemiyorsanız, <a href="${unsubscribeUrl}" style="color: #666;">buraya tıklayarak</a> aboneliğinizi iptal edebilirsiniz.</p>
    </div>
  `;
  
  // </body> tagından önce ekle
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${unsubscribeHtml}</body>`);
  }
  
  return htmlContent + unsubscribeHtml;
}

// ==================== TEMPLATE ROUTES ====================

// GET /api/email/templates - Tüm template'leri listele
router.get('/templates', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailTemplate } = require('../models/EmailTemplate');
    const templateRepo = AppDataSource.getRepository(EmailTemplate);
    
    const { category, isActive } = req.query;
    const where = {};
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const templates = await templateRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
    
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Template listesi hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/email/templates/:id - Tek template getir
router.get('/templates/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailTemplate } = require('../models/EmailTemplate');
    const templateRepo = AppDataSource.getRepository(EmailTemplate);
    
    const template = await templateRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!template) {
      return res.status(404).json({ error: 'Template bulunamadı' });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Template getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/templates - Yeni template oluştur
router.post('/templates', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailTemplate } = require('../models/EmailTemplate');
    const templateRepo = AppDataSource.getRepository(EmailTemplate);
    
    const { name, subject, htmlContent, textContent, variables, category } = req.body;
    
    if (!name || !subject || !htmlContent) {
      return res.status(400).json({ error: 'name, subject ve htmlContent zorunludur' });
    }
    
    const template = templateRepo.create({
      name,
      subject,
      htmlContent,
      textContent,
      variables: variables ? JSON.stringify(variables) : null,
      category: category || 'general'
    });
    
    await templateRepo.save(template);
    
    logger.info(`✅ Yeni email template oluşturuldu: ${name}`);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    logger.error('Template oluşturma hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/email/templates/:id - Template güncelle
router.put('/templates/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailTemplate } = require('../models/EmailTemplate');
    const templateRepo = AppDataSource.getRepository(EmailTemplate);
    
    const template = await templateRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!template) {
      return res.status(404).json({ error: 'Template bulunamadı' });
    }
    
    const { name, subject, htmlContent, textContent, variables, category, isActive } = req.body;
    
    if (name) template.name = name;
    if (subject) template.subject = subject;
    if (htmlContent) template.htmlContent = htmlContent;
    if (textContent !== undefined) template.textContent = textContent;
    if (variables !== undefined) template.variables = variables ? JSON.stringify(variables) : null;
    if (category) template.category = category;
    if (isActive !== undefined) template.isActive = isActive;
    
    await templateRepo.save(template);
    
    logger.info(`✅ Email template güncellendi: ${template.name}`);
    res.json({ success: true, data: template });
  } catch (error) {
    logger.error('Template güncelleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/email/templates/:id - Template sil
router.delete('/templates/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailTemplate } = require('../models/EmailTemplate');
    const templateRepo = AppDataSource.getRepository(EmailTemplate);
    
    const result = await templateRepo.delete(parseInt(req.params.id));
    
    if (result.affected === 0) {
      return res.status(404).json({ error: 'Template bulunamadı' });
    }
    
    logger.info(`🗑️ Email template silindi: ID ${req.params.id}`);
    res.json({ success: true, message: 'Template silindi' });
  } catch (error) {
    logger.error('Template silme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== LIST ROUTES ====================

// GET /api/email/lists - Tüm listeleri getir
router.get('/lists', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailList } = require('../models/EmailList');
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const lists = await listRepo.find({
      order: { createdAt: 'DESC' }
    });
    
    res.json({ success: true, data: lists });
  } catch (error) {
    logger.error('Liste getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/email/lists/:id - Tek liste getir
router.get('/lists/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailList } = require('../models/EmailList');
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const list = await listRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!list) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
    }
    
    res.json({ success: true, data: list });
  } catch (error) {
    logger.error('Liste getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/lists - Yeni liste oluştur
router.post('/lists', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailList } = require('../models/EmailList');
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name zorunludur' });
    }
    
    const list = listRepo.create({
      name,
      description
    });
    
    await listRepo.save(list);
    
    logger.info(`✅ Yeni email listesi oluşturuldu: ${name}`);
    res.status(201).json({ success: true, data: list });
  } catch (error) {
    logger.error('Liste oluşturma hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/email/lists/:id - Liste güncelle
router.put('/lists/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailList } = require('../models/EmailList');
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const list = await listRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!list) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
    }
    
    const { name, description, isActive } = req.body;
    
    if (name) list.name = name;
    if (description !== undefined) list.description = description;
    if (isActive !== undefined) list.isActive = isActive;
    
    await listRepo.save(list);
    
    logger.info(`✅ Email listesi güncellendi: ${list.name}`);
    res.json({ success: true, data: list });
  } catch (error) {
    logger.error('Liste güncelleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/email/lists/:id - Liste sil
router.delete('/lists/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailList } = require('../models/EmailList');
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const listRepo = AppDataSource.getRepository(EmailList);
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    
    // Önce listedeki aboneleri sil
    await subscriberRepo.delete({ listId: parseInt(req.params.id) });
    
    const result = await listRepo.delete(parseInt(req.params.id));
    
    if (result.affected === 0) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
    }
    
    logger.info(`🗑️ Email listesi silindi: ID ${req.params.id}`);
    res.json({ success: true, message: 'Liste ve aboneleri silindi' });
  } catch (error) {
    logger.error('Liste silme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SUBSCRIBER ROUTES ====================

// GET /api/email/subscribers - Aboneleri listele
router.get('/subscribers', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    
    const { listId, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (listId) where.listId = parseInt(listId);
    if (status) where.status = status;
    
    const [subscribers, total] = await subscriberRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: subscribers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Abone listesi hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/subscribers - Tek abone ekle
router.post('/subscribers', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailList } = require('../models/EmailList');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const { email, firstName, lastName, phone, city, customFields, listId } = req.body;
    
    // En az email veya telefon olmalı
    if ((!email && !phone) || !listId) {
      return res.status(400).json({ error: 'email veya phone ve listId zorunludur' });
    }
    
    // Liste var mı kontrol et
    const list = await listRepo.findOne({ where: { id: parseInt(listId) } });
    if (!list) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
    }
    
    // Aynı listede aynı email/phone var mı?
    if (email) {
      const existingEmail = await subscriberRepo.findOne({
        where: { email, listId: parseInt(listId) }
      });
      if (existingEmail) {
        return res.status(409).json({ error: 'Bu email zaten bu listede mevcut' });
      }
    }
    
    if (phone) {
      const existingPhone = await subscriberRepo.findOne({
        where: { phone, listId: parseInt(listId) }
      });
      if (existingPhone) {
        return res.status(409).json({ error: 'Bu telefon zaten bu listede mevcut' });
      }
    }
    
    const subscriber = subscriberRepo.create({
      email: email || null,
      firstName,
      lastName,
      phone: phone || null,
      city: city || null,
      customFields: customFields ? JSON.stringify(customFields) : null,
      listId: parseInt(listId),
      unsubscribeToken: generateUnsubscribeToken()
    });
    
    await subscriberRepo.save(subscriber);
    
    // Liste abone sayısını güncelle
    list.subscriberCount = (list.subscriberCount || 0) + 1;
    await listRepo.save(list);
    
    logger.info(`✅ Yeni abone eklendi: ${email || phone} -> Liste: ${list.name}`);
    res.status(201).json({ success: true, data: subscriber });
  } catch (error) {
    logger.error('Abone ekleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/subscribers/bulk - Toplu abone ekle (CSV/JSON)
router.post('/subscribers/bulk', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailList } = require('../models/EmailList');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const { subscribers, listId } = req.body;
    
    if (!Array.isArray(subscribers) || !listId) {
      return res.status(400).json({ error: 'subscribers array ve listId zorunludur' });
    }
    
    // Liste var mı kontrol et
    const list = await listRepo.findOne({ where: { id: parseInt(listId) } });
    if (!list) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
    }
    
    const results = { added: 0, skipped: 0, errors: [] };
    
    for (const sub of subscribers) {
      try {
        if (!sub.email) {
          results.skipped++;
          continue;
        }
        
        // Aynı listede aynı email var mı?
        const existing = await subscriberRepo.findOne({
          where: { email: sub.email, listId: parseInt(listId) }
        });
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        const subscriber = subscriberRepo.create({
          email: sub.email,
          firstName: sub.firstName || sub.first_name || sub.ad || sub.name,
          lastName: sub.lastName || sub.last_name || sub.soyad,
          phone: sub.phone || sub.telefon || sub.tel,
          city: sub.city || sub.sehir || sub.şehir || sub.il,
          customFields: sub.customFields ? JSON.stringify(sub.customFields) : null,
          listId: parseInt(listId),
          unsubscribeToken: generateUnsubscribeToken()
        });
        
        await subscriberRepo.save(subscriber);
        results.added++;
      } catch (err) {
        results.errors.push({ email: sub.email, error: err.message });
      }
    }
    
    // Liste abone sayısını güncelle
    list.subscriberCount = (list.subscriberCount || 0) + results.added;
    await listRepo.save(list);
    
    logger.info(`✅ Toplu abone ekleme tamamlandı: ${results.added} eklendi, ${results.skipped} atlandı`);
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Toplu abone ekleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/email/subscribers/:id - Abone sil
router.delete('/subscribers/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailList } = require('../models/EmailList');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const subscriber = await subscriberRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Abone bulunamadı' });
    }
    
    const listId = subscriber.listId;
    await subscriberRepo.delete(parseInt(req.params.id));
    
    // Liste abone sayısını güncelle
    const list = await listRepo.findOne({ where: { id: listId } });
    if (list) {
      list.subscriberCount = Math.max(0, (list.subscriberCount || 0) - 1);
      await listRepo.save(list);
    }
    
    logger.info(`🗑️ Abone silindi: ${subscriber.email}`);
    res.json({ success: true, message: 'Abone silindi' });
  } catch (error) {
    logger.error('Abone silme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/subscribers/parse-xls - XLS/XLSX dosyasını parse et (sütun eşleştirme destekli)
router.post('/subscribers/parse-xls', express.raw({ type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'], limit: '10mb' }), async (req, res) => {
  try {
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    // XLS/XLSX dosyasını parse et
    const workbook = XLSX.read(req.body, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON'a çevir
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Dosyada veri bulunamadı' });
    }

    // Orijinal header'ları al
    const originalHeaders = Object.keys(rawData[0] || {});

    // Header mapping önerileri (Türkçe ve İngilizce destekli)
    const headerSuggestions = {
      // Ad Soyad (fullName)
      'ad soyad': 'fullName',
      'adsoyad': 'fullName',
      'ad-soyad': 'fullName',
      'isim soyisim': 'fullName',
      'fullname': 'fullName',
      'full_name': 'fullName',
      'full name': 'fullName',
      'name': 'fullName',
      'ad': 'fullName',
      'isim': 'fullName',
      'contact': 'fullName',
      'contact name': 'fullName',
      'main contact': 'fullName',
      'lead title': 'fullName',
      'müşteri': 'fullName',
      'hasta': 'fullName',
      // Email
      'email': 'email',
      'e-mail': 'email',
      'e-posta': 'email',
      'eposta': 'email',
      'mail': 'email',
      // Telefon
      'telefon': 'phone',
      'tel': 'phone',
      'phone': 'phone',
      'gsm': 'phone',
      'cep': 'phone',
      'mobile': 'phone',
      'telefon no': 'phone',
      'telefon numarası': 'phone',
      // Şehir
      'şehir': 'city',
      'sehir': 'city',
      'city': 'city',
      'il': 'city',
      'province': 'city',
      'konum': 'city',
      'pipeline': 'city',
      // Etkinlik Tarihi
      'tarih': 'eventDate',
      'date': 'eventDate',
      'event date': 'eventDate',
      'event_date': 'eventDate',
      'etkinlik tarihi': 'eventDate',
      'randevu tarihi': 'eventDate',
      'appointment date': 'eventDate',
      // Etkinlik Saati
      'saat': 'eventTime',
      'time': 'eventTime',
      'event time': 'eventTime',
      'event_time': 'eventTime',
      'etkinlik saati': 'eventTime',
      'randevu saati': 'eventTime',
      'appointment time': 'eventTime'
    };

    // Her header için öneri oluştur
    const suggestedMapping = {};
    for (const header of originalHeaders) {
      const normalizedHeader = header.toString().toLowerCase().trim();
      suggestedMapping[header] = headerSuggestions[normalizedHeader] || 'skip';
    }

    // Ham veriyi önizleme için döndür (ilk 100 satır)
    const previewData = rawData.slice(0, 100).map(row => {
      const rowData = {};
      for (const header of originalHeaders) {
        rowData[header] = row[header] ? row[header].toString() : '';
      }
      return rowData;
    });

    logger.info(`📊 XLS parse edildi: ${rawData.length} kayıt, ${originalHeaders.length} sütun bulundu`);
    
    res.json({ 
      success: true, 
      headers: originalHeaders,
      suggestedMapping,
      previewData,
      totalRows: rawData.length
    });
  } catch (error) {
    logger.error('XLS parse hatası:', error);
    res.status(500).json({ error: 'Dosya işlenirken hata oluştu: ' + error.message });
  }
});

// POST /api/email/subscribers/apply-mapping - Eşleştirme ile veriyi dönüştür
router.post('/subscribers/apply-mapping', express.raw({ type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'], limit: '10mb' }), async (req, res) => {
  try {
    // Mapping bilgisi header'dan alınacak
    const mappingJson = req.headers['x-column-mapping'];
    if (!mappingJson) {
      return res.status(400).json({ error: 'Sütun eşleştirmesi gerekli' });
    }
    
    const columnMapping = JSON.parse(decodeURIComponent(mappingJson));
    
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    // XLS/XLSX dosyasını parse et
    const workbook = XLSX.read(req.body, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Veriyi kullanıcının eşleştirmesine göre dönüştür
    const subscribers = rawData.map(row => {
      const normalized = {};
      
      for (const [originalHeader, targetField] of Object.entries(columnMapping)) {
        if (targetField && targetField !== 'skip' && row[originalHeader] !== undefined) {
          normalized[targetField] = row[originalHeader] ? row[originalHeader].toString().trim() : '';
        }
      }
      
      // Telefon numarasını formatla
      if (normalized.phone) {
        let phone = normalized.phone.replace(/\s/g, '').replace(/-/g, '');
        if (phone.startsWith('0')) {
          phone = '+9' + phone;
        } else if (phone.startsWith('5') && phone.length === 10) {
          phone = '+90' + phone;
        } else if (!phone.startsWith('+') && phone.length > 0) {
          phone = '+' + phone;
        }
        normalized.phone = phone;
      }
      
      return normalized;
    }).filter(sub => sub.phone || sub.email);

    logger.info(`📊 XLS eşleştirme uygulandı: ${subscribers.length} geçerli kayıt`);
    
    res.json({ 
      success: true, 
      data: subscribers,
      total: subscribers.length
    });
  } catch (error) {
    logger.error('XLS mapping hatası:', error);
    res.status(500).json({ error: 'Veri dönüştürülürken hata oluştu: ' + error.message });
  }
});

// GET /api/email/lists/:id/phones - Listedeki telefon numaralarını getir (Voice Dashboard için)
router.get('/lists/:id/phones', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailList } = require('../models/EmailList');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const list = await listRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!list) {
      return res.status(404).json({ error: 'Liste bulunamadı' });
    }
    
    // Aktif ve telefon numarası olan aboneleri getir
    const subscribers = await subscriberRepo.find({
      where: { listId: parseInt(req.params.id), status: 'active' },
      select: ['id', 'firstName', 'lastName', 'phone', 'city']
    });
    
    // Sadece geçerli telefon numarası olanları filtrele
    const phonesData = subscribers
      .filter(sub => sub.phone && sub.phone.length >= 10)
      .map(sub => ({
        phone: sub.phone,
        name: `${sub.firstName || ''} ${sub.lastName || ''}`.trim() || 'İsimsiz',
        city: sub.city || ''
      }));
    
    res.json({
      success: true,
      data: phonesData,
      list: { id: list.id, name: list.name },
      total: phonesData.length
    });
  } catch (error) {
    logger.error('Liste telefon numaraları hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CAMPAIGN ROUTES ====================

// GET /api/email/campaigns - Kampanyaları listele
router.get('/campaigns', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailCampaign } = require('../models/EmailCampaign');
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    
    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    
    const [campaigns, total] = await campaignRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: campaigns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Kampanya listesi hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/email/campaigns/:id - Tek kampanya getir
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailCampaign } = require('../models/EmailCampaign');
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    
    const campaign = await campaignRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Kampanya bulunamadı' });
    }
    
    res.json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Kampanya getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/email/campaigns - Yeni kampanya oluştur
router.post('/campaigns', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailCampaign } = require('../models/EmailCampaign');
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    
    const { 
      name, 
      templateId, 
      listIds, 
      subject, 
      fromName, 
      fromEmail, 
      replyTo,
      scheduledAt,
      rateLimitSettings 
    } = req.body;
    
    if (!name || !templateId || !listIds) {
      return res.status(400).json({ error: 'name, templateId ve listIds zorunludur' });
    }
    
    const campaign = campaignRepo.create({
      name,
      templateId,
      listIds: Array.isArray(listIds) ? listIds.join(',') : listIds,
      subject,
      fromName: fromName || process.env.BULK_EMAIL_FROM_NAME || 'Happy Smile Clinics',
      fromEmail: fromEmail || process.env.BULK_EMAIL_USER,
      replyTo,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      rateLimitSettings: rateLimitSettings ? JSON.stringify(rateLimitSettings) : null
    });
    
    await campaignRepo.save(campaign);
    
    logger.info(`✅ Yeni kampanya oluşturuldu: ${name}`);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Kampanya oluşturma hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/email/campaigns/:id - Kampanya güncelle
router.put('/campaigns/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailCampaign } = require('../models/EmailCampaign');
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    
    const campaign = await campaignRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Kampanya bulunamadı' });
    }
    
    // Sadece draft kampanyalar güncellenebilir
    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Sadece taslak kampanyalar güncellenebilir' });
    }
    
    const { name, templateId, listIds, subject, fromName, fromEmail, replyTo, scheduledAt } = req.body;
    
    if (name) campaign.name = name;
    if (templateId) campaign.templateId = templateId;
    if (listIds) campaign.listIds = Array.isArray(listIds) ? listIds.join(',') : listIds;
    if (subject !== undefined) campaign.subject = subject;
    if (fromName !== undefined) campaign.fromName = fromName;
    if (fromEmail !== undefined) campaign.fromEmail = fromEmail;
    if (replyTo !== undefined) campaign.replyTo = replyTo;
    if (scheduledAt !== undefined) campaign.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    
    await campaignRepo.save(campaign);
    
    logger.info(`✅ Kampanya güncellendi: ${campaign.name}`);
    res.json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Kampanya güncelleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/email/campaigns/:id - Kampanya sil
router.delete('/campaigns/:id', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailCampaign } = require('../models/EmailCampaign');
    const { EmailSend } = require('../models/EmailSend');
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    const sendRepo = AppDataSource.getRepository(EmailSend);
    
    const campaign = await campaignRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Kampanya bulunamadı' });
    }
    
    // Gönderim kayıtlarını sil
    await sendRepo.delete({ campaignId: parseInt(req.params.id) });
    
    await campaignRepo.delete(parseInt(req.params.id));
    
    logger.info(`🗑️ Kampanya silindi: ${campaign.name}`);
    res.json({ success: true, message: 'Kampanya silindi' });
  } catch (error) {
    logger.error('Kampanya silme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEND CAMPAIGN ====================

// POST /api/email/campaigns/:id/send - Kampanyayı gönder
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const transport = getTransporter();
    if (!transport) {
      return res.status(503).json({ error: 'Email servisi yapılandırılmamış' });
    }
    
    const { EmailCampaign } = require('../models/EmailCampaign');
    const { EmailTemplate } = require('../models/EmailTemplate');
    const { EmailList } = require('../models/EmailList');
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailSend } = require('../models/EmailSend');
    
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    const templateRepo = AppDataSource.getRepository(EmailTemplate);
    const listRepo = AppDataSource.getRepository(EmailList);
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const sendRepo = AppDataSource.getRepository(EmailSend);
    
    const campaign = await campaignRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Kampanya bulunamadı' });
    }
    
    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Sadece taslak kampanyalar gönderilebilir' });
    }
    
    // Template'i al
    const template = await templateRepo.findOne({ where: { id: campaign.templateId } });
    if (!template) {
      return res.status(404).json({ error: 'Template bulunamadı' });
    }
    
    // Listelerdeki aboneleri al
    const listIds = campaign.listIds.split(',').map(id => parseInt(id.trim()));
    const subscribers = await subscriberRepo.find({
      where: listIds.map(id => ({ listId: id, status: 'active' }))
    });
    
    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'Aktif abone bulunamadı' });
    }
    
    // Rate limit kontrolü
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit aşıldı', 
        reason: rateCheck.reason,
        retryAfter: rateCheck.retryAfter 
      });
    }
    
    // Kampanyayı güncelle
    campaign.status = 'sending';
    campaign.startedAt = new Date();
    campaign.totalRecipients = subscribers.length;
    await campaignRepo.save(campaign);
    
    // Response'u hemen dön, gönderim arka planda devam etsin
    res.json({ 
      success: true, 
      message: 'Kampanya gönderimi başlatıldı',
      totalRecipients: subscribers.length 
    });
    
    // Arka planda email gönderimi
    const unsubscribeBaseUrl = process.env.FRONTEND_URL || process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
    
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    
    for (const subscriber of subscribers) {
      try {
        // Rate limit kontrolü
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
          logger.warn(`⚠️ Rate limit - Bekleniyor: ${rateCheck.retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, 60000)); // 1 dakika bekle
        }
        
        // Unsubscribe URL
        const unsubscribeUrl = `${unsubscribeBaseUrl}/api/email/unsubscribe/${subscriber.unsubscribeToken}`;
        
        // Template değişkenlerini hazırla
        const variables = {
          email: subscriber.email,
          firstName: subscriber.firstName || '',
          lastName: subscriber.lastName || '',
          name: `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim() || 'Değerli Müşterimiz',
          phone: subscriber.phone || '',
          unsubscribeUrl
        };
        
        // Custom fields varsa ekle
        if (subscriber.customFields) {
          try {
            const custom = JSON.parse(subscriber.customFields);
            Object.assign(variables, custom);
          } catch (e) {}
        }
        
        // Template'i işle
        let htmlContent = replaceTemplateVariables(template.htmlContent, variables);
        htmlContent = addUnsubscribeLink(htmlContent, unsubscribeUrl);
        
        const textContent = template.textContent 
          ? replaceTemplateVariables(template.textContent, variables)
          : null;
        
        const subject = campaign.subject 
          ? replaceTemplateVariables(campaign.subject, variables)
          : replaceTemplateVariables(template.subject, variables);
        
        // Email gönder
        const mailOptions = {
          from: `"${campaign.fromName || 'Happy Smile Clinics'}" <${campaign.fromEmail || process.env.BULK_EMAIL_USER}>`,
          to: subscriber.email,
          subject,
          html: htmlContent,
          text: textContent,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'X-Campaign-ID': campaign.id.toString()
          }
        };
        
        if (campaign.replyTo) {
          mailOptions.replyTo = campaign.replyTo;
        }
        
        const info = await transport.sendMail(mailOptions);
        
        // Gönderim kaydı oluştur
        const send = sendRepo.create({
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          toEmail: subscriber.email,
          status: 'sent',
          messageId: info.messageId,
          sentAt: new Date()
        });
        await sendRepo.save(send);
        
        // Subscriber güncelle
        subscriber.emailsSent = (subscriber.emailsSent || 0) + 1;
        subscriber.lastEmailAt = new Date();
        await subscriberRepo.save(subscriber);
        
        updateRateLimit();
        sentCount++;
        
        logger.info(`📧 Email gönderildi: ${subscriber.email} (${sentCount}/${subscribers.length})`);
        
        // Emailler arası bekleme
        await new Promise(resolve => setTimeout(resolve, RATE_LIMITS.delayBetweenEmails));
        
      } catch (error) {
        failedCount++;
        errors.push({ email: subscriber.email, error: error.message });
        logger.error(`❌ Email gönderim hatası: ${subscriber.email} - ${error.message}`);
        
        // Gönderim kaydı oluştur (hata)
        const send = sendRepo.create({
          campaignId: campaign.id,
          subscriberId: subscriber.id,
          toEmail: subscriber.email,
          status: 'failed',
          errorMessage: error.message,
          failedAt: new Date()
        });
        await sendRepo.save(send);
      }
    }
    
    // Kampanyayı tamamla
    campaign.status = 'sent';
    campaign.completedAt = new Date();
    campaign.sentCount = sentCount;
    campaign.bouncedCount = failedCount;
    if (errors.length > 0) {
      campaign.errorLogs = JSON.stringify(errors.slice(0, 100)); // Max 100 hata kaydet
    }
    await campaignRepo.save(campaign);
    
    logger.info(`✅ Kampanya tamamlandı: ${campaign.name} - ${sentCount} gönderildi, ${failedCount} başarısız`);
    
  } catch (error) {
    logger.error('Kampanya gönderim hatası:', error);
    // Eğer response henüz gönderilmemişse
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// ==================== UNSUBSCRIBE ====================

// GET /api/email/unsubscribe/:token - Abonelikten çık
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).send('Servis geçici olarak kullanılamıyor');
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailList } = require('../models/EmailList');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const subscriber = await subscriberRepo.findOne({ 
      where: { unsubscribeToken: req.params.token } 
    });
    
    if (!subscriber) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Abonelik</title><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>⚠️ Geçersiz veya süresi dolmuş link</h2>
          <p>Bu abonelik iptal linki geçersiz veya daha önce kullanılmış olabilir.</p>
        </body>
        </html>
      `);
    }
    
    // Aboneliği iptal et
    subscriber.status = 'unsubscribed';
    subscriber.unsubscribedAt = new Date();
    await subscriberRepo.save(subscriber);
    
    // Liste abone sayısını güncelle
    const list = await listRepo.findOne({ where: { id: subscriber.listId } });
    if (list) {
      list.subscriberCount = Math.max(0, (list.subscriberCount || 0) - 1);
      await listRepo.save(list);
    }
    
    logger.info(`📭 Abonelik iptal edildi: ${subscriber.email}`);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Abonelik İptal Edildi</title><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>✅ Aboneliğiniz başarıyla iptal edildi</h2>
        <p>Artık ${subscriber.email} adresine email göndermeyeceğiz.</p>
        <p style="color: #666; margin-top: 30px;">Happy Smile Clinics</p>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Abonelik iptal hatası:', error);
    res.status(500).send('Bir hata oluştu');
  }
});

// ==================== STATS ====================

// GET /api/email/stats - Genel email istatistikleri
router.get('/stats', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailTemplate } = require('../models/EmailTemplate');
    const { EmailList } = require('../models/EmailList');
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailCampaign } = require('../models/EmailCampaign');
    
    const templateRepo = AppDataSource.getRepository(EmailTemplate);
    const listRepo = AppDataSource.getRepository(EmailList);
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    
    const [templateCount, listCount, subscriberCount, campaignCount] = await Promise.all([
      templateRepo.count(),
      listRepo.count(),
      subscriberRepo.count({ where: { status: 'active' } }),
      campaignRepo.count()
    ]);
    
    // Son kampanyalar
    const recentCampaigns = await campaignRepo.find({
      order: { createdAt: 'DESC' },
      take: 5
    });
    
    // Rate limit durumu
    const today = new Date().toDateString();
    if (rateLimitStore.dailyResetDate !== today) {
      rateLimitStore.dailyEmailCount = 0;
      rateLimitStore.dailyResetDate = today;
    }
    
    res.json({
      success: true,
      data: {
        templates: templateCount,
        lists: listCount,
        activeSubscribers: subscriberCount,
        campaigns: campaignCount,
        recentCampaigns,
        rateLimit: {
          dailyUsed: rateLimitStore.dailyEmailCount,
          dailyLimit: RATE_LIMITS.dailyLimit,
          remaining: RATE_LIMITS.dailyLimit - rateLimitStore.dailyEmailCount
        }
      }
    });
  } catch (error) {
    logger.error('Email stats hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/email/campaigns/:id/stats - Kampanya detaylı istatistikleri
router.get('/campaigns/:id/stats', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailCampaign } = require('../models/EmailCampaign');
    const { EmailSend } = require('../models/EmailSend');
    const campaignRepo = AppDataSource.getRepository(EmailCampaign);
    const sendRepo = AppDataSource.getRepository(EmailSend);
    
    const campaign = await campaignRepo.findOne({ where: { id: parseInt(req.params.id) } });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Kampanya bulunamadı' });
    }
    
    // Gönderim istatistikleri
    const sends = await sendRepo.find({ where: { campaignId: campaign.id } });
    
    const stats = {
      total: sends.length,
      sent: sends.filter(s => s.status === 'sent' || s.status === 'delivered').length,
      delivered: sends.filter(s => s.status === 'delivered').length,
      opened: sends.filter(s => s.status === 'opened' || s.openedAt).length,
      clicked: sends.filter(s => s.status === 'clicked' || s.clickedAt).length,
      bounced: sends.filter(s => s.status === 'bounced').length,
      failed: sends.filter(s => s.status === 'failed').length
    };
    
    // Yüzdeleri hesapla
    if (stats.sent > 0) {
      stats.deliveryRate = ((stats.delivered / stats.sent) * 100).toFixed(1);
      stats.openRate = ((stats.opened / stats.sent) * 100).toFixed(1);
      stats.clickRate = ((stats.clicked / stats.sent) * 100).toFixed(1);
      stats.bounceRate = ((stats.bounced / stats.sent) * 100).toFixed(1);
    }
    
    res.json({
      success: true,
      data: {
        campaign,
        stats,
        recentErrors: campaign.errorLogs ? JSON.parse(campaign.errorLogs).slice(0, 10) : []
      }
    });
  } catch (error) {
    logger.error('Kampanya stats hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEST EMAIL ====================

// POST /api/email/test - Test email gönder
router.post('/test', async (req, res) => {
  try {
    const transport = getTransporter();
    if (!transport) {
      return res.status(503).json({ error: 'Email servisi yapılandırılmamış. BULK_EMAIL_USER ve BULK_EMAIL_PASS env değişkenlerini kontrol edin.' });
    }
    
    const { to, subject, html, text } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'to (alıcı email) zorunludur' });
    }
    
    const mailOptions = {
      from: `"${process.env.BULK_EMAIL_FROM_NAME || 'Happy Smile Clinics'}" <${process.env.BULK_EMAIL_USER}>`,
      to,
      subject: subject || 'Test Email - Happy Smile Clinics',
      html: html || '<h1>Test Email</h1><p>Bu bir test emailidir.</p>',
      text: text || 'Bu bir test emailidir.'
    };
    
    const info = await transport.sendMail(mailOptions);
    
    logger.info(`✅ Test email gönderildi: ${to}`);
    res.json({ 
      success: true, 
      message: 'Test email gönderildi',
      messageId: info.messageId 
    });
  } catch (error) {
    logger.error('Test email hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

