<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <title>Przypomnienie o spotkaniu dentystycznym</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a; /* koyu arka plan */
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    }
    a { text-decoration: none; }

    .wrapper {
      width: 100%;
      padding: 32px 12px;
      box-sizing: border-box;
    }

    .card {
      max-width: 640px;
      margin: 0 auto;
      background: #020617;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 45px rgba(15,23,42,0.5);
      border: 1px solid rgba(148,163,184,0.25);
    }

    .top-bar {
      padding: 18px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: radial-gradient(circle at top left, #22d3ee 0, #0f172a 45%);
    }
    .logo {
      height: 36px;
    }
    .brand-text {
      color: #e5e7eb;
      font-size: 13px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .hero img {
      display: block;
      width: 100%;
      height: auto;
    }

    .content {
      padding: 24px 26px 26px;
      color: #e5e7eb;
      font-size: 14px;
      line-height: 1.6;
      background: radial-gradient(circle at top, rgba(56,189,248,0.07), #020617 60%);
    }

    .content h1 {
      margin: 0 0 8px;
      font-size: 20px;
      color: #f9fafb;
      letter-spacing: .02em;
    }
    .content h2 {
      margin: 0 0 16px;
      font-size: 14px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: .18em;
      color: #38bdf8;
    }

    .details {
      margin: 18px 0;
      padding: 14px 16px;
      background: rgba(15,23,42,0.9);
      border-radius: 12px;
      border: 1px solid rgba(148,163,184,0.4);
      font-size: 13px;
    }
    .details p {
      margin: 4px 0;
    }

    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .16em;
      color: #9ca3af;
    }

    .value {
      font-size: 13px;
      color: #e5e7eb;
    }

    .cta-wrap {
      margin: 22px 0 8px;
      text-align: left;
    }
    .cta-button {
      display: inline-block;
      padding: 10px 22px;
      border-radius: 999px;
      background: linear-gradient(135deg, #22c55e, #2dd4bf);
      color: #020617;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .12em;
    }

    .footer {
      padding: 14px 26px 20px;
      font-size: 11px;
      color: #9ca3af;
      background: #020617;
      border-top: 1px solid rgba(31,41,55,0.9);
    }

    @media (max-width: 600px) {
      .content, .footer, .top-bar {
        padding-left: 18px !important;
        padding-right: 18px !important;
      }
      .content h1 {
        font-size: 18px;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <!-- Top bar with logo -->
      <div class="top-bar">
        <img
          src="https://happysmileclinics.com/wp-content/uploads/2024/12/happy-smile-clinics-180x52.png"
          alt="Happy Smile Clinics"
          class="logo"
        />
      </div>
      <!-- Main content -->
      <div class="content">
        <h2>Przypomnienie wizyty</h2>
        <h1>Twoje spotkanie dentystyczne w {{listCityDisplay}}</h1>

        <p>
          Witam <strong>{{name}}</strong>,<br />
          przypominamy o Twoim spotkaniu dentystycznym w {{listCityDisplay}}, które odbędzie się
          <strong>{{listEventDates}}</strong> o <strong>{{eventTime}}</strong>.
        </p>

        <div class="details">
          <p class="label">Miejsce</p>
          <p class="value">{{listLocation}}</p>

          <p class="label" style="margin-top:10px;">Data i godzina</p>
          <p class="value">{{listEventDates}}, {{eventTime}}</p>
        </div>

        <p>
          To ważne, aby pojawić się w ustalonym czasie, dlatego prosimy o krótką informację,
          jeśli Twoje plany ulegną zmianie.
        </p>

        <div class="cta-wrap">
          <a href="{{confirmUrl}}" class="cta-button">
            Potwierdź wizytę
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;margin-top:6px;">
          Jeśli chcesz zmienić termin lub masz dodatkowe pytania, po prostu odpowiedz na ten e-mail
          lub napisz do nas na WhatsApp.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        Ten e-mail został wysłany przez Happy Smile Clinics w celu przypomnienia o zaplanowanej wizycie.
        Jeśli otrzymałeś go przypadkowo, prosimy o kontakt z naszym zespołem.
      </div>
    </div>
  </div>
</body>
</html>
