const { EntitySchema } = require('typeorm');

// EmailSend modeli - Email gönderim kayıtları
const EmailSend = new EntitySchema({
  name: 'EmailSend',
  tableName: 'email_sends',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    // Kampanya ID
    campaignId: {
      type: 'int',
      nullable: false
    },
    // Subscriber ID
    subscriberId: {
      type: 'int',
      nullable: false
    },
    // Alıcı email (denormalize - hızlı erişim için)
    toEmail: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    // Gönderim durumu: pending, sent, delivered, opened, clicked, bounced, failed
    status: {
      type: 'varchar',
      length: 50,
      default: 'pending'
    },
    // SMTP Message ID (tracking için)
    messageId: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // Gönderim zamanı
    sentAt: {
      type: 'datetime',
      nullable: true
    },
    // Teslim zamanı
    deliveredAt: {
      type: 'datetime',
      nullable: true
    },
    // Açılma zamanı
    openedAt: {
      type: 'datetime',
      nullable: true
    },
    // Tıklama zamanı
    clickedAt: {
      type: 'datetime',
      nullable: true
    },
    // Bounce/Fail zamanı
    failedAt: {
      type: 'datetime',
      nullable: true
    },
    // Hata mesajı
    errorMessage: {
      type: 'text',
      nullable: true
    },
    // Bounce tipi: hard, soft
    bounceType: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    // IP adresi (tracking için)
    openedIp: {
      type: 'varchar',
      length: 45,
      nullable: true
    },
    // User agent (tracking için)
    userAgent: {
      type: 'text',
      nullable: true
    },
    // Retry sayısı
    retryCount: {
      type: 'int',
      default: 0
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
      name: 'idx_send_campaign',
      columns: ['campaignId']
    },
    {
      name: 'idx_send_subscriber',
      columns: ['subscriberId']
    },
    {
      name: 'idx_send_status',
      columns: ['status']
    },
    {
      name: 'idx_send_message_id',
      columns: ['messageId']
    },
    {
      name: 'idx_send_campaign_subscriber',
      columns: ['campaignId', 'subscriberId'],
      unique: true
    }
  ]
});

module.exports = {
  EmailSend
};








