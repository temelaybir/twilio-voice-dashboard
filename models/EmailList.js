const { EntitySchema } = require('typeorm');

// EmailList modeli - Abone listeleri (Etkinlik bazlı)
const EmailList = new EntitySchema({
  name: 'EmailList',
  tableName: 'email_lists',
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
    description: {
      type: 'text',
      nullable: true
    },
    // Etkinlik şehri (zorunlu)
    city: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // Şehir adı görüntüleme (Lehçe locative form - örn: Bydgoszczy, Olsztynie)
    cityDisplay: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // Etkinlik tarihleri (örn: "30 listopada - 1 grudia") - geriye uyumluluk
    eventDates: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    // 1. Gün (örn: "30 listopada")
    eventDay1: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    // 2. Gün (örn: "1 grudnia")
    eventDay2: {
      type: 'varchar',
      length: 100,
      nullable: true
    },
    // Etkinlik konumu/adresi
    location: {
      type: 'text',
      nullable: true
    },
    // Saat seçenekleri (JSON array: ["09:00-12:30", "12:30-15:00", "15:00-17:30"])
    timeSlots: {
      type: 'text',
      nullable: true
    },
    // Abone sayısı (cache için)
    subscriberCount: {
      type: 'int',
      default: 0
    },
    // Aktif/Pasif durumu
    isActive: {
      type: 'boolean',
      default: true
    },
    createdAt: {
      type: 'datetime',
      createDate: true
    },
    updatedAt: {
      type: 'datetime',
      updateDate: true
    }
  }
});

module.exports = {
  EmailList
};
