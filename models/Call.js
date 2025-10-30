const { EntitySchema } = require('typeorm');

// Call modeli
const Call = new EntitySchema({
  name: 'Call',
  tableName: 'calls',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    executionSid: {
      type: 'varchar',
      nullable: true
    },
    callSid: {
      type: 'varchar',
      nullable: true
    },
    to: {
      type: 'varchar',
      nullable: true
    },
    from: {
      type: 'varchar',
      nullable: true
    },
    status: {
      type: 'varchar',
      nullable: true
    },
    direction: {
      type: 'varchar',
      nullable: true
    },
    duration: {
      type: 'int',
      default: 0
    },
    dtmfDigits: {
      type: 'text',
      nullable: true
    },
    recordingUrl: {
      type: 'varchar',
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
  }
});

module.exports = {
  Call
}; 