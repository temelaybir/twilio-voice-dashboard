#!/usr/bin/env php
<?php
/**
 * Günlük Email Raporu Gönderme Script
 * 
 * Bu script Plesk cron job'dan çalıştırılmak üzere tasarlanmıştır.
 * Sadece localhost'tan çağrılabilir (güvenlik için).
 * 
 * Kullanım:
 *   php scripts/send-daily-email.php
 *   php scripts/send-daily-email.php --yesterday
 *   php scripts/send-daily-email.php --date=2025-11-02
 */

// Sadece CLI'dan çalıştırılabilir
if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    die(json_encode(['error' => 'This script can only be run from command line']));
}

// Hata raporlama
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Konfigürasyon - .env dosyasından okuma (güvenli)
function loadEnv($filePath) {
    if (!file_exists($filePath)) {
        echo "⚠️  .env dosyası bulunamadı: $filePath\n";
        return [];
    }
    
    // Güvenlik: Dosya okunabilir mi kontrol et
    if (!is_readable($filePath)) {
        echo "❌ HATA: .env dosyası okunamıyor (izin problemi)\n";
        exit(1);
    }
    
    // Güvenlik: Dosya gerçekten bir dosya mı kontrol et (symlink değil)
    if (!is_file($filePath)) {
        echo "❌ HATA: .env geçerli bir dosya değil\n";
        exit(1);
    }
    
    // Dosya içeriğini güvenli şekilde oku
    $content = @file_get_contents($filePath);
    if ($content === false) {
        echo "❌ HATA: .env dosyası okunamadı\n";
        exit(1);
    }
    
    $env = [];
    $lines = explode("\n", $content);
    
    foreach ($lines as $line) {
        $line = trim($line);
        
        // Boş satır veya yorum satırı
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        
        // KEY=VALUE formatı kontrolü
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Güvenlik: Sadece alfanümerik ve alt çizgi karakterlerine izin ver
            if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $key)) {
                continue; // Geçersiz key, atla
            }
            
            // Tırnak işaretlerini kaldır
            $value = trim($value, '"\'');
            
            // Güvenlik: Değerde özel karakterler varsa temizle (PHP 8.1+ uyumlu)
            if (function_exists('filter_var') && defined('FILTER_SANITIZE_FULL_SPECIAL_CHARS')) {
                $value = htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            }
            
            $env[$key] = $value;
        }
    }
    
    return $env;
}

// .env dosyasını yükle (güvenli path)
$envPath = realpath(__DIR__ . '/../.env');

// Güvenlik: Path traversal saldırısını önle
if ($envPath === false || strpos($envPath, realpath(__DIR__ . '/..')) !== 0) {
    echo "❌ HATA: Geçersiz .env dosyası yolu\n";
    exit(1);
}

$env = loadEnv($envPath);

// Gerekli environment variables
$backendUrl = $env['BACKEND_API_URL'] ?? 'https://twilio-voice-dashboard.vercel.app';
$apiKey = $env['EMAIL_REPORT_API_KEY'] ?? '';

// Güvenlik: Backend URL doğrulaması
if (!filter_var($backendUrl, FILTER_VALIDATE_URL)) {
    echo "❌ HATA: BACKEND_API_URL geçersiz URL formatı\n";
    exit(1);
}

// HTTPS zorunluluğu (production güvenliği)
if (strpos($backendUrl, 'https://') !== 0 && strpos($backendUrl, 'http://localhost') !== 0) {
    echo "⚠️  UYARI: Backend URL HTTPS kullanmalı (güvenlik için)\n";
}

if (empty($apiKey)) {
    echo "❌ HATA: EMAIL_REPORT_API_KEY .env dosyasında tanımlı değil!\n";
    echo "   Vercel'de EMAIL_REPORT_API_KEY environment variable'ını set edin.\n";
    echo "   Veya .env dosyasına şunu ekleyin:\n";
    echo "   EMAIL_REPORT_API_KEY=your-api-key-here\n";
    exit(1);
}

// Güvenlik: API key minimum uzunluk kontrolü
if (strlen($apiKey) < 16) {
    echo "⚠️  UYARI: API key çok kısa (en az 16 karakter önerilir)\n";
}

// Tarih belirleme
$targetDate = null;
$args = array_slice($argv, 1);

if (in_array('--yesterday', $args)) {
    // Dünün tarihi (Türkiye saati)
    $dateTime = new DateTime('now', new DateTimeZone('Europe/Istanbul'));
    $dateTime->modify('-1 day');
    $targetDate = $dateTime->format('Y-m-d');
} else {
    // --date parametresi kontrolü
    foreach ($args as $arg) {
        if (strpos($arg, '--date=') === 0) {
            $targetDate = substr($arg, 7);
            break;
        }
    }
    
    // Belirtilmemişse bugünün tarihi (Türkiye saati)
    if ($targetDate === null) {
        $dateTime = new DateTime('now', new DateTimeZone('Europe/Istanbul'));
        $targetDate = $dateTime->format('Y-m-d');
    }
}

echo "🚀 Günlük Email Raporu Script Başlatıldı\n";
echo str_repeat('═', 50) . "\n";
echo "📅 Rapor tarihi: $targetDate\n";
echo "🔗 Backend URL: $backendUrl\n";
echo "\n";

// API endpoint URL
$apiUrl = rtrim($backendUrl, '/') . '/api/test-email';

// Request body
$data = [];
if ($targetDate) {
    $data['date'] = $targetDate;
}

// cURL ile API çağrısı
$ch = curl_init($apiUrl);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-Key: ' . $apiKey
    ],
    CURLOPT_POSTFIELDS => json_encode($data),
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
]);

echo "📡 API çağrısı yapılıyor...\n";

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

curl_close($ch);

// Hata kontrolü
if ($response === false) {
    echo "❌ cURL hatası: $curlError\n";
    exit(1);
}

// HTTP status kontrolü
if ($httpCode !== 200) {
    echo "❌ HTTP hatası: $httpCode\n";
    echo "📄 Response: $response\n";
    exit(1);
}

// Response parse et
$result = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ JSON parse hatası: " . json_last_error_msg() . "\n";
    echo "📄 Response: $response\n";
    exit(1);
}

// Sonuç kontrolü
if (isset($result['error'])) {
    echo "❌ API hatası: " . $result['error'] . "\n";
    if (isset($result['hint'])) {
        echo "💡 İpucu: " . $result['hint'] . "\n";
    }
    exit(1);
}

if (isset($result['success']) && $result['success'] === true) {
    echo "✅ Email başarıyla gönderildi!\n";
    echo "📅 Tarih: " . ($result['date'] ?? $targetDate) . "\n";
    echo str_repeat('═', 50) . "\n";
    exit(0);
} else {
    echo "❌ Beklenmeyen response: $response\n";
    exit(1);
}

