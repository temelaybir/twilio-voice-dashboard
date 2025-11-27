const { EntitySchema } = require('typeorm');

// EmailSubscriber modeli - Aboneler
const EmailSubscriber = new EntitySchema({
  name: 'EmailSubscriber',
  tableName: 'email_subscribers',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    email: {
      type: 'varchar',
      length: 255,
      nullable: true  // Email opsiyonel (telefon varsa)
    },
    // Ad Soyad (tek alan)
    fullName: {
      type: 'varchar',
      length: 200,
      nullable: true
    },
    // Legacy alanlar (geriye uyumluluk için)
    firstName: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    lastName: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    phone: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    // Şehir
    city: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    // Etkinlik Tarihi
    eventDate: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    // Etkinlik Saati
    eventTime: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    // Ek veriler (JSON formatında): {"clinic": "Istanbul", "patient_id": "123"}
    customFields: {
      type: 'text',
      nullable: true
    },
    // Liste ID (foreign key)
    listId: {
      type: 'int',
      nullable: false
    },
    // Abone durumu: active, unsubscribed, bounced, complained
    status: {
      type: 'varchar',
      length: 50,
      default: 'active'
    },
    // Unsubscribe token (benzersiz, güvenli link için)
    unsubscribeToken: {
      type: 'varchar',
      length: 64,
      nullable: true
    },
    // Email gönderim sayısı
    emailsSent: {
      type: 'int',
      default: 0
    },
    // Email açılma sayısı
    emailsOpened: {
      type: 'int',
      default: 0
    },
    // Son gönderim tarihi
    lastEmailAt: {
      type: 'datetime',
      nullable: true
    },
    // Unsubscribe tarihi
    unsubscribedAt: {
      type: 'datetime',
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
      name: 'idx_subscriber_list',
      columns: ['listId']
    },
    {
      name: 'idx_subscriber_status',
      columns: ['status']
    },
    {
      name: 'idx_subscriber_unsubscribe_token',
      columns: ['unsubscribeToken']
    },
    {
      name: 'idx_subscriber_phone',
      columns: ['phone']
    }
  ]
});

module.exports = {
  EmailSubscriber
};

