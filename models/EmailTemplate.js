const { EntitySchema } = require('typeorm');

// EmailTemplate modeli - Email şablonları
const EmailTemplate = new EntitySchema({
  name: 'EmailTemplate',
  tableName: 'email_templates',
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
    subject: {
      type: 'varchar',
      length: 500,
      nullable: false
    },
    htmlContent: {
      type: 'text',
      nullable: false
    },
    textContent: {
      type: 'text',
      nullable: true
    },
    // Değişkenler (JSON): ["name", "email", "phone", "date"]
    variables: {
      type: 'text',
      nullable: true
    },
    // Template kategorisi
    category: {
      type: 'varchar',
      length: 100,
      nullable: true,
      default: 'general'
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
  EmailTemplate
};








