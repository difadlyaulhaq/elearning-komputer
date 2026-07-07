'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader, Shield, Users, Smartphone, Globe, BookOpen } from 'lucide-react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { nativeSignInWithGoogle } from '@/lib/native-auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Adjust breakpoint as needed
    };

    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return_to');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simpan return_to jika ada (untuk jaga-jaga)
    if (returnTo) sessionStorage.setItem('auth_return_to', returnTo);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const token = await userCredential.user.getIdToken();
      
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('showLoginWarning', 'true'); // Flag to show warning on dashboard
        const userRole = result.user?.role?.trim().toLowerCase();
        sessionStorage.setItem('loggedInUserRole', userRole); // Store user role for dashboard logic
        router.replace('/learning/dashboard'); // Always redirect to learning dashboard first
      } else {
        setError(result.error || 'Login gagal. Silakan coba lagi.');
        setIsLoading(false);
      }
    } catch (error: any) {
       console.error('Login error:', error);
       const errCode = error?.code || error?.message || String(error);
       setError(getErrorMessage(errCode));
       setIsLoading(false);
    }
  };

  const handleGoogleSSO = async () => {
    setIsLoading(true);
    setError('');

    // Simpan return_to sebelum redirect
    if (returnTo) sessionStorage.setItem('auth_return_to', returnTo);

    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;

        if (idToken) {
          // --- SINKRONISASI KE WEB SDK ---
          // Ini CRITICAL: Supaya AuthContext di webview tau kalau kita sudah login
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);

          const res = await fetch('/api/auth/login-native', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: idToken }),
          });

          if (res.ok) {
            sessionStorage.setItem('showLoginWarning', 'true'); // Flag to show warning on dashboard
            const resData = await res.json(); // Assuming res.json() will contain user data
            const userRole = resData.user?.role?.trim().toLowerCase();
            sessionStorage.setItem('loggedInUserRole', userRole); // Store user role for dashboard logic
            window.location.href = '/learning/dashboard'; // Native langsung ke dashboard
            return;
          }
        }
        setIsLoading(false);
        return;
      }

      const userCredential = await nativeSignInWithGoogle();
      
      if (!userCredential || !userCredential.user) {
        setIsLoading(false);
        return;
      }

      const token = await userCredential.user.getIdToken();
      
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('showLoginWarning', 'true'); // Flag to show warning on dashboard
        const userRole = result.user?.role?.trim().toLowerCase();
        sessionStorage.setItem('loggedInUserRole', userRole); // Store user role for dashboard logic
        router.replace('/learning/dashboard'); // Always redirect to learning dashboard first
      } else {
        setError(result.error || 'SSO login gagal.');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Google SSO error:', error);
      const errCode = error?.code || error?.message || String(error);
      setError(getErrorMessage(errCode));
      setIsLoading(false);
    }
  };
  
  const getErrorMessage = (errorCode: any) => {
    if (!errorCode) return 'Terjadi kesalahan. Silakan coba lagi.';
    
    const codeStr = String(errorCode);
    
    switch (codeStr) {
      case 'auth/invalid-email': return 'Format email tidak valid';
      case 'auth/user-disabled': return 'Akun ini dinonaktifkan';
      case 'auth/user-not-found': return 'Email tidak terdaftar';
      case 'auth/wrong-password': return 'Password salah';
      case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi nanti.';
      case '10':
      case 'developer_error':
        return 'Google Play Services Error (Developer Error - Code 10). Pastikan SHA-1 sidik jari keystore sudah didaftarkan di Firebase Console.';
      case '12501':
      case 'canceled':
        return 'Google Sign-In dibatalkan atau bermasalah (Code 12501). Periksa Google Play Services perangkat Anda.';
      case '12500':
        return 'Google Sign-In gagal (Code 12500). Internal error.';
      default:
        if (codeStr.includes('10') || codeStr.toLowerCase().includes('developer_error')) {
          return `Google Play Services Developer Error (10). Pastikan SHA-1 sidik jari keystore sudah didaftarkan di Firebase Console. (Detail: ${codeStr})`;
        }
        if (codeStr.includes('12501')) {
          return `Google Sign-In dibatalkan atau bermasalah (12501). (Detail: ${codeStr})`;
        }
        return `Terjadi kesalahan (${codeStr}). Silakan coba lagi.`;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        @media (max-width: 640px) {
          input, button, textarea, select { font-size: 16px !important; }
          input:focus, textarea:focus, select:focus { font-size: 16px !important; }
        }
        .touch-button { -webkit-tap-highlight-color: transparent; user-select: none; }
        .touch-button:active { transform: scale(0.98); }
      `}} />

      <div 
        className="min-h-screen bg-[#01030e] flex items-center justify-center p-0 sm:p-4 relative overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% -20%, rgba(0, 102, 255, 0.25) 0%, transparent 60%),
            radial-gradient(circle at 10% 90%, rgba(0, 240, 255, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 90% 90%, rgba(0, 102, 255, 0.12) 0%, transparent 50%),
            linear-gradient(to right, rgba(0, 102, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 102, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px'
        }}
      >
        {/* Glowing Decorative Dots / Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-cyan-400 blur-sm animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-3.5 h-3.5 rounded-full bg-blue-500 blur-md animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 rounded-full bg-blue-600 blur-sm animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-cyan-300 blur-[2px] animate-pulse"></div>

        <div className="relative w-full max-w-md mx-auto h-screen sm:h-auto flex flex-col justify-center z-10">
          {/* Mobile-Specific Header */}
          <div className="sm:hidden flex flex-col items-center justify-center pt-12 pb-6 px-4">
            <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl shadow-xl mb-4 backdrop-blur-md text-white">
              <img 
                src="/LOGO INTER.png" 
                alt="Logo" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-xl font-bold text-white mb-1 text-center">
              Internasional Komputer E-Learning
            </h1>
            <p className="text-gray-400 text-xs text-center px-4">
              Silahkan Login Dengan Akun Pegawai Internasional Komputer Anda
            </p>
          </div>

          {/* Desktop Header (hidden on mobile) */}
          <div className="hidden sm:block text-center mb-6">
            <div className="bg-white/5 border border-white/10 p-4 rounded-3xl inline-block shadow-2xl mb-4 backdrop-blur-md text-white">
              <img src="/LOGO INTER.png" alt="Logo" className="w-24 h-24 object-contain"/>
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">INTERNASIONAL KOMPUTER</h1>
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest mt-1">E-Learning Platform</h2>
          </div>

          {/* Login Card */}
          <div className={`
            ${isMobile ? 'rounded-t-3xl border-t border-white/10' : 'rounded-2xl border border-white/10'}
            bg-[#090d22]/80 backdrop-blur-xl p-6 sm:p-8 mx-0 sm:mx-2 transition-all duration-300 shadow-2xl
          `}>
            <div className="flex-grow">
              <div className="mb-6">
                <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-white`}>Selamat Datang</h2>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">Silakan login untuk melanjutkan</p>
              </div>

              {error && (
                <div className="text-sm p-4 mb-4 bg-red-950/50 border border-red-500/30 text-red-200 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-semibold text-white/95 mb-1.5">
                    Email Korporat
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-white/40" size={18} />
                    <input 
                      type="email" 
                      placeholder="nama@company.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                      disabled={isLoading}
                      className="w-full text-white text-sm sm:text-base pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none transition-all disabled:opacity-50 placeholder-white/30"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-semibold text-white/95 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-white/40" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Masukkan password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      disabled={isLoading}
                      className="w-full text-white text-sm sm:text-base pl-11 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-[#0066FF] focus:border-transparent outline-none transition-all disabled:opacity-50 placeholder-white/30"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      disabled={isLoading}
                      className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70 disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      className="rounded border-white/10 bg-white/5 text-[#0066FF] focus:ring-[#0066FF] h-4 w-4"
                    />
                    <span className="ml-2 text-xs sm:text-sm text-white/70">Ingat Saya</span>
                  </label>
                </div>

                {/* Login Button */}
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full flex items-center justify-center bg-[#0066FF] text-white font-bold py-3.5 sm:py-3 rounded-lg hover:bg-[#0052CC] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-button"
                >
                  {isLoading ? (
                    <>
                      <Loader className="animate-spin mr-2" size={18} />
                      <span>Loading...</span>
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
                
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#090d22] text-white/50 text-xs">
                      Atau login dengan
                    </span>
                  </div>
                </div>
                
                {/* Google SSO Button */}
                <button 
                  type="button" 
                  onClick={handleGoogleSSO} 
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-3 bg-white/5 border border-white/10 text-white font-semibold py-3 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50 touch-button"
                >
                  {isLoading ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-sm">Login with Google</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Mobile Footer */}
            {isMobile && (
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-center">
                  <p className="text-white/40 text-[10px]">
                    © 2026 Internasional Komputer. All rights reserved.
                  </p>
                  <p className="text-white/40 text-[10px] mt-1">
                    Version 1.0.0 • Mobile Optimized
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Footer */}
          {!isMobile && (
            <div className="text-center mt-6 px-2">
              <p className="text-white/40 text-sm">
                © 2026 Internasional Komputer. All rights reserved.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pilihan Role */}
      {showRoleChoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`
            ${isMobile ? 'p-6' : 'p-8'}
            bg-[#090d22] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm text-center animate-slideUp
          `}>
            <div className="mb-6">
              <div className="w-12 h-12 bg-[#0066FF]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-[#0066FF]" size={24} />
              </div>
              <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-white mb-2`}>
                Login sebagai Admin
              </h2>
              <p className="text-gray-400 text-sm">
                Anda memiliki akses admin. Pilih tampilan dasbor yang ingin Anda buka.
              </p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-[#0066FF] text-white font-bold rounded-lg hover:bg-[#0052CC] transition-colors shadow-lg touch-button"
              >
                <Shield size={20} />
                Buka Dasbor Admin
              </button>
              
              <button
                onClick={() => router.push('/learning/dashboard')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-white/5 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors border border-white/10 touch-button"
              >
                <Users size={20} />
                Buka sebagai Pegawai
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

const LoginPage = () => {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#01030e] flex items-center justify-center"><Loader className="animate-spin text-[#0066FF]" /></div>}>
            <LoginForm />
        </Suspense>
    );
}

export default LoginPage;