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

// Database initialization middleware
async function ensureDatabase(req, res, next) {
  try {
    const { AppDataSource, initializeDatabase } = require('../config/database');
    
    if (!AppDataSource) {
      logger.error('AppDataSource is null');
      return res.status(503).json({ error: 'Database not configured' });
    }
    
    if (!AppDataSource.isInitialized) {
      logger.info('🔄 Database initializing...');
      const success = await initializeDatabase();
      if (!success) {
        return res.status(503).json({ error: 'Database initialization failed' });
      }
      logger.info('✅ Database initialized successfully');
    }
    
    next();
  } catch (error) {
    logger.error('Database middleware error:', error);
    return res.status(503).json({ error: 'Database error: ' + error.message });
  }
}

// Tüm email route'larına database middleware uygula
router.use(ensureDatabase);

// Rate limit ayarları (Google Workspace limitleri)
const RATE_LIMITS = {
  emailsPerMinute: parseInt(process.env.BULK_EMAIL_RATE_PER_MINUTE || '30'),
  dailyLimit: parseInt(process.env.BULK_EMAIL_DAILY_LIMIT || '2000'),
  delayBetweenEmails: parseInt(process.env.BULK_EMAIL_DELAY_MS || '500'), // 0.5 saniye (Vercel timeout için optimize)
  batchSize: parseInt(process.env.BULK_EMAIL_BATCH_SIZE || '50') // Batch başına email sayısı
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

// Helper: Confirmation token oluştur
function generateConfirmationToken() {
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
    
    const { name, description, city, cityDisplay, eventDates, eventDay1, eventDay2, location, timeSlots } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'name zorunludur' });
    }
    
    // Varsayılan saat dilimleri
    const defaultTimeSlots = ['09:00-12:30', '12:30-15:00', '15:00-17:30'];
    
    const list = listRepo.create({
      name,
      description,
      city: city || null,
      cityDisplay: cityDisplay || null,
      eventDay1: eventDay1 || null,
      eventDay2: eventDay2 || null,
      eventDates: eventDates || (eventDay1 && eventDay2 ? `${eventDay1} - ${eventDay2}` : null),
      location: location || null,
      timeSlots: JSON.stringify(timeSlots || defaultTimeSlots)
    });
    
    await listRepo.save(list);
    
    logger.info(`✅ Yeni email listesi oluşturuldu: ${name} (${city || 'Şehir yok'})`);
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
    
    const { name, description, city, cityDisplay, eventDates, eventDay1, eventDay2, location, timeSlots, isActive } = req.body;
    
    if (name) list.name = name;
    if (description !== undefined) list.description = description;
    if (city !== undefined) list.city = city;
    if (cityDisplay !== undefined) list.cityDisplay = cityDisplay;
    if (eventDay1 !== undefined) list.eventDay1 = eventDay1;
    if (eventDay2 !== undefined) list.eventDay2 = eventDay2;
    if (eventDates !== undefined) list.eventDates = eventDates;
    // eventDay1 ve eventDay2 varsa eventDates'i otomatik oluştur
    if (eventDay1 && eventDay2 && !eventDates) {
      list.eventDates = `${eventDay1} - ${eventDay2}`;
    }
    if (location !== undefined) list.location = location;
    if (timeSlots !== undefined) list.timeSlots = JSON.stringify(timeSlots);
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
    
    const { email, firstName, lastName, phone, city, stage, eventDate, eventTime, customFields, listId } = req.body;
    
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
      stage: stage || null,
      eventDate: eventDate || null,
      eventTime: eventTime || null,
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
        // Email veya telefon olmalı
        if (!sub.email && !sub.phone) {
          results.skipped++;
          continue;
        }
        
        // Aynı listede aynı email veya telefon var mı?
        let existing = null;
        if (sub.email) {
          existing = await subscriberRepo.findOne({
            where: { email: sub.email, listId: parseInt(listId) }
          });
        }
        if (!existing && sub.phone) {
          existing = await subscriberRepo.findOne({
            where: { phone: sub.phone, listId: parseInt(listId) }
          });
        }
        
        if (existing) {
          results.skipped++;
          continue;
        }
        
        const subscriber = subscriberRepo.create({
          email: sub.email || null,
          fullName: sub.fullName || sub.full_name || sub.name || sub.ad_soyad || null,
          firstName: sub.firstName || sub.first_name || sub.ad || null,
          lastName: sub.lastName || sub.last_name || sub.soyad || null,
          phone: sub.phone || sub.telefon || sub.tel || null,
          city: sub.city || sub.sehir || sub.şehir || sub.il || null,
          stage: sub.stage || sub.aşama || sub.durum || null,
          eventDate: sub.eventDate || sub.event_date || sub.tarih || null,
          eventTime: sub.eventTime || sub.event_time || sub.saat || null,
          customFields: sub.customFields ? JSON.stringify(sub.customFields) : null,
          listId: parseInt(listId),
          unsubscribeToken: generateUnsubscribeToken()
        });
        
        await subscriberRepo.save(subscriber);
        results.added++;
      } catch (err) {
        results.errors.push({ email: sub.email || sub.phone, error: err.message });
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

// PUT /api/email/subscribers/:id - Abone güncelle
router.put('/subscribers/:id', async (req, res) => {
  try {
    const subscriberId = parseInt(req.params.id);
    if (isNaN(subscriberId) || subscriberId <= 0) {
      return res.status(400).json({ error: 'Geçersiz abone ID' });
    }
    
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    
    const subscriber = await subscriberRepo.findOne({ where: { id: subscriberId } });
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Abone bulunamadı' });
    }
    
    const { fullName, firstName, lastName, email, phone, city, stage, eventDate, eventTime, status } = req.body;
    
    // Alanları güncelle
    if (fullName !== undefined) subscriber.fullName = fullName || null;
    if (firstName !== undefined) subscriber.firstName = firstName || null;
    if (lastName !== undefined) subscriber.lastName = lastName || null;
    if (email !== undefined) subscriber.email = email || null;
    if (phone !== undefined) subscriber.phone = phone || null;
    if (city !== undefined) subscriber.city = city || null;
    if (stage !== undefined) subscriber.stage = stage || null;
    if (eventDate !== undefined) subscriber.eventDate = eventDate || null;
    if (eventTime !== undefined) subscriber.eventTime = eventTime || null;
    if (status !== undefined) subscriber.status = status;
    
    await subscriberRepo.save(subscriber);
    
    logger.info(`✅ Abone güncellendi: ID ${subscriberId}`);
    res.json({ success: true, data: subscriber });
  } catch (error) {
    logger.error('Abone güncelleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/email/subscribers/:id - Abone sil
router.delete('/subscribers/:id', async (req, res) => {
  try {
    const subscriberId = parseInt(req.params.id);
    if (isNaN(subscriberId) || subscriberId <= 0) {
      return res.status(400).json({ error: 'Geçersiz abone ID' });
    }
    
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailList } = require('../models/EmailList');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const subscriber = await subscriberRepo.findOne({ where: { id: subscriberId } });
    
    if (!subscriber) {
      return res.status(404).json({ error: 'Abone bulunamadı' });
    }
    
    const listId = subscriber.listId;
    await subscriberRepo.delete(subscriberId);
    
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

// DELETE /api/email/subscribers/bulk - Toplu abone sil
router.delete('/subscribers/bulk', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const { EmailList } = require('../models/EmailList');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    const listRepo = AppDataSource.getRepository(EmailList);
    
    const { ids, listId } = req.body;
    
    if (!ids && !listId) {
      return res.status(400).json({ error: 'ids array veya listId gerekli' });
    }
    
    let deletedCount = 0;
    
    if (listId) {
      const parsedListId = parseInt(listId);
      if (isNaN(parsedListId) || parsedListId <= 0) {
        return res.status(400).json({ error: 'Geçersiz liste ID' });
      }
      
      // Listedeki tüm aboneleri sil
      const result = await subscriberRepo.delete({ listId: parsedListId });
      deletedCount = result.affected || 0;
      
      // Liste abone sayısını sıfırla
      const list = await listRepo.findOne({ where: { id: parsedListId } });
      if (list) {
        list.subscriberCount = 0;
        await listRepo.save(list);
      }
      
      logger.info(`🗑️ Listeden toplu silme: ${deletedCount} abone silindi (Liste ID: ${listId})`);
    } else if (Array.isArray(ids) && ids.length > 0) {
      // Geçersiz ID'leri filtrele
      const validIds = ids
        .map(id => parseInt(id))
        .filter(id => !isNaN(id) && id > 0);
      
      if (validIds.length === 0) {
        return res.status(400).json({ error: 'Geçerli abone ID bulunamadı' });
      }
      
      // Seçili aboneleri sil
      for (const subscriberId of validIds) {
        const subscriber = await subscriberRepo.findOne({ where: { id: subscriberId } });
        if (subscriber) {
          const subListId = subscriber.listId;
          await subscriberRepo.delete(subscriberId);
          deletedCount++;
          
          // Liste abone sayısını güncelle
          const list = await listRepo.findOne({ where: { id: subListId } });
          if (list) {
            list.subscriberCount = Math.max(0, (list.subscriberCount || 0) - 1);
            await listRepo.save(list);
          }
        }
      }
      
      logger.info(`🗑️ Toplu silme: ${deletedCount} abone silindi`);
    }
    
    res.json({ success: true, deletedCount, message: `${deletedCount} abone silindi` });
  } catch (error) {
    logger.error('Toplu silme hatası:', error);
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
      'appointment time': 'eventTime',
      // Stage (Aşama)
      'stage': 'stage',
      'aşama': 'stage',
      'asama': 'stage',
      'lead stage': 'stage',
      'durum': 'stage',
      'status': 'stage'
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

// POST /api/email/subscribers/apply-mapping - Eşleştirme ile veriyi dönüştür (JSON body)
router.post('/subscribers/apply-mapping', express.json({ limit: '50mb' }), async (req, res) => {
  try {
    const { fileBase64, columnMapping } = req.body;
    
    if (!columnMapping) {
      return res.status(400).json({ error: 'Sütun eşleştirmesi gerekli' });
    }
    
    if (!fileBase64) {
      return res.status(400).json({ error: 'Dosya verisi gerekli' });
    }

    // Base64'ten buffer'a çevir
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // XLS/XLSX dosyasını parse et
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
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
        // Önce tek tırnak ve gereksiz karakterleri temizle
        let phone = normalized.phone
          .replace(/'/g, '')  // Tek tırnak kaldır
          .replace(/"/g, '')  // Çift tırnak kaldır
          .replace(/\s/g, '') // Boşluk kaldır
          .replace(/-/g, '')  // Tire kaldır
          .replace(/\(/g, '') // Parantez kaldır
          .replace(/\)/g, '');
        
        // + işaretinden sonraki tırnağı da temizle
        phone = phone.replace(/^\+'+/, '+').replace(/^'+\+/, '+');
        
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
    
    // Vercel serverless'ta senkron gönderim (response en sonda)
    const unsubscribeBaseUrl = process.env.API_BASE_URL || 'https://happysmileclinics.net';
    
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
        // Confirmation token oluştur ve kaydet
        if (!subscriber.confirmationToken) {
          subscriber.confirmationToken = generateConfirmationToken();
          subscriber.confirmationStatus = 'pending';
          await subscriberRepo.save(subscriber);
        }
        
        // Confirm URL oluştur
        const baseUrl = process.env.API_BASE_URL || 'https://happysmileclinics.net';
        const confirmUrl = `${baseUrl}/api/email/confirm/${subscriber.confirmationToken}`;
        
        // Liste bilgilerini al
        const subscriberList = await listRepo.findOne({ where: { id: subscriber.listId } });
        
        // Tüm değişkenleri hazırla
        const fullName = subscriber.fullName || `${subscriber.firstName || ''} ${subscriber.lastName || ''}`.trim();
        const variables = {
          email: subscriber.email || '',
          firstName: subscriber.firstName || '',
          lastName: subscriber.lastName || '',
          fullName: fullName || 'Değerli Müşterimiz',
          name: fullName || 'Değerli Müşterimiz',
          phone: subscriber.phone || '',
          city: subscriber.city || subscriberList?.city || '',
          stage: subscriber.stage || '',
          eventDate: subscriber.eventDate || subscriberList?.eventDates || '',
          eventTime: subscriber.eventTime || '',
          unsubscribeUrl,
          confirmUrl,
          // Liste bazlı değişkenler
          listCity: subscriberList?.city || '',
          listCityDisplay: subscriberList?.cityDisplay || subscriberList?.city || '',
          listEventDates: subscriberList?.eventDates || '',
          listLocation: subscriberList?.location || '',
          listName: subscriberList?.name || ''
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
    
    // Vercel serverless: Response en sonda dönmeli
    res.json({ 
      success: true, 
      message: `Kampanya gönderildi: ${sentCount} başarılı, ${failedCount} başarısız`,
      totalRecipients: subscribers.length,
      sentCount,
      failedCount
    });
    
  } catch (error) {
    logger.error('Kampanya gönderim hatası:', error);
    res.status(500).json({ error: error.message });
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

// ==================== RANDEVU ONAY SİSTEMİ ====================

// GET /api/email/confirm/:token - Randevu onay sayfası
router.get('/confirm/:token', async (req, res) => {
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
      where: { confirmationToken: req.params.token } 
    });
    
    if (!subscriber) {
      return res.send(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Link wygasł</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #0f172a; color: #e5e7eb; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #020617; border-radius: 16px; padding: 40px; max-width: 500px; text-align: center; border: 1px solid rgba(148,163,184,0.25); }
            h2 { color: #f59e0b; margin-bottom: 16px; }
            p { color: #9ca3af; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚠️ Link wygasł lub jest nieprawidłowy</h2>
            <p>Ten link potwierdzenia wizyty jest nieprawidłowy lub już został użyty. Jeśli potrzebujesz pomocy, skontaktuj się z nami.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    // Liste bilgilerini al
    const list = await listRepo.findOne({ where: { id: subscriber.listId } });
    const timeSlots = list?.timeSlots ? JSON.parse(list.timeSlots) : ['09:00-12:30', '12:30-15:00', '15:00-17:30'];
    
    // Durum kontrolleri
    const status = subscriber.confirmationStatus || 'pending';
    const isReschedule = req.query.reschedule === 'true';
    
    // Durum badge'leri
    const statusBadges = {
      pending: { icon: '⏳', text: 'Oczekuje na potwierdzenie', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
      confirmed: { icon: '✅', text: 'Potwierdzona', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
      cancelled: { icon: '❌', text: 'Anulowana', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
      rescheduled: { icon: '📅', text: 'Zmiana terminu', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' }
    };
    const currentStatus = statusBadges[status] || statusBadges.pending;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Moja wizyta - Happy Smile Clinics</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #0f172a; color: #e5e7eb; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #020617; border-radius: 16px; padding: 32px; max-width: 520px; width: 100%; border: 1px solid rgba(148,163,184,0.25); }
          .logo { height: 40px; margin-bottom: 16px; }
          h1 { font-size: 22px; color: #f9fafb; margin: 0 0 8px; }
          h2 { font-size: 13px; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 20px; font-weight: 500; }
          .status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
          .details { background: rgba(15,23,42,0.9); border: 1px solid rgba(148,163,184,0.3); border-radius: 12px; padding: 16px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid rgba(148,163,184,0.1); }
          .detail-row:last-child { border-bottom: none; }
          .label { font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; }
          .value { font-size: 15px; color: #e5e7eb; text-align: right; }
          .buttons { display: flex; gap: 12px; margin-top: 20px; }
          .btn { flex: 1; padding: 14px 20px; border: none; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; text-transform: uppercase; letter-spacing: 0.08em; transition: all 0.2s; text-decoration: none; text-align: center; }
          .btn-confirm { background: linear-gradient(135deg, #22c55e, #2dd4bf); color: #020617; }
          .btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(34,197,94,0.3); }
          .btn-cancel { background: transparent; border: 1px solid #ef4444; color: #ef4444; }
          .btn-cancel:hover { background: rgba(239,68,68,0.1); }
          .btn-reschedule { background: transparent; border: 1px solid #f59e0b; color: #f59e0b; }
          .btn-reschedule:hover { background: rgba(245,158,11,0.1); }
          .btn-secondary { background: rgba(148,163,184,0.2); border: 1px solid rgba(148,163,184,0.3); color: #e5e7eb; }
          .btn-secondary:hover { background: rgba(148,163,184,0.3); }
          .note-input { width: 100%; padding: 12px; border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; background: rgba(15,23,42,0.9); color: #e5e7eb; font-size: 14px; margin-top: 16px; box-sizing: border-box; resize: vertical; min-height: 60px; }
          .note-input::placeholder { color: #6b7280; }
          .time-slots { display: flex; flex-direction: column; gap: 10px; margin: 16px 0; }
          .time-slot { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(15,23,42,0.9); border: 1px solid rgba(148,163,184,0.3); border-radius: 8px; cursor: pointer; transition: all 0.2s; }
          .time-slot:hover { border-color: #f59e0b; background: rgba(245,158,11,0.1); }
          .time-slot.selected { border-color: #22c55e; background: rgba(34,197,94,0.1); }
          .time-slot input[type="radio"] { width: 18px; height: 18px; accent-color: #f59e0b; }
          .time-slot label { flex: 1; cursor: pointer; font-size: 15px; color: #e5e7eb; }
          .info { font-size: 12px; color: #9ca3af; margin-top: 20px; text-align: center; }
          .back-link { display: inline-block; margin-bottom: 16px; color: #9ca3af; text-decoration: none; font-size: 14px; }
          .back-link:hover { color: #e5e7eb; }
          .history { margin-top: 16px; padding: 12px; background: rgba(15,23,42,0.5); border-radius: 8px; font-size: 12px; color: #9ca3af; }
          .divider { height: 1px; background: rgba(148,163,184,0.2); margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="https://happysmileclinics.com/wp-content/uploads/2024/12/happy-smile-clinics-180x52.png" alt="Happy Smile Clinics" class="logo">
          
          ${isReschedule ? `
            <a href="/api/email/confirm/${req.params.token}" class="back-link">← Powrót do szczegółów</a>
            <h2>Zmiana terminu</h2>
            <h1>Wybierz nowy termin wizyty</h1>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">📍 Lokalizacja</span>
                <span class="value">${list?.cityDisplay || list?.city || subscriber.city || 'Happy Smile'}</span>
              </div>
              ${list?.location ? `
              <div class="detail-row">
                <span class="label">🏨 Adres</span>
                <span class="value" style="font-size: 12px; max-width: 200px;">${list.location}</span>
              </div>
              ` : ''}
            </div>
            
            <form id="rescheduleForm" method="POST" action="/api/email/confirm/${req.params.token}">
              <input type="hidden" name="action" value="reschedule">
              
              <!-- Gün Seçimi -->
              <div class="label" style="margin-bottom: 12px;">📅 Wybierz dzień:</div>
              <div class="time-slots">
                ${list?.eventDay1 ? `
                  <div class="time-slot ${subscriber.eventDate === list.eventDay1 ? 'selected' : ''}">
                    <input type="radio" name="newDate" id="day1" value="${list.eventDay1}" ${subscriber.eventDate === list.eventDay1 ? 'checked' : (!subscriber.eventDate ? 'checked' : '')}>
                    <label for="day1">${list.eventDay1} ${subscriber.eventDate === list.eventDay1 ? '(obecny)' : ''}</label>
                  </div>
                ` : ''}
                ${list?.eventDay2 ? `
                  <div class="time-slot ${subscriber.eventDate === list.eventDay2 ? 'selected' : ''}">
                    <input type="radio" name="newDate" id="day2" value="${list.eventDay2}" ${subscriber.eventDate === list.eventDay2 ? 'checked' : ''}>
                    <label for="day2">${list.eventDay2} ${subscriber.eventDate === list.eventDay2 ? '(obecny)' : ''}</label>
                  </div>
                ` : ''}
                ${!list?.eventDay1 && !list?.eventDay2 ? `
                  <div style="color: #9ca3af; font-size: 14px; padding: 12px;">Brak dostępnych dni</div>
                ` : ''}
              </div>
              
              <!-- Saat Seçimi -->
              <div class="label" style="margin: 20px 0 12px;">🕐 Wybierz godzinę:</div>
              <div class="time-slots">
                ${timeSlots.map((slot, index) => `
                  <div class="time-slot ${subscriber.eventTime === slot ? 'selected' : ''}">
                    <input type="radio" name="newTimeSlot" id="slot${index}" value="${slot}" ${subscriber.eventTime === slot ? 'checked' : (index === 0 && !subscriber.eventTime ? 'checked' : '')}>
                    <label for="slot${index}">${slot} ${subscriber.eventTime === slot ? '(obecny)' : ''}</label>
                  </div>
                `).join('')}
              </div>
              
              <textarea name="note" class="note-input" placeholder="Dodatkowe uwagi (opcjonalnie)..."></textarea>
              
              <div class="buttons">
                <button type="submit" class="btn btn-confirm">✓ Zapisz nowy termin</button>
              </div>
            </form>
          ` : `
            <h2>Moja wizyta</h2>
            <h1>Panel pacjenta</h1>
            
            <div class="status-badge" style="background: ${currentStatus.bg}; color: ${currentStatus.color}; border: 1px solid ${currentStatus.color}40;">
              ${currentStatus.icon} ${currentStatus.text}
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">👤 Pacjent</span>
                <span class="value">${subscriber.fullName || subscriber.firstName || 'Pacjent'}</span>
              </div>
              <div class="detail-row">
                <span class="label">📅 Data</span>
                <span class="value">${list?.eventDates || '-'}</span>
              </div>
              <div class="detail-row">
                <span class="label">📆 Wybrany dzień</span>
                <span class="value" style="color: ${subscriber.eventDate ? '#22c55e' : '#f59e0b'};">${subscriber.eventDate || 'Nie wybrano'}</span>
              </div>
              <div class="detail-row">
                <span class="label">🕐 Godzina</span>
                <span class="value" style="color: ${subscriber.eventTime ? '#22c55e' : '#f59e0b'};">${subscriber.eventTime || 'Nie wybrano'}</span>
              </div>
              <div class="detail-row">
                <span class="label">📍 Miejsce</span>
                <span class="value">${list?.cityDisplay || list?.city || subscriber.city || '-'}</span>
              </div>
              ${list?.location ? `
              <div class="detail-row">
                <span class="label">🏨 Adres</span>
                <span class="value" style="font-size: 12px; max-width: 200px;">${list.location}</span>
              </div>
              ` : ''}
            </div>
            
            ${subscriber.confirmationNote ? `
            <div class="history">
              <strong>📝 Twoja notatka:</strong><br>
              ${subscriber.confirmationNote}
            </div>
            ` : ''}
            
            ${subscriber.confirmedAt ? `
            <div class="history">
              <strong>📆 Ostatnia aktualizacja:</strong> ${new Date(subscriber.confirmedAt).toLocaleString('pl-PL')}
            </div>
            ` : ''}
            
            <div class="divider"></div>
            
            <form id="confirmForm" method="POST" action="/api/email/confirm/${req.params.token}">
              <textarea name="note" class="note-input" placeholder="Dodatkowe uwagi lub pytania..."></textarea>
              
              ${status !== 'confirmed' ? `
              <div class="buttons">
                <button type="submit" name="action" value="confirm" class="btn btn-confirm">✓ Potwierdzam wizytę</button>
              </div>
              ` : ''}
              
              <div class="buttons" style="margin-top: 10px;">
                <a href="/api/email/confirm/${req.params.token}?reschedule=true" class="btn btn-reschedule">📅 Zmień termin</a>
                ${status !== 'cancelled' ? `
                <button type="submit" name="action" value="cancel" class="btn btn-cancel">✗ Anuluję</button>
                ` : `
                <button type="submit" name="action" value="confirm" class="btn btn-secondary">🔄 Przywróć wizytę</button>
                `}
              </div>
            </form>
          `}
          
          <p class="info">
            Masz pytania? Odpowiedz na e-mail lub napisz do nas na WhatsApp.<br>
            <small style="opacity: 0.7;">Ten link jest aktywny tylko dla Ciebie.</small>
          </p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Randevu onay sayfası hatası:', error);
    res.status(500).send('Bir hata oluştu');
  }
});

// POST /api/email/confirm/:token - Randevu onay işlemi
router.post('/confirm/:token', express.urlencoded({ extended: true }), async (req, res) => {
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
      where: { confirmationToken: req.params.token } 
    });
    
    if (!subscriber) {
      return res.redirect(`/api/email/confirm/${req.params.token}`);
    }
    
    const { action, note, newTimeSlot, newDate } = req.body;
    
    // Durumu güncelle
    if (action === 'confirm') {
      subscriber.confirmationStatus = 'confirmed';
    } else if (action === 'cancel') {
      subscriber.confirmationStatus = 'cancelled';
    } else if (action === 'reschedule') {
      subscriber.confirmationStatus = 'rescheduled';
      // Yeni gün ve saat seçimini kaydet
      if (newDate) {
        subscriber.eventDate = newDate;
      }
      if (newTimeSlot) {
        subscriber.eventTime = newTimeSlot;
      }
      // Not'a da ekle
      const rescheduleNote = `Nowy termin: ${newDate || subscriber.eventDate || '-'} o ${newTimeSlot || subscriber.eventTime || '-'}${note ? '. ' + note : ''}`;
      subscriber.confirmationNote = rescheduleNote;
    }
    
    subscriber.confirmedAt = new Date();
    if (action !== 'reschedule') {
      subscriber.confirmationNote = note || null;
    }
    
    await subscriberRepo.save(subscriber);
    
    // Liste bilgilerini al
    const list = await listRepo.findOne({ where: { id: subscriber.listId } });
    
    logger.info(`📅 Randevu ${action}: ${subscriber.fullName || subscriber.email} - ${subscriber.eventDate} ${newTimeSlot ? '@ ' + newTimeSlot : ''}`);
    
    // Sonuç sayfası
    const newTerminText = (newDate || newTimeSlot) 
      ? `Nowy termin: ${newDate || subscriber.eventDate || '-'} o ${newTimeSlot || subscriber.eventTime || '-'}.`
      : 'Oczekuje na potwierdzenie.';
    
    const statusMessages = {
      confirm: { icon: '✅', title: 'Wizyta potwierdzona!', text: 'Dziękujemy za potwierdzenie. Do zobaczenia!' },
      cancel: { icon: '❌', title: 'Wizyta anulowana', text: 'Twoja wizyta została anulowana. Skontaktuj się z nami, jeśli chcesz umówić nowy termin.' },
      reschedule: { icon: '📅', title: 'Zmiana terminu zapisana!', text: `${newTerminText} Skontaktujemy się z Tobą wkrótce.` }
    };
    
    const msg = statusMessages[action] || statusMessages.confirm;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="pl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${msg.title} - Happy Smile Clinics</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #0f172a; color: #e5e7eb; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #020617; border-radius: 16px; padding: 40px; max-width: 500px; text-align: center; border: 1px solid rgba(148,163,184,0.25); }
          .logo { height: 40px; margin-bottom: 24px; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h2 { color: ${action === 'cancel' ? '#ef4444' : action === 'reschedule' ? '#f59e0b' : '#22c55e'}; margin-bottom: 16px; }
          p { color: #9ca3af; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="card">
          <img src="https://happysmileclinics.com/wp-content/uploads/2024/12/happy-smile-clinics-180x52.png" alt="Happy Smile Clinics" class="logo">
          <div class="icon">${msg.icon}</div>
          <h2>${msg.title}</h2>
          <p>${msg.text}</p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Randevu onay işlemi hatası:', error);
    res.status(500).send('Bir hata oluştu');
  }
});

// GET /api/email/confirmations - Dashboard için tüm onay durumları
router.get('/confirmations', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    const { EmailSubscriber } = require('../models/EmailSubscriber');
    const subscriberRepo = AppDataSource.getRepository(EmailSubscriber);
    
    // Son 30 gündeki randevuları getir
    const subscribers = await subscriberRepo
      .createQueryBuilder('s')
      .where('s.confirmationToken IS NOT NULL')
      .orderBy('s.eventDate', 'ASC')
      .addOrderBy('s.eventTime', 'ASC')
      .getMany();
    
    // İstatistikler
    const stats = {
      total: subscribers.length,
      pending: subscribers.filter(s => s.confirmationStatus === 'pending').length,
      confirmed: subscribers.filter(s => s.confirmationStatus === 'confirmed').length,
      cancelled: subscribers.filter(s => s.confirmationStatus === 'cancelled').length,
      rescheduled: subscribers.filter(s => s.confirmationStatus === 'rescheduled').length
    };
    
    res.json({
      success: true,
      data: subscribers,
      stats
    });
  } catch (error) {
    logger.error('Onay listesi hatası:', error);
    res.status(500).json({ error: error.message });
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

