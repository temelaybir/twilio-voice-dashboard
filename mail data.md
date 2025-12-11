Delivered-To: halilg@gmail.com
Received: by 2002:a05:6f02:c71b:b0:10f:b009:8d12 with SMTP id t27csp820337rcf;
        Thu, 11 Dec 2025 04:42:40 -0800 (PST)
X-Received: by 2002:ac8:5946:0:b0:4ee:1aac:8d48 with SMTP id d75a77b69052e-4f1b1acab49mr85380311cf.48.1765456959936;
        Thu, 11 Dec 2025 04:42:39 -0800 (PST)
ARC-Seal: i=1; a=rsa-sha256; t=1765456959; cv=none;
        d=google.com; s=arc-20240605;
        b=C0Ip/7HUGRUVJmxfR0F/RM16bMPTFD8MpmnUgBi2NNdAdf0i8v5YkAnnHuJByc90C+
         MnA8veRMXcYgsjeytxWHq53X+qGJD7s3rPKroeUr/+Z+N97lh2nLh+NGUR9wOgt6JP42
         BR2c3MboiGir7t5J5FWj3VmKmbGI/6kTqYn+c+5tKd61O13kgLujPvCOe50ZGVrM2Ppi
         VbMNbemGrHOeJBWdmx3R9M03lQ8UMnFCiQscV7BPvBAKGv3kZpjSjdzvbUPX5mNbRVNh
         Zco+5IWz5oEndQpSY42jTafluoHPgqy1nFq8upopgi9XhhJ3OZ5TyplNeK72m1k88wYe
         TOXA==
ARC-Message-Signature: i=1; a=rsa-sha256; c=relaxed/relaxed; d=google.com; s=arc-20240605;
        h=mime-version:date:content-transfer-encoding:message-id:subject:to
         :from:list-unsubscribe-post:list-unsubscribe:dkim-signature;
        bh=Ph5xi+JZgdwtZAxuuyMsZphvwUbBRucpcdKCjvWRfdE=;
        fh=kk12vT10+tr9mswHIxoZb2GFGCNVtfB+KsySjCVL8F8=;
        b=SQKJUEcbunA/oAUEkGjiS3fHlCp3GBHTjMPLkvyAN9oV2h5C097eLvKLPwE+pTejx5
         q9KWDLA0/83Ppcnd82Iee5WPsisprcS2OTDa2oqvLUzRPw3cUOPpsOpj/RufMkPI06Jr
         byKdBfKxzPlNFgZBHrL53X+LRllZUqbehNGAO+JTYayi7fI2UN2svhplg6SM4OKLQmbi
         GRvH/u28Q/IzC14+BHBDNjOJqND8/dWOh0lYCcZSM+LYkGnOlA1gc4JwHj2oQa3H6AHD
         t3yZJWWxOrzPMIzuJRr6znGmV8+GXj2+fJzoldpRlWrkVa0JJDxnmyen6WC2VdlN8rwL
         Awrg==;
        dara=google.com
