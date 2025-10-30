const { EntitySchema } = require('typeorm');

// EventHistory modeli - Tüm webhook event'lerini saklar
const EventHistory = new EntitySchema({
  name: 'EventHistory',
  tableName: 'event_history',
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
    eventType: {
      type: 'varchar', // 'status', 'dtmf', 'flow'
      nullable: false
    },
    eventData: {
      type: 'text', // JSON string
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
    dtmfDigits: {
      type: 'varchar',
      nullable: true
    },
    action: {
      type: 'varchar',
      nullable: true
    },
    timestamp: {
      type: 'bigint', // Unix timestamp
      nullable: false
    },
    createdAt: {
      type: 'datetime',
      createDate: true
    }
  },
  indices: [
    {
      name: 'IDX_EVENT_HISTORY_EXECUTION_SID',
      columns: ['executionSid']
    },
    {
      name: 'IDX_EVENT_HISTORY_TIMESTAMP',
      columns: ['timestamp']
    },
    {
      name: 'IDX_EVENT_HISTORY_TYPE',
      columns: ['eventType']
    }
  ]
});

module.exports = {
  EventHistory
}; 