import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    
    // Güvenlik: Default password kaldırıldı - Environment variable zorunlu
    const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD
    
    if (!DASHBOARD_PASSWORD) {
      console.error('❌ [SECURITY] DASHBOARD_PASSWORD environment variable tanımlı değil!')
      return NextResponse.json({ 
        success: false,
        message: 'Server configuration error' 
      }, { status: 500 })
    }
    
    if (password === DASHBOARD_PASSWORD) {
      // Şifre doğru - Session cookie oluştur
      const response = NextResponse.json({ 
        success: true,
        message: 'Giriş başarılı' 
      })
      
      // 7 gün geçerli session cookie
      response.cookies.set('dashboard_auth', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 gün
        path: '/'
      })
      
      return response
    } else {
      return NextResponse.json({ 
        success: false,
        message: 'Hatalı şifre' 
      }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      message: 'Bir hata oluştu' 
    }, { status: 500 })
  }
}

// Logout endpoint
export async function DELETE() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Çıkış başarılı' 
  })
  
  response.cookies.delete('dashboard_auth')
  
  return response
}

