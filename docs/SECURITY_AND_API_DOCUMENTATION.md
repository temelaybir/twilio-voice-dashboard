# Twilio Voice Dashboard - Güvenlik ve API Süreçleri Dokümantasyonu

## İçindekiler
1. [Güvenlik Mimarisi](#güvenlik-mimarisi)
2. [CORS Yapılandırması](#cors-yapılandırması)
3. [Webhook Güvenliği](#webhook-güvenliği)
4. [Environment Variable Yönetimi](#environment-variable-yönetimi)
5. [API Süreçleri](#api-süreçleri)
6. [DTMF Webhook İletişim Süreci](#dtmf-webhook-iletişim-süreci)
7. [Hata Yönetimi ve Güvenlik](#hata-yönetimi-ve-güvenlik)
8. [Monitoring ve Logging](#monitoring-ve-logging)
9. [Best Practices](#best-practices)

---

## Güvenlik Mimarisi

### Genel Güvenlik Yapısı

```
Internet --> Ngrok Tunnel --> CORS Filter --> Request Validation --> Express Router --> Webhook Handlers --> Socket.IO Events --> Frontend Clients
```

### Güvenlik Katmanları

1. **Network Layer**: Ngrok tunnel ve HTTPS encryption
2. **Application Layer**: CORS policies ve request validation
3. **Data Layer**: Environment variables ve secure storage
4. **Communication Layer**: Socket.IO secure connections

---

## CORS Yapılandırması

### Dinamik Origin Yönetimi

```javascript
// server.js - CORS Configuration
app.use(cors({
  origin: function(origin, callback) {
    // İzin verilen origin listesi
    const allowedOrigins = ['http://localhost:3000'];
    
    // Ngrok URL'si varsa dinamik olarak ekle
    if (process.env.NGROK_URL) {
      allowedOrigins.push(process.env.NGROK_URL);
      
      // www olmayan versiyonu da ekle
      if (process.env.NGROK_URL.includes('//www.')) {
        allowedOrigins.push(process.env.NGROK_URL.replace('//www.', '//'));
      }
    }
    
    // Origin kontrolü
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS hatası: İzin verilmeyen kaynak: ${origin}`);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### CORS Policy Detayları

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| `origin` | Dynamic Function | Runtime'da belirlenen origin listesi |
| `methods` | GET, POST, PUT, DELETE, OPTIONS | İzin verilen HTTP metodları |
| `credentials` | true | Cookie ve auth header desteği |
| `allowedHeaders` | Content-Type, Authorization | İzin verilen header'lar |

### Socket.IO CORS

```javascript
// Socket.IO için ayrı CORS yapılandırması
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', process.env.NGROK_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  },
  path: '/socket.io',
  transports: ['websocket', 'polling']
});
```

---

## Webhook Güvenliği

### Webhook Endpoint Koruması

#### 1. Request Validation
```javascript
// routes/voice.js - Webhook validation
router.post('/webhooks/dtmf', (req, res) => {
  try {
    // Request body validation
    if (!req.body) {
      console.warn('Empty webhook request body');
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    // Required fields validation
    const requiredFields = ['execution_sid', 'event'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields', 
        fields: missingFields 
      });
    }
    
    // Process webhook
    processWebhook(req.body);
    res.sendStatus(200);
    
  } catch (error) {
    console.error('Webhook validation error:', error);
    res.sendStatus(500);
  }
});
```

#### 2. Twilio Signature Validation (Gelişmiş)
```javascript
const crypto = require('crypto');

function validateTwilioSignature(req) {
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `${process.env.NGROK_URL}${req.originalUrl}`;
  const body = JSON.stringify(req.body);
  
  // Twilio webhook signature calculation
  const expectedSignature = crypto
    .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN)
    .update(url + body)
    .digest('base64');
    
  return twilioSignature === expectedSignature;
}

// Webhook handler with signature validation
router.post('/webhooks/dtmf', (req, res) => {
  if (!validateTwilioSignature(req)) {
    console.warn('Invalid Twilio signature');
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Process validated webhook
  processWebhook(req.body);
  res.sendStatus(200);
});
```

---

## Environment Variable Yönetimi

### Güvenli .env Yapılandırması

```env
# .env - Production yapılandırması
# Twilio Credentials (Hassas)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_FLOW_SID=FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server Configuration
PORT=3001
NODE_ENV=production

# Ngrok (Development only)
NGROK_URL=https://xxxxxxxx.ngrok-free.app

# Database
DATABASE_URL=./data/database.sqlite
DATABASE_ENCRYPTION_KEY=your-encryption-key

# Security
SESSION_SECRET=your-session-secret
JWT_SECRET=your-jwt-secret

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Environment Variable Validation

```javascript
// config/env-validation.js
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'TWILIO_FLOW_SID'
];

function validateEnvironment() {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  // Mask sensitive data in logs
  console.log('Environment validation successful:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    const maskedValue = value ? `${value.substring(0, 6)}***` : 'NOT_SET';
    console.log(`${varName}: ${maskedValue}`);
  });
}

module.exports = { validateEnvironment };
```

---

## API Süreçleri

### API Request Flow

```
Client --> CORS --> Router --> Twilio --> Database --> Socket.IO --> Client
```

### API Endpoint Security

#### 1. Input Sanitization
```javascript
// utils/sanitizer.js
function sanitizePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new Error('Invalid phone number format');
  }
  
  // Remove all non-digit characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Validate format
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(cleaned)) {
    throw new Error('Invalid phone number format');
  }
  
  return cleaned;
}

// API endpoint with sanitization
router.post('/start', async (req, res) => {
  try {
    const sanitizedNumber = sanitizePhoneNumber(req.body.to);
    // Process with sanitized number
  } catch (error) {
    return res.status(400).json({ 
      error: 'Invalid input', 
      message: error.message 
    });
  }
});
```

#### 2. Response Standardization
```javascript
// utils/response.js
class ApiResponse {
  static success(data, message = 'Success') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }
  
  static error(message, code = 'UNKNOWN_ERROR', details = null) {
    return {
      success: false,
      error: message,
      code,
      details,
      timestamp: new Date().toISOString()
    };
  }
}

// Usage in routes
router.post('/start', async (req, res) => {
  try {
    const result = await initiateCall(req.body);
    res.json(ApiResponse.success(result, 'Çağrı başlatıldı'));
  } catch (error) {
    res.status(500).json(ApiResponse.error(
      error.message, 
      error.code || 'CALL_INITIATION_ERROR',
      error.details
    ));
  }
});
```

---

## DTMF Webhook İletişim Süreci

### Süreç Akış Diyagramı

```
1. Kullanıcı Tuş Basar
   ↓
2. Twilio DTMF Algılar
   ↓
3. Studio Flow DTMF Widget
   ↓
4. Flow Webhook Call
   ↓
5. DTMF Webhook Endpoint
   ↓
6. Request Validation
   ↓
7. Data Processing
   ↓
8. Socket.IO Event
   ↓
9. Database Update
   ↓
10. Response 200 OK
   ↓
11. Client Real-time Update
```

### Detaylı DTMF İletişim Akışı

#### 1. Flow Configuration
```json
{
  "name": "happy-outgoing",
  "type": "gather-input-on-call",
  "properties": {
    "voice": "Polly.Amy-Neural",
    "speech_timeout": "110",
    "loop": 2,
    "finish_on_key": "#",
    "say": "If you're attending, please press 1. If you're no longer interested, press 2. To leave a voicemail, please press 0.",
    "language": "en-GB",
    "gather_language": "en-GB",
    "timeout": 5
  }
}
```

#### 2. DTMF Decision Logic
```json
{
  "name": "stage_1",
  "type": "split-based-on",
  "transitions": [
    {
      "next": "confirmed_webhook",
      "event": "match",
      "conditions": [
        {
          "friendly_name": "If value equal_to 1",
          "arguments": ["{{widgets.happy-outgoing.Digits}}"],
          "type": "equal_to",
          "value": "1"
        }
      ]
    },
    {
      "next": "cancel_webhook",
      "event": "match",
      "conditions": [
        {
          "friendly_name": "If value equal_to 2",
          "arguments": ["{{widgets.happy-outgoing.Digits}}"],
          "type": "equal_to",
          "value": "2"
        }
      ]
    },
    {
      "next": "connect_webhook",
      "event": "match",
      "conditions": [
        {
          "friendly_name": "If value equal_to 0",
          "arguments": ["{{widgets.happy-outgoing.Digits}}"],
          "type": "equal_to",
          "value": "0"
        }
      ]
    }
  ]
}
```

#### 3. Webhook Request Format
```json
{
  "flow_sid": "FWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "execution_sid": "FNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "event": "dtmf_action",
  "widget_name": "confirmed",
  "action": "confirm_appointment",
  "digits": "1",
  "to": "+901234567890",
  "call_hash": "FNxxxx_1647857400"
}
```

#### 4. Backend Processing
```javascript
// routes/voice.js - DTMF webhook handler
router.post('/webhooks/dtmf', (req, res) => {
  try {
    console.log('DTMF Webhook - Gelen veri:', req.body);
    
    // 1. Data validation
    const dtmfData = validateDTMFData(req.body);
    
    // 2. Execution SID extraction
    if (!dtmfData.execution_sid && dtmfData.call_hash) {
      const hashParts = dtmfData.call_hash.split('_');
      if (hashParts.length > 0) {
        dtmfData.execution_sid = hashParts[0];
      }
    }
    
    // 3. Event type determination
    const eventType = dtmfData.event;
    const hasAction = eventType === 'dtmf_action';
    
    // 4. Action processing
    if (hasAction || eventType === 'dtmf') {
      processDTMFAction(dtmfData, hasAction);
    }
    
    // 5. Immediate response (crucial for Twilio)
    res.sendStatus(200);
    
  } catch (error) {
    console.error('DTMF webhook hatası:', error);
    res.sendStatus(500);
  }
});

function validateDTMFData(data) {
  const required = ['execution_sid', 'digits'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  
  return {
    ...data,
    is_action: data.event === 'dtmf_action',
    timestamp: Date.now()
  };
}

function processDTMFAction(dtmfData, hasAction) {
  // 6. Socket.IO event emission
  if (global.io) {
    // Primary event
    global.io.volatile.emit('dtmfUpdate', dtmfData);
    
    // Backup event with delay
    setTimeout(() => {
      global.io.emit('dtmfUpdate', dtmfData);
    }, 500);
    
    // Action-specific status update
    if (hasAction && dtmfData.action) {
      const statusData = {
        ...dtmfData,
        event: dtmfData.action,
        timestamp: Date.now()
      };
      
      global.io.volatile.emit('statusUpdate', statusData);
      
      setTimeout(() => {
        global.io.emit('statusUpdate', statusData);
      }, 500);
    }
  }
  
  // 7. Database update (async)
  updateCallRecord(dtmfData);
}

async function updateCallRecord(dtmfData) {
  try {
    if (global.database && global.Call) {
      const callRepository = global.database.AppDataSource.getRepository(global.Call);
      
      await callRepository.update(
        { executionSid: dtmfData.execution_sid },
        { 
          dtmfDigits: dtmfData.digits,
          status: dtmfData.action || 'dtmf_received',
          updatedAt: new Date()
        }
      );
    }
  } catch (error) {
    console.error('Database update error:', error);
    // Database errors shouldn't affect webhook response
  }
}
```

#### 5. Frontend Real-time Update
```javascript
// Frontend Socket.IO listener
socket.on('dtmfUpdate', (data) => {
  console.log('DTMF Update received:', data);
  
  // UI update based on action
  switch(data.action) {
    case 'confirm_appointment':
      showSuccessMessage('Randevu onaylandı');
      updateCallStatus(data.execution_sid, 'confirmed');
      break;
      
    case 'cancel_appointment':
      showInfoMessage('Randevu iptal edildi');
      updateCallStatus(data.execution_sid, 'cancelled');
      break;
      
    case 'connect_to_representative':
      showInfoMessage('Sesli mesaj alınıyor');
      updateCallStatus(data.execution_sid, 'recording');
      break;
      
    default:
      showInfoMessage(`Tuş basıldı: ${data.digits}`);
  }
});
```

### Güvenilirlik Mekanizmaları

#### 1. Double Event Emission
```javascript
// Primary event (volatile - hızlı ama kayıp olabilir)
global.io.volatile.emit('dtmfUpdate', dtmfData);

// Backup event (guaranteed - güvenilir)
setTimeout(() => {
  global.io.emit('dtmfUpdate', dtmfData);
}, 500);
```

#### 2. Webhook Retry Logic (Twilio tarafında)
- Twilio otomatik olarak 3 kez dener
- 200 OK dönmezse retry yapar
- Her retry'da exponential backoff uygular

#### 3. Circuit Breaker Pattern
```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
  
  async call(fn) {
    if (this.state === 'OPEN') {
      if (this.nextAttempt <= Date.now()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

---

## Hata Yönetimi ve Güvenlik

### 1. Error Classification
```javascript
class SecurityError extends Error {
  constructor(message, code = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.severity = 'HIGH';
  }
}

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.severity = 'MEDIUM';
  }
}

class TwilioError extends Error {
  constructor(message, twilioCode = null) {
    super(message);
    this.name = 'TwilioError';
    this.twilioCode = twilioCode;
    this.severity = 'HIGH';
  }
}
```

### 2. Security Event Logging
```javascript
// utils/security-logger.js
class SecurityLogger {
  static logSecurityEvent(event, severity = 'INFO', details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown',
      details: {
        ...details,
        // Hassas bilgileri maskeleme
        token: details.token ? '***MASKED***' : undefined,
        password: details.password ? '***MASKED***' : undefined
      }
    };
    
    console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
    
    // Production'da external logging service'e gönder
    if (process.env.NODE_ENV === 'production') {
      // sendToSecurityMonitoring(logEntry);
    }
  }
  
  static logFailedRequest(req, error) {
    this.logSecurityEvent('FAILED_REQUEST', 'MEDIUM', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      error: error.message
    });
  }
  
  static logUnauthorizedAccess(req) {
    this.logSecurityEvent('UNAUTHORIZED_ACCESS', 'HIGH', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });
  }
}

module.exports = SecurityLogger;
```

---

## Monitoring ve Logging

### 1. Health Check Endpoint
```javascript
// routes/health.js
router.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    services: {
      database: checkDatabaseHealth(),
      twilio: checkTwilioHealth(),
      socketio: checkSocketIOHealth()
    }
  };
  
  const overallStatus = Object.values(health.services)
    .every(service => service.status === 'OK') ? 'OK' : 'ERROR';
    
  health.status = overallStatus;
  
  res.status(overallStatus === 'OK' ? 200 : 503).json(health);
});
```

### 2. Performance Monitoring
```javascript
// middleware/performance-monitor.js
function performanceMonitor(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    // Slow request warning
    if (duration > 5000) {
      console.warn('[PERFORMANCE] Slow request:', logEntry);
    } else {
      console.log('[PERFORMANCE]', logEntry);
    }
  });
  
  next();
}

module.exports = performanceMonitor;
```

---

## Best Practices

### 1. Webhook Best Practices

```javascript
// ✅ Doğru webhook implementation
router.post('/webhooks/dtmf', (req, res) => {
  try {
    // 1. Hızlı response (Twilio timeout önlemek için)
    res.sendStatus(200);
    
    // 2. Asenkron processing
    setImmediate(() => {
      processDTMFWebhook(req.body);
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

// ❌ Yanlış webhook implementation
router.post('/webhooks/dtmf', async (req, res) => {
  try {
    // Yavaş processing - Twilio timeout riski
    await slowDatabaseOperation();
    await externalAPICall();
    
    res.sendStatus(200); // Çok geç!
    
  } catch (error) {
    res.sendStatus(500);
  }
});
```

### 2. Error Handling Best Practices

```javascript
// ✅ Doğru error handling
async function initiateCall(phoneNumber) {
  try {
    const execution = await twilioClient.studio.v2.flows(flowSid)
      .executions.create({ to: phoneNumber });
      
    return { success: true, executionSid: execution.sid };
    
  } catch (error) {
    // Twilio error code handling
    if (error.code === 21211) {
      throw new ValidationError('Invalid phone number format');
    } else if (error.code === 20429) {
      throw new TwilioError('Rate limit exceeded', error.code);
    } else {
      throw new TwilioError(error.message, error.code);
    }
  }
}
```

### 3. Security Best Practices

```javascript
// ✅ Doğru environment variable usage
const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development'
  }
};

// Validation
if (!config.twilio.accountSid) {
  throw new Error('TWILIO_ACCOUNT_SID is required');
}
```

### 4. Socket.IO Best Practices

```javascript
// ✅ Doğru Socket.IO event emission
function emitDTMFUpdate(data) {
  if (!global.io) {
    console.error('Socket.IO not available');
    return;
  }
  
  try {
    // Volatile for non-critical updates
    global.io.volatile.emit('dtmfUpdate', data);
    
    // Reliable backup for critical updates
    setTimeout(() => {
      global.io.emit('dtmfUpdate', data);
    }, 500);
    
  } catch (error) {
    console.error('Socket.IO emission error:', error);
  }
}
```

---

## DTMF Sürecinin Kritik Noktaları

### 1. Webhook Response Timing
- **Kritik**: Twilio 10 saniye içinde 200 OK bekler
- **Çözüm**: Hemen response döndür, processing'i asenkron yap
- **Risk**: Geç response = webhook retry = duplicate events

### 2. Socket.IO Event Güvenilirliği
- **Kritik**: Network issues sebebiyle kayıp olabilir
- **Çözüm**: Volatile + backup event emission
- **Risk**: Event loss = UI güncellenmiyor

### 3. Database Consistency
- **Kritik**: DB error webhook response'unu etkilememeli
- **Çözüm**: Try-catch ile async DB operations
- **Risk**: DB error = webhook failure = retry storm

### 4. Execution SID Tracking
- **Kritik**: Her event'in doğru call ile eşleşmesi
- **Çözüm**: call_hash fallback mechanism
- **Risk**: Wrong mapping = confused UI state

Bu dokümantasyon, DTMF webhook iletişiminin nasıl güvenli, güvenilir ve performanslı bir şekilde kurgulandığını detaylı olarak açıklamaktadır. 