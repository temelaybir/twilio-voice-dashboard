<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <title>Przypomnienie o darmowym spotkaniu dentystycznym</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
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

    /* CTA alanı */
    .cta-wrap {
      margin: 28px 0 10px;
    }

    .cta-btn {
      display: block;
      box-sizing: border-box;
      width: 100%;
      padding: 14px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .05em;
      text-align: center;
      border: none;
      margin-bottom: 10px;
    }

    .cta-btn.confirm {
      background: linear-gradient(135deg, #22c55e, #2dd4bf);
      color: #020617;
    }

    .cta-btn.next-event {
      background: transparent;
      border: 2px solid #f59e0b;
      color: #fbbf24;
    }

    .cta-btn.unsubscribe-btn {
      background: transparent;
      border: 2px solid #f87171;
      color: #fca5a5;
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
      .cta-btn {
        font-size: 12px;
        padding: 13px 14px;
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
        <h1>Darmowe spotkanie dentystyczne w {{listCityDisplay}}</h1>

        <p>
          Witam <strong>{{name}}</strong>,<br />
          zauważyliśmy, że wcześniej zapisał(a) się Pan/Pani na nasze wydarzenie,
          ale nie mógł/mogła Pan/Pani dotrzeć — absolutnie żaden problem.
          Ponownie będziemy w {{listCityDisplay}} i będzie nam bardzo miło,
          jeśli zechce Pan/Pani dołączyć.
        </p>

        <p>
          Proszę zaznaczyć swoją decyzję za pomocą poniższych przycisków.
          Jeśli nie chce Pan/Pani otrzymywać dalszych wiadomości, można kliknąć
          przycisk „Zrezygnuj z wiadomości”.
        </p>

        <div class="details">
          <p class="label">Daty wydarzenia</p>
          <p class="value">&#128197; {{listEventDates}}</p>

          <p class="label" style="margin-top:10px;">Miejsce</p>
          <p class="value">&#128205; {{listLocation}}</p>
        </div>

        <p>
          Na spotkaniu otrzymają Państwo informacje o naszej firmie, materiałach,
          na których pracujemy, oraz o cenach naszych usług. Decyzja o ewentualnym
          leczeniu należy wyłącznie do Pani/Pana.
        </p>

        <p>
          Czekamy na spotkanie i z przyjemnością wszystko wyjaśnimy!
        </p>

        <p>
          &#8505;&#65039; Spotkania odbywają się w Polsce i są całkowicie bezpłatne.
          Jeśli zdecydują się Państwo na leczenie, wszystkie zabiegi wykonujemy
          w naszej klinice w Stambule, w Turcji — nie prowadzimy zabiegów w Polsce.
          Oferujemy stomatologię ogólną i estetyczną, w tym implanty, licówki
          i kompleksowe metamorfozy uśmiechu. Jesteśmy kliniką prywatną
          (poza systemem ubezpieczeń).
        </p>

        <!-- CTA buttons -->
        <div class="cta-wrap">
          <a href="{{confirmSelectUrl}}" class="cta-btn confirm">
            &#10003; POTWIERDZAM UDZIAŁ
          </a>
          <a href="{{nextEventUrl}}" class="cta-btn next-event">
            &#128257; NASTĘPNE WYDARZENIE
          </a>
          <a href="{{unsubscribeUrl}}" class="cta-btn unsubscribe-btn">
            &#10060; ZREZYGNUJ Z WIADOMOŚCI
          </a>
        </div>

        <p style="font-size:12px;color:#9ca3af;margin-top:6px;">
          Jeśli masz dodatkowe pytania, możesz także odpowiedzieć na ten e-mail
          lub napisać do nas na WhatsApp.
        </p>
      </div>

      <!-- Footer -->
      <div class="footer">
        Ten e-mail został wysłany przez Happy Smile Clinics w związku z zapisaniem się
        na darmowe spotkanie dentystyczne w {{listCityDisplay}}.<br />
        Jeśli nie chcesz otrzymywać więcej takich wiadomości, możesz zrezygnować tutaj:
        <a href="{{unsubscribeUrl}}" style="color:#e5e7eb;">anuluj subskrypcję</a>.
        <br /><br />
        Odwiedź naszą stronę:
        <a href="https://happysmileclinics.com" style="color:#e5e7eb;" target="_blank" rel="noopener">
          happysmileclinics.com
        </a>
        <br />
        Śledź nas na Instagramie:
        <a href="https://instagram.com/happysmileclinicstr" style="color:#e5e7eb;" target="_blank" rel="noopener">
          @happysmileclinicstr
        </a>
      </div>
    </div>
  </div>
</body>
</html>
