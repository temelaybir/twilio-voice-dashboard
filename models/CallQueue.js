const { EntitySchema } = require('typeorm');

// CallQueue modeli - Toplu arama kuyruğu
const CallQueue = new EntitySchema({
  name: 'CallQueue',
  tableName: 'call_queues',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    // Kuyruk adı/açıklaması
    name: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // Liste ID (email list'ten geliyorsa)
    listId: {
      type: 'int',
      nullable: true
    },
    // Durum: pending, processing, paused, completed, failed
    status: {
      type: 'varchar',
      length: 50,
      default: 'pending'
    },
    // Toplam numara sayısı
    totalNumbers: {
      type: 'int',
      default: 0
    },
    // Aranan numara sayısı
    calledCount: {
      type: 'int',
      default: 0
    },
    // Başarılı arama sayısı
    successCount: {
      type: 'int',
      default: 0
    },
    // Başarısız arama sayısı
    failedCount: {
      type: 'int',
      default: 0
    },
    // Mevcut batch numarası
    currentBatch: {
      type: 'int',
      default: 0
    },
    // Telefon numaraları (JSON array)
    phoneNumbers: {
      type: 'text',
      nullable: true
    },
    // Arama sonuçları (JSON)
    results: {
      type: 'text',
      nullable: true
    },
    // Hata logları (JSON)
    errors: {
      type: 'text',
      nullable: true
    },
    // Başlama tarihi
    startedAt: {
      type: 'datetime',
      nullable: true
    },
    // Tamamlanma tarihi
    completedAt: {
      type: 'datetime',
      nullable: true
    },
    // Twilio bölgesi: 'poland' veya 'uk'
    twilioRegion: {
      type: 'varchar',
      length: 50,
      default: 'poland'
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
      name: 'idx_call_queue_status',
      columns: ['status']
    },
    {
      name: 'idx_call_queue_list',
      columns: ['listId']
    }
  ]
});

module.exports = {
  CallQueue
};

