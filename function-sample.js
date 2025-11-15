/**********************************************************************
  /routeCall  –  Happy Smile Clinics
  Polish (1) / Latvian (2) IVR routing + Kommo CRM + SMS/E-mail alerts
**********************************************************************/

exports.handler = async function (context, event, callback) {
    const twiml  = new Twilio.twiml.VoiceResponse();
    const twilio = context.getTwilioClient();
    const caller = event.From || 'Unknown';
  
    try {
      /* ========== 1) DIAL CALLBACK ========== */
      if (event.DialCallStatus) {
        const bridged    = event.DialBridged === 'true';
        const duration   = event.DialCallDuration || '0';
        const answeredBy = (event.DialAnsweredBy || '').toLowerCase();
        const missed = !bridged ||
                       event.DialCallStatus !== 'completed' ||
                       answeredBy.startsWith('machine');
  
        const contact = await searchCRM(context, caller);
  
        if (missed) {
          twiml.say({ language:'pl-PL' },
            'Przepraszamy, konsultanci są teraz zajęci. Oddzwonimy możliwie najszybciej.');
          twiml.hangup();
  
          const FROM   = '+48732145722';
          const TO_SMS = ['+905327994223', '+48732145722', '+447707964726']
                         .filter(n => n !== FROM);
          const urgent = `❌ MISSED CALL${answeredBy.startsWith('machine') ? ' (voicemail)' : ''}\n` +
                         `${caller}${contact ? `\n👤 ${contact.name}` : ''}\n` +
                         new Date().toLocaleString('pl-PL');
          await Promise.allSettled(
            TO_SMS.map(to => twilio.messages.create({ from: FROM, to, body: urgent }))
          );
  
          await sendFinalEmail(context, caller, contact, 'missed');
  
          if (contact)
            await addNoteToCRM(context, contact.id,
              `❌ Missed inbound call – ${caller}` +
              (answeredBy.startsWith('machine') ? ' (voicemail)' : ''), 'call_in');
  
        } else {
          await sendFinalEmail(context, caller, contact, 'answered', duration);
          if (contact)
            await addNoteToCRM(context, contact.id,
              `✅ Call answered – duration ${duration}s`, 'call_in');
        }
        return callback(null, twiml);
      }
  
      /* ========== 2) FIRST HIT  – choose language / agent ========== */
      const digit = event.Digits;
      let agentNumber, language;
      if (digit === '1')      { agentNumber = '+447707964726'; language = 'pl-PL'; }
      else if (digit === '2') { agentNumber = '+447599042882'; language = 'lv-LV'; }
      else {
        twiml.say({ language:'pl-PL' }, 'Nieprawidłowy wybór.'); twiml.redirect('/welcome');
        return callback(null, twiml);
      }
  
      const contact = await searchCRM(context, caller);
      await sendNotifications(context, caller, digit, contact);
  
      if (digit === '1') {
        twiml.say({ language:'pl-PL', voice:'alice' }, 'Łączymy z konsultantem.');
      } else {
        twiml.say({ language:'lv-LV', voice:'Google.lv-LV-Standard-B' },
          'Savienojam jūs ar konsultantu. Lūdzu, nepārtrauciet zvanu.');
      }
  
      twiml.dial({
        callerId:'+48732145722',
        timeout:60,
        machineDetection:'Enable',
        machineDetectionTimeout:15,
        waitUrl:'http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical',
        waitMethod:'GET',
        action:'/routeCall',
        method:'POST'
      }).number(agentNumber);
  
      return callback(null, twiml);
  
    } catch (err) {
      console.error('RouteCall fatal error:', err);
      twiml.say('Service temporarily unavailable.'); twiml.hangup();
      return callback(null, twiml);
    }
  };
  
  /* ------------------------------------------------------------------ */
  /* -----------------------  Helper functions  ----------------------- */
  /* ------------------------------------------------------------------ */
  
  async function searchCRM(context, phone) {
    const axios = require('axios');
    const token = (context.KOMMO_TOKEN_PART1||'')+(context.KOMMO_TOKEN_PART2||'')+
                  (context.KOMMO_TOKEN_PART3||'')+(context.KOMMO_TOKEN_PART4||'')+
                  (context.KOMMO_TOKEN_PART5||'');
    try {
      const { data } = await axios.get(
        `https://${context.KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts`,
        { params:{ query:phone.replace('+',''), limit:10 },
          headers:{ Authorization:`Bearer ${token}` }, timeout:2500 }
      );
      const c = data?._embedded?.contacts?.[0];
      return c ? { id:c.id, name:c.name||'Unnamed',
                   link:`https://${context.KOMMO_SUBDOMAIN}.kommo.com/contacts/detail/${c.id}` } : null;
    } catch(e){ console.error('CRM search err', e.message); return null; }
  }
  
  async function addNoteToCRM(context, id, text, type='common') {
    if (!id) return;
    const axios = require('axios');
    const token = (context.KOMMO_TOKEN_PART1||'')+(context.KOMMO_TOKEN_PART2||'')+
                  (context.KOMMO_TOKEN_PART3||'')+(context.KOMMO_TOKEN_PART4||'')+
                  (context.KOMMO_TOKEN_PART5||'');
    try {
      await axios.post(
        `https://${context.KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts/notes`,
        [{ entity_id:id, note_type:type, params:{ text } }],
        { headers:{ Authorization:`Bearer ${token}` } }
      );
    } catch(e){ console.error('AddNote err', e.message); }
  }
  
  /* ---------- first-alert SMS + lead HTML mail -------------- */
  async function sendNotifications(context, caller, digit, contact) {
    const twilio  = context.getTwilioClient();
    const FROM    = '+48732145722';
    const TO_SMS  = ['+905327994223', '+48732145722', '+447707964726'].filter(n=>n!==FROM);
    const langTxt = digit==='1' ? 'Polish' : 'Latvian';
  
    const smsBody = `🔔 Incoming call (${langTxt})\n☎ ${caller}\n` +
                    (contact ? `👤 ${contact.name}\n` : '') +
                    new Date().toLocaleString('tr-TR');
    await Promise.allSettled(
      TO_SMS.map(to => twilio.messages.create({ from:FROM, to, body:smsBody }))
    );
  
    try {
      const nodemailer = require('nodemailer');
      const tx = nodemailer.createTransport({
        host: context.EMAIL_HOST || 'server.plante.biz',
        port: 587, secure:false,
        auth:{ user:context.EMAIL_USER, pass:context.EMAIL_PASS },
        tls:{ rejectUnauthorized:false }
      });
      const leads = contact ? await getContactLeads(context, contact.id) : [];
      const html  = buildLeadEmail(caller, langTxt, contact, leads);
      await tx.sendMail({
        from: `"Happy Smile Call Alert" <${context.EMAIL_USER}>`,  // ← isim eklendi
        to:   'halilg@gmail.com, mahmut@recaikutlu.com, welcome-pl@happysmileclinics.com',
        subject:`Incoming Call (${langTxt}) – ${contact?contact.name+' – ':''}${caller}`,
        html
      });
    } catch(e){ console.error('Lead mail err', e.message); }
  }
  
  /* ---------- ONE summary e-mail (missed OR answered) ------ */
  async function sendFinalEmail(context, phone, contact, status, duration='0') {
    try {
      const nodemailer = require('nodemailer');
      const tx = nodemailer.createTransport({
        host: context.EMAIL_HOST || 'server.plante.biz',
        port: 587, secure:false,
        auth:{ user:context.EMAIL_USER, pass:context.EMAIL_PASS },
        tls:{ rejectUnauthorized:false }
      });
  
      const missed = status==='missed';
      const color  = missed ? '#dc2626' : '#16a34a';
      const title  = missed ? '❌ Missed Call' : '✅ Call Answered';
  
      let html = `<h2 style="color:${color};">${title}</h2>
                  <p><b>Phone:</b> ${phone}</p>`;
      if (contact) html += `<p><b>Contact:</b> ${contact.name}</p>`;
      if (!missed) html += `<p><b>Duration:</b> ${duration} seconds</p>`;
      html += `<p><b>Time:</b> ${new Date().toLocaleString('tr-TR')}</p>`;
  
      await tx.sendMail({
        from: `"Happy Smile Call Alert" <${context.EMAIL_USER}>`,  // ← isim eklendi
        to:   'halilg@gmail.com, mahmut@recaikutlu.com, welcome-pl@happysmileclinics.com',
        subject: `${title} – ${phone}`,
        html
      });
    } catch(e){ console.error('Final mail err', e.message); }
  }
  
  /* ---------- build HTML with leads --------------- */
  function buildLeadEmail(caller, language, contact, leads) { /* ... */ }
  
  /* ---------- fetch active leads of contact ------- */
  async function getContactLeads(context, cid) { /* ... */ }