ARC-Authentication-Results: i=1; mx.google.com;
       dkim=pass header.i=@happysmileclinics-com.20230601.gappssmtp.com header.s=20230601 header.b=xrGwo2J4;
       spf=pass (google.com: domain of welcome-pl@happysmileclinics.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=welcome-pl@happysmileclinics.com;
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=happysmileclinics.com;
       dara=pass header.i=@gmail.com
Return-Path: <welcome-pl@happysmileclinics.com>
Received: from mail-sor-f41.google.com (mail-sor-f41.google.com. [209.85.220.41])
        by mx.google.com with SMTPS id d75a77b69052e-4f1bd6a165bsor15206341cf.12.2025.12.11.04.42.39
        for <halilg@gmail.com>
        (Google Transport Security);
        Thu, 11 Dec 2025 04:42:39 -0800 (PST)
Received-SPF: pass (google.com: domain of welcome-pl@happysmileclinics.com designates 209.85.220.41 as permitted sender) client-ip=209.85.220.41;
Authentication-Results: mx.google.com;
       dkim=pass header.i=@happysmileclinics-com.20230601.gappssmtp.com header.s=20230601 header.b=xrGwo2J4;
       spf=pass (google.com: domain of welcome-pl@happysmileclinics.com designates 209.85.220.41 as permitted sender) smtp.mailfrom=welcome-pl@happysmileclinics.com;
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=happysmileclinics.com;
       dara=pass header.i=@gmail.com
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=happysmileclinics-com.20230601.gappssmtp.com; s=20230601; t=1765456959; x=1766061759; dara=google.com;
        h=mime-version:date:content-transfer-encoding:message-id:subject:to
         :from:list-unsubscribe-post:list-unsubscribe:from:to:cc:subject:date
         :message-id:reply-to;
        bh=Ph5xi+JZgdwtZAxuuyMsZphvwUbBRucpcdKCjvWRfdE=;
        b=xrGwo2J4dAcl8Hd0oldt1CpGRLzNoeFWLjEw8VGPZx+iTYyrbFg2VHpet3PRJvN5FC
         6LZafYSk1N6x+rrL0sU0nnXujtHNBM+40AQtHgUpjJgMrbXMZ+9P6Y2oL5dHZtp70qyY
         j+I0hfNZSGHS3MzjFFuS/YIXsgj7JP6wFCLzuihwxgKJpbmCMzsK6Vq544dsLCwFeP2B
         D/Ic+UrgzeLE5fuiOUx/x7fjzJxd9UT43s1hdw+DVMwR0orUTIWeLPgRcXB/CXrA/bNJ
         JWe7gZAXkFEjpz7i6zqUcyBpqgdZQ3SMrXnRSMU8tgHVcYrU58Vth+YWmv9NJZbJPKyC
         carw==
X-Google-DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed;
        d=1e100.net; s=20230601; t=1765456959; x=1766061759;
        h=mime-version:date:content-transfer-encoding:message-id:subject:to
         :from:list-unsubscribe-post:list-unsubscribe:x-gm-gg
         :x-gm-message-state:from:to:cc:subject:date:message-id:reply-to;
        bh=Ph5xi+JZgdwtZAxuuyMsZphvwUbBRucpcdKCjvWRfdE=;
        b=geDThYY0tusUdX6S8BkVVjShy9WmCeO+yJeA6V531PdQR26sLbz3n8ZnLLoDQNggQk
         xUYqqLY9I8oHd2X4fUirvAy6AV9yYAbpfIpoTxRkS3vZu4dn5J2/EFQisv3NGMplkxd8
         x0uIijC6wwuIJmRf8MGSsc9aGBs58WpYFS4joaKLjhZ9cZIh2kHAI7EZQq+yKmrcCEw9
         qtAxIUlu5elzdXYrvIjsy69qaCMVy6Kl38VqtbYM5gyoAOBHo+gTHxtUsX9BvIbaLyGh
         /03swJTVGbhP4+mb4J5kyp+wuo4ZJArRyWXLCnBcon984lVy78ETfL2CiltXeu8v+/xl
         Erlg==
X-Gm-Message-State: AOJu0YzI7Mo+wn8uTAciq6i8FFqsmfvbz8aiWQfKDHulSczDw1rtmqv9 s/8M2E1v3zCHjFDSM/YsCYa3u0x04iOGWTyozH/aUDHNbKVhVG/AYxBpoA35uF+CG7Hzxn0bDjx 4cQMXApAawpEf
X-Gm-Gg: AY/fxX6R8FfHZQSNmqIgBItqDRhQyXrOogTV68CG/SI8Krk9lO39cF9gH6mrWoW3w6y KUenou2fKDLXk46sSNcZdCGCrX3GvE2a6gE7K8ieRFl76sOPtb6/sjM2FWgboRak+LpYcyWkT0x Ads3x49jqAMAWmfF1GFkJ1NUwX+Ezi5i36SN4/WRekPkP/7+Z5QJg5NpTpOqzquFsV1ZVYpPpyW wmJch9HYeXDB4G3BB3VMY8yTMWDPEk24zF3Uofmn94ShUds4nN+mKv+jBwcQ4Z9ypt/ufMQvngt A+j+4IABAgapD1n9R9bX5N8A7+ImbRfEht+iDVc6qgDztbHXiqtnryGlSuGcrSJ5WYxrkiagrKB G2DjmptEs8RXwhqWuTDpKVDJR7lrVpeREbV9ZqM4VQaj1fd4z8NUqdLKqeika0T4UaJ4dQ6q0y+ QY7AU2gOo5nQVpUepsOe7JUWbFGcLU3dl3ANM3gf0vE4Y38Wnf6slCUe2BMTMmBhAIaL1rywL82 UkBKPEViqmJnXI=
X-Google-Smtp-Source: AGHT+IEt8V70QOLnAIktVANLfDbiDb5GDrd1rVUDC6a6d4NGhbH2+jP6feaMSt1JWWcH58f8ho+Ccg==
X-Received: by 2002:a05:622a:4816:b0:4ee:61f8:68d6 with SMTP id d75a77b69052e-4f1b19d282cmr74507211cf.6.1765456958985;
        Thu, 11 Dec 2025 04:42:38 -0800 (PST)
Return-Path: <welcome-pl@happysmileclinics.com>
Received: from [169.254.59.55] (ec2-107-20-56-137.compute-1.amazonaws.com. [107.20.56.137])
        by smtp.gmail.com with ESMTPSA id af79cd13be357-8bab544b5d3sm209498785a.4.2025.12.11.04.42.37
        for <halilg@gmail.com>
        (version=TLS1_3 cipher=TLS_AES_256_GCM_SHA384 bits=256/256);
        Thu, 11 Dec 2025 04:42:37 -0800 (PST)
List-Unsubscribe: <https://happysmileclinics.net/api/email/unsubscribe/e504d772b9a41469b8f784444d2b0228aefdaa33218755a30014b0e0a7ff718c>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
X-Campaign-ID: 38
From: Happy Smile Clinics <welcome-pl@happysmileclinics.com>
To: halilg@gmail.com
Subject: 🦷 HALİL, wracamy do Warszawie – czy dołączysz do darmowego spotkania dentystycznego?
Message-ID: <ac099460-6f56-c9e6-85f2-a8c8efed4270@happysmileclinics.com>
Content-Transfer-Encoding: quoted-printable
Date: Thu, 11 Dec 2025 12:42:37 +0000
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html lang=3D"pl">
<head>
  <meta charset=3D"UTF-8" />
  <title>Przypomnienie o darmowym spotkaniu dentystycznym</title>
  <meta name=3D"viewport" content=3D"width=3Ddevice-width, initial-scale=3D=
1.0" />
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sa=
ns-serif;
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
      background: radial-gradient(circle at top left, #22d3ee 0, #0f172a 45=
%);
    }
    .logo {
      height: 36px;
    }

    .content {
      padding: 24px 26px 26px;
      color: #e5e7eb;
      font-size: 14px;
      line-height: 1.6;
      background: radial-gradient(circle at top, rgba(56,189,248,0.07), #02=
0617 60%);
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

    /* CTA alan=C4=B1 */
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
  <div class=3D"wrapper">
    <div class=3D"card">
      <!-- Top bar with logo -->
      <div class=3D"top-bar">
        <img
          src=3D"https://happysmileclinics.com/wp-content/uploads/2024/12/h=
appy-smile-clinics-180x52.png"
          alt=3D"Happy Smile Clinics"
          class=3D"logo"
        />
      </div>

      <!-- Main content -->
      <div class=3D"content">
        <h2>Przypomnienie wizyty</h2>
        <h1>Darmowe spotkanie dentystyczne w Warszawie</h1>

        <p>
          Witam <strong>HAL=C4=B0L</strong>,<br />
          zauwa=C5=BCyli=C5=9Bmy, =C5=BCe wcze=C5=9Bniej zapisa=C5=82(a) si=
=C4=99 Pan/Pani na nasze wydarzenie,
          ale nie m=C3=B3g=C5=82/mog=C5=82a Pan/Pani dotrze=C4=87 =E2=80=94=
 absolutnie =C5=BCaden problem.
          Ponownie b=C4=99dziemy w Warszawie i b=C4=99dzie nam bardzo mi=C5=
=82o,
          je=C5=9Bli zechce Pan/Pani do=C5=82=C4=85czy=C4=87.
        </p>

        <p>
          Prosz=C4=99 zaznaczy=C4=87 swoj=C4=85 decyzj=C4=99 za pomoc=C4=85=
 poni=C5=BCszych przycisk=C3=B3w.
          Je=C5=9Bli nie chce Pan/Pani otrzymywa=C4=87 dalszych wiadomo=C5=
=9Bci, mo=C5=BCna klikn=C4=85=C4=87
          przycisk =E2=80=9EZrezygnuj z wiadomo=C5=9Bci=E2=80=9D.
        </p>

        <div class=3D"details">
          <p class=3D"label">Daty wydarzenia</p>
          <p class=3D"value">&#128197; 12 grudnia - 13 grudnia</p>

          <p class=3D"label" style=3D"margin-top:10px;">Miejsce</p>
          <p class=3D"value">&#128205; Radisson Blu Sobieski Hotel, plac Ar=
tura Zawiszy 1, 02-025 Warszawa</p>
        </div>

        <p>
          Na spotkaniu otrzymaj=C4=85 Pa=C5=84stwo informacje o naszej firm=
ie, materia=C5=82ach,
          na kt=C3=B3rych pracujemy, oraz o cenach naszych us=C5=82ug. Decy=
zja o ewentualnym
          leczeniu nale=C5=BCy wy=C5=82=C4=85cznie do Pani/Pana.
        </p>

        <p>
          Czekamy na spotkanie i z przyjemno=C5=9Bci=C4=85 wszystko wyja=C5=
=9Bnimy!
        </p>

        <p>
          &#8505;&#65039; Spotkania odbywaj=C4=85 si=C4=99 w Polsce i s=C4=
=85 ca=C5=82kowicie bezp=C5=82atne.
          Je=C5=9Bli zdecyduj=C4=85 si=C4=99 Pa=C5=84stwo na leczenie, wszy=
stkie zabiegi wykonujemy
          w naszej klinice w Stambule, w Turcji =E2=80=94 nie prowadzimy za=
bieg=C3=B3w w Polsce.
          Oferujemy stomatologi=C4=99 og=C3=B3ln=C4=85 i estetyczn=C4=85, w=
 tym implanty, lic=C3=B3wki
          i kompleksowe metamorfozy u=C5=9Bmiechu. Jeste=C5=9Bmy klinik=C4=
=85 prywatn=C4=85
          (poza systemem ubezpiecze=C5=84).
        </p>

        <!-- CTA buttons -->
        <div class=3D"cta-wrap">
          <a href=3D"{{confirmSelectUrl}}" class=3D"cta-btn confirm">
            &#10003; POTWIERDZAM UDZIA=C5=81
          </a>
          <a href=3D"{{nextEventUrl}}" class=3D"cta-btn next-event">
            &#128257; NAST=C4=98PNE WYDARZENIE
          </a>
          <a href=3D"https://happysmileclinics.net/api/email/unsubscribe/e5=
04d772b9a41469b8f784444d2b0228aefdaa33218755a30014b0e0a7ff718c" class=3D"ct=
a-btn unsubscribe-btn">
            &#10060; ZREZYGNUJ Z WIADOMO=C5=9ACI
          </a>
        </div>

        <p style=3D"font-size:12px;color:#9ca3af;margin-top:6px;">
          Je=C5=9Bli masz dodatkowe pytania, mo=C5=BCesz tak=C5=BCe odpowie=
dzie=C4=87 na ten e-mail
          lub napisa=C4=87 do nas na WhatsApp.
        </p>
      </div>

      <!-- Footer -->
      <div class=3D"footer">
        Ten e-mail zosta=C5=82 wys=C5=82any przez Happy Smile Clinics w zwi=
=C4=85zku z zapisaniem si=C4=99
        na darmowe spotkanie dentystyczne w Warszawie.<br />
        Je=C5=9Bli nie chcesz otrzymywa=C4=87 wi=C4=99cej takich wiadomo=C5=
=9Bci, mo=C5=BCesz zrezygnowa=C4=87 tutaj:
        <a href=3D"https://happysmileclinics.net/api/email/unsubscribe/e504=
d772b9a41469b8f784444d2b0228aefdaa33218755a30014b0e0a7ff718c" style=3D"colo=
r:#e5e7eb;">anuluj subskrypcj=C4=99</a>.
        <br /><br />
        Odwied=C5=BA nasz=C4=85 stron=C4=99:
        <a href=3D"https://happysmileclinics.com" style=3D"color:#e5e7eb;" =
target=3D"_blank" rel=3D"noopener">
          happysmileclinics.com
        </a>
        <br />
        =C5=9Aled=C5=BA nas na Instagramie:
        <a href=3D"https://instagram.com/happysmileclinicstr" style=3D"colo=
r:#e5e7eb;" target=3D"_blank" rel=3D"noopener">
          @happysmileclinicstr
        </a>
      </div>
    </div>
  </div>

    <div style=3D"margin-top: 30px; padding-top: 20px; border-top: 1px soli=
d #eee; text-align: center; font-size: 12px; color: #666;">
      <p>Bu e-postay=C4=B1 almak istemiyorsan=C4=B1z, <a href=3D"https://ha=
ppysmileclinics.net/api/email/unsubscribe/e504d772b9a41469b8f784444d2b0228a=
efdaa33218755a30014b0e0a7ff718c" style=3D"color: #666;">buraya t=C4=B1klaya=
rak</a> aboneli=C4=9Finizi iptal edebilirsiniz.</p>
    </div>
  </body>
</html>