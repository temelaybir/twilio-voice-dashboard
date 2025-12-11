const { EntitySchema } = require('typeorm');

// EmailCampaign modeli - Email kampanyaları
const EmailCampaign = new EntitySchema({
  name: 'EmailCampaign',
  tableName: 'email_campaigns',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    name: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    // Kampanya durumu: draft, scheduled, sending, sent, paused, cancelled
    status: {
      type: 'varchar',
      length: 50,
      default: 'draft'
    },
    // Template ID
    templateId: {
      type: 'int',
      nullable: false
    },
    // Liste ID (virgülle ayrılmış olabilir birden fazla için)
    listIds: {
      type: 'varchar',
      length: 500,
      nullable: false
    },
    // Email konusu (template'den override edilebilir)
    subject: {
      type: 'varchar',
      length: 500,
      nullable: true
    },
    // Gönderen adı
    fromName: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // Gönderen email (BULK_EMAIL_USER'dan farklı olabilir)
    fromEmail: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // Reply-to email
    replyTo: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // Planlanmış gönderim zamanı
    scheduledAt: {
      type: 'datetime',
      nullable: true
    },
    // Gönderim başlangıç zamanı
    startedAt: {
      type: 'datetime',
      nullable: true
    },
    // Gönderim bitiş zamanı
    completedAt: {
      type: 'datetime',
      nullable: true
    },
    // Toplam alıcı sayısı
    totalRecipients: {
      type: 'int',
      default: 0
    },
    // Gönderilen sayısı
    sentCount: {
      type: 'int',
      default: 0
    },
    // Başarılı gönderim
    deliveredCount: {
      type: 'int',
      default: 0
    },
    // Açılma sayısı
    openedCount: {
      type: 'int',
      default: 0
    },
    // Tıklama sayısı
    clickedCount: {
      type: 'int',
      default: 0
    },
    // Bounce sayısı
    bouncedCount: {
      type: 'int',
      default: 0
    },
    // Unsubscribe sayısı
    unsubscribedCount: {
      type: 'int',
      default: 0
    },
    // Şikayet sayısı (spam olarak işaretleme)
    complainedCount: {
      type: 'int',
      default: 0
    },
    // Rate limiting ayarları (JSON): {"emailsPerMinute": 30, "delayBetweenBatches": 60}
    rateLimitSettings: {
      type: 'text',
      nullable: true
    },
    // Hata logları (JSON array)
    errorLogs: {
      type: 'text',
      nullable: true
    },
    createdAt: {
      type: 'datetime',
      createDate: true
    },
    updatedAt: {
      type: 'datetime',
      updateDate: true
    }
  },
  indices: [
    {
      name: 'idx_campaign_status',
      columns: ['status']
    },
    {
      name: 'idx_campaign_scheduled',
      columns: ['scheduledAt']
    }
  ]
});

module.exports = {
  EmailCampaign
};








