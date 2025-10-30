#!/usr/bin/env node

/**
 * Email Rapor Ayarları Setup Helper
 * 
 * Bu script .env dosyanıza email ayarlarını ekler
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('═'.repeat(60));
  console.log('📧 Günlük Email Raporu - Kurulum Sihirbazı');
  console.log('═'.repeat(60));
  console.log();
  
  try {
    // .env dosyası yolu
    const envPath = path.join(__dirname, '..', '.env');
    
    // Mevcut .env dosyasını oku
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✅ .env dosyası bulundu');
    } else {
      console.log('⚠️  .env dosyası bulunamadı, yeni oluşturulacak');
    }
    
    console.log();
    console.log('Lütfen email ayarlarınızı girin:');
    console.log('(Gmail kullanıyorsanız, App Password gerekir)');
    console.log();
    
    // Kullanıcıdan bilgileri al
    const emailHost = await question('SMTP Host (örn: smtp.gmail.com): ') || 'smtp.gmail.com';
    const emailPort = await question('SMTP Port (587 veya 465): ') || '587';
    const emailSecure = emailPort === '465' ? 'true' : 'false';
    const emailUser = await question('Email adresi: ');
    const emailPassword = await question('Email şifresi (Gmail için App Password): ');
    const emailTo = await question('Rapor alacak email: ');
    const clinicName = await question('Klinik adı (örn: Happy Smile Clinics): ') || 'Happy Smile Clinics';
    const backendUrl = await question('Backend URL (örn: http://localhost:3001): ') || 'http://localhost:3001';
    
    console.log();
    console.log('═'.repeat(60));
    
    // Email ayarlarını kontrol et
    if (!emailUser || !emailPassword || !emailTo) {
      throw new Error('Email adresi, şifre ve alıcı adresi zorunludur!');
    }
    
    // Yeni ayarları oluştur
    const newSettings = `

# ==========================================
# Email Rapor Ayarları (Otomatik Eklendi)
# ==========================================

# Backend API URL
BACKEND_API_URL=${backendUrl}

# SMTP Ayarları
EMAIL_HOST=${emailHost}
EMAIL_PORT=${emailPort}
EMAIL_SECURE=${emailSecure}

# Email Kimlik Bilgileri
EMAIL_USER=${emailUser}
EMAIL_PASSWORD=${emailPassword}

# Gönderen ve Alıcı
EMAIL_FROM=${emailUser}
EMAIL_TO=${emailTo}

# Klinik Bilgileri
CLINIC_NAME=${clinicName}
`;
    
    // Email ayarlarının zaten var olup olmadığını kontrol et
    if (envContent.includes('EMAIL_USER') || envContent.includes('Email Rapor Ayarları')) {
      console.log('⚠️  Email ayarları zaten mevcut!');
      const overwrite = await question('Üzerine yazmak ister misiniz? (y/n): ');
      
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('❌ İşlem iptal edildi');
        rl.close();
        return;
      }
      
      // Eski email ayarlarını kaldır
      envContent = envContent.replace(/# ={40,}\n# Email Rapor Ayarları.*?\n# ={40,}\n[\s\S]*?(?=\n#|$)/g, '');
    }
    
    // Yeni ayarları ekle
    envContent += newSettings;
    
    // .env dosyasına yaz
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Email ayarları başarıyla .env dosyasına eklendi!');
    console.log();
    console.log('═'.repeat(60));
    console.log('📋 Eklenen Ayarlar:');
    console.log('═'.repeat(60));
    console.log(`SMTP Host: ${emailHost}`);
    console.log(`SMTP Port: ${emailPort}`);
    console.log(`Email: ${emailUser}`);
    console.log(`Alıcı: ${emailTo}`);
    console.log(`Klinik: ${clinicName}`);
    console.log(`Backend: ${backendUrl}`);
    console.log('═'.repeat(60));
    console.log();
    console.log('🎯 Sonraki Adımlar:');
    console.log();
    console.log('1. Backend\'i başlatın:');
    console.log('   npm run dev');
    console.log();
    console.log('2. Email raporunu test edin:');
    console.log('   npm run report');
    console.log();
    console.log('3. Plesk\'te cron job kurun (EMAIL_REPORT_QUICKSTART.md\'ye bakın)');
    console.log();
    console.log('✨ Kurulum tamamlandı! İyi çalışmalar!');
    
  } catch (error) {
    console.error();
    console.error('❌ Hata:', error.message);
    console.error();
  } finally {
    rl.close();
  }
}

main();

