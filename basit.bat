@echo off
echo === Twilio Voice Dashboard - Local Development ===
echo.

REM Sistem kontrolleri
if not exist voice-dashboard (
  echo HATA: voice-dashboard klasoru bulunamadi!
  pause
  exit /b 1
)

if not exist .env (
  echo HATA: .env dosyasi bulunamadi!
  echo Lutfen env.example dosyasini .env olarak kopyalayin ve gerekli bilgileri doldurun.
  echo.
  echo Ornek: copy env.example .env
  pause
  exit /b 1
)

if not exist voice-dashboard\.env.local (
  echo HATA: voice-dashboard\.env.local dosyasi bulunamadi!
  echo Lutfen voice-dashboard\env.local.example dosyasini .env.local olarak kopyalayin.
  echo.
  echo Ornek: copy voice-dashboard\env.local.example voice-dashboard\.env.local
  pause
  exit /b 1
)

echo [1/3] Backend baslatiliyor...
start "Backend" cmd /k "npm run dev"
timeout /t 3 > nul

echo [2/3] Frontend baslatiliyor...
cd /d voice-dashboard
start "Frontend" cmd /k "npm run dev"
cd ..
timeout /t 5 > nul

echo [3/3] Dashboard aciliyor...
start "" "http://localhost:3000"

echo.
echo === HAZIR ===
echo.
echo Frontend Dashboard: http://localhost:3000
echo Backend API: http://localhost:3001
echo.
echo NOT: Production ortami icin 'vercel' komutunu kullanin.
echo Detayli bilgi: docs/DEPLOYMENT_GUIDE.md
echo.
pause 