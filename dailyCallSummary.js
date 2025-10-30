/**********************************************************************
  /dailyCallSummary – Happy Smile Clinics
  Daily call summary (last 24h, Istanbul TZ)
  Includes inbound/outbound stats, averages, longest call, today's count
**********************************************************************/

exports.handler = async function (context, event, callback) {
    const axios = require("axios");
    const nodemailer = require("nodemailer");
  
    try {
      /* ---------- 1. TIME RANGE: Today in Istanbul ---------- */
      const now = new Date();
      const tzOffset = 3 * 60 * 60 * 1000; // Istanbul (UTC+3)
      const endTime = new Date(now.getTime() + tzOffset);
      const startTime = new Date(endTime);
      startTime.setHours(0, 0, 0, 0);
      endTime.setHours(23, 59, 59, 999);
  
      const todayLabel = startTime.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  
      /* ---------- 2. FETCH CALL DATA ---------- */
      const { data } = await axios.get(
        `https://api.twilio.com/2010-04-01/Accounts/${context.ACCOUNT_SID}/Calls.json`,
        {
          auth: { username: context.ACCOUNT_SID, password: context.AUTH_TOKEN },
          params: {
            StartTimeAfter: startTime.toISOString(),
            StartTimeBefore: endTime.toISOString(),
            PageSize: 1000,
          },
        }
      );
  
      const calls = (data.calls || []).filter((c) => !c.parent_call_sid);
  
      /* ---------- 3. SPLIT INBOUND / OUTBOUND ---------- */
      const inbound = calls.filter((c) => c.direction === "inbound");
      const outbound = calls.filter((c) => c.direction.includes("outbound"));
  
      // sort by start time ascending
      inbound.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      outbound.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  
      /* ---------- 4. BASIC STATS ---------- */
      const sum = (arr) => arr.reduce((a, b) => a + b, 0);
      const avg = (arr) => (arr.length ? Math.round(sum(arr) / arr.length) : 0);
      const max = (arr) => (arr.length ? Math.max(...arr) : 0);
  
      const inDur = inbound.map((c) => parseInt(c.duration || 0));
      const outDur = outbound.map((c) => parseInt(c.duration || 0));
  
      const inboundAvg = avg(inDur);
      const outboundAvg = avg(outDur);
      const inboundMax = max(inDur);
      const outboundMax = max(outDur);
      const inboundTotal = sum(inDur);
      const outboundTotal = sum(outDur);
  
      const answeredInbound = inbound.filter((c) => c.status === "completed").length;
      const missedInbound = inbound.length - answeredInbound;
      const completedOutbound = outbound.filter((c) => c.status === "completed").length;
      const failedOutbound = outbound.length - completedOutbound;
      const missedRatio =
        inbound.length > 0 ? ((missedInbound / inbound.length) * 100).toFixed(1) : 0;
  
      /* ---------- 5. TABLE BUILDER ---------- */
      function tableRows(list, type) {
        return list
          .map((c) => {
            const d = new Date(c.start_time);
            const dateStr = d.toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "2-digit",
            });
            const timeStr = d.toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const num = type === "in" ? c.from : c.to;
            const dur = c.duration || 0;
            const emoji = c.status === "completed" ? "✅" : "❌";
            const col = c.status === "completed" ? "#16a34a" : "#dc2626";
            return `<tr>
                <td>${dateStr} ${timeStr}</td>
                <td>${num}</td>
                <td style="color:${col};">${emoji} ${c.status}</td>
                <td>${dur}</td>
              </tr>`;
          })
          .join("");
      }
  
      /* ---------- 6. HTML OUTPUT ---------- */
      const html = `
        <div style="font-family:Arial,sans-serif">
          <h2>📞 Günlük Çağrı Özeti – ${todayLabel}</h2>
  
          <h3>Inbound Çağrılar</h3>
          <p><b>Toplam:</b> ${inbound.length} | <b>Cevaplanan:</b> ${answeredInbound} | <b>Kaçırılan:</b> ${missedInbound}</p>
          <p><b>Kaçırılma Oranı:</b> ${missedRatio}% | <b>Toplam Süre:</b> ${inboundTotal}s</p>
          <p><b>Ortalama Süre:</b> ${inboundAvg}s | <b>En Uzun Çağrı:</b> ${inboundMax}s</p>
          <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;max-width:800px;">
            <tr style="background:#f3f4f6;"><th>Tarih & Saat</th><th>Arayan</th><th>Durum</th><th>Süre (sn)</th></tr>
            ${tableRows(inbound, "in")}
          </table>
  
          <h3 style="margin-top:30px;">Outbound Çağrılar</h3>
          <p><b>Toplam:</b> ${outbound.length} | <b>Tamamlanan:</b> ${completedOutbound} | <b>Başarısız:</b> ${failedOutbound}</p>
          <p><b>Toplam Süre:</b> ${outboundTotal}s | <b>Ortalama Süre:</b> ${outboundAvg}s | <b>En Uzun Çağrı:</b> ${outboundMax}s</p>
          <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;max-width:800px;">
            <tr style="background:#f3f4f6;"><th>Tarih & Saat</th><th>Aranan</th><th>Durum</th><th>Süre (sn)</th></tr>
            ${tableRows(outbound, "out")}
          </table>
  
          <p style="margin-top:20px;font-size:12px;color:#777">
            Otomatik olarak Happy Smile Clinics – Twilio Fonksiyonu tarafından oluşturulmuştur.<br>
            Bugün (${todayLabel}) toplam çağrı sayısı: <b>${calls.length}</b><br>
            Toplam Süre: <b>${inboundTotal + outboundTotal}s</b>
          </p>
        </div>
      `;
  
      /* ---------- 7. SEND EMAIL ---------- */
      const transporter = nodemailer.createTransport({
        host: context.EMAIL_HOST || "server.plante.biz",
        port: 587,
        secure: false,
        auth: { user: context.EMAIL_USER, pass: context.EMAIL_PASS },
        tls: { rejectUnauthorized: false },
      });
  
      await transporter.sendMail({
        from: `"Daily Report – Happy Smile Clinics" <${context.EMAIL_USER}>`,
        to: "mahmut@recaikutlu.com, halilg@gmail.com, fatih.turkseven@hsctr.com",
        subject: `📊 Günlük Çağrı Özeti – ${todayLabel}`,
        html,
      });
  
      console.log("✅ Günlük çağrı özeti başarıyla gönderildi!");
      return callback(null, "Success");
    } catch (err) {
      console.error("❌ Günlük raporda hata:", err);
      return callback(err);
    }
  };
  