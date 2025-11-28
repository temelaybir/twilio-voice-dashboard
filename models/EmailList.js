const { EntitySchema } = require('typeorm');

// EmailList modeli - Abone listeleri
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



