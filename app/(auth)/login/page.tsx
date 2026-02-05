'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader, Shield, Users, Smartphone, Globe } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
      // ... rest of handleLogin ...
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
       // ... error handling
       console.error('Login error:', error);
       setError(getErrorMessage(error.code));
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
            window.location.href = '/learning/dashboard'; // Native directly redirects here
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
      setError(getErrorMessage(error.code));
      setIsLoading(false);
    }
  };
  
  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-email': return 'Format email tidak valid';
      case 'auth/user-disabled': return 'Akun ini dinonaktifkan';
      case 'auth/user-not-found': return 'Email tidak terdaftar';
      case 'auth/wrong-password': return 'Password salah';
      case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi nanti.';
      default: return 'Terjadi kesalahan. Silakan coba lagi.';
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

      <div className="min-h-screen bg-black flex items-center justify-center p-0 sm:p-4">
        {/* Background Pattern Mobile */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #C5A059 1px, transparent 0)`,
            backgroundSize: isMobile ? '20px 20px' : '30px 30px'
          }}></div>
        </div>

        <div className="relative w-full max-w-md mx-auto h-screen sm:h-auto flex flex-col justify-center">
          {/* Mobile-Specific Header */}
          <div className="sm:hidden flex flex-col items-center justify-center pt-12 pb-6 px-4">
            <div className="bg-white p-3 rounded-xl shadow-md mb-4">
              <img 
                src="/logo-alfajr.png" 
                alt="Alfajr Umroh Logo" 
                className="w-28 h-auto object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1 text-center">
              Alfajr E-learning
            </h1>
            <p className="text-gray-300 text-xs text-center px-4">
              Silahkan Login Dengan Akun Pegawai Alfajr Anda
            </p>
          </div>

          {/* Desktop Header (hidden on mobile) */}
          <div className="hidden sm:block text-center mb-7">
            <div className="bg-white p-4 rounded-xl inline-block shadow-md mb-4">
              <img src="/logo-alfajr.png" alt="Alfajr Umroh Logo" className="w-40 h-auto object-contain"/>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Alfajr E-learning</h1>
            <p className="text-gray-400 text-sm mt-2">Silahkan Login Dengan Akun Pegawai Alfajr Anda</p>
          </div>

          {/* Login Card */}
          <div className={`
            ${isMobile ? 'rounded-t-3xl shadow-2xl flex-1 flex flex-col' : 'rounded-2xl shadow-2xl'}
            bg-white p-6 sm:p-8 mx-0 sm:mx-2 transition-all duration-300
          `}>
            <div className="flex-1">
              <div className="mb-6">
                <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-black`}>Selamat Datang</h2>
                <p className="text-gray-600 text-sm mt-1">Silakan login untuk melanjutkan</p>
              </div>

              {error && (
                <div className="text-sm p-4 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-semibold text-black mb-1 sm:mb-2">
                    Email Korporat
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      placeholder="nama@alfajrumroh.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                      disabled={isLoading}
                      className="w-full text-black text-sm sm:text-base pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:border-transparent outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-sm font-semibold text-black mb-1 sm:mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Masukkan password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      disabled={isLoading}
                      className="w-full text-black text-sm sm:text-base pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] focus:border-transparent outline-none transition-all disabled:opacity-50"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      disabled={isLoading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full flex items-center justify-center bg-[#C5A059] text-black font-bold py-3.5 sm:py-3 rounded-lg hover:bg-[#B08F4A] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed touch-button"
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
                                        <div className="w-full border-t border-gray-300"></div>
                                      </div>
                                      <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-500 text-xs">
                                          Atau login dengan
                                        </span>
                                      </div>
                                    </div>
                
                                    {/* Google SSO Button */}
                                    <button 
                                      type="button" 
                                      onClick={handleGoogleSSO} 
                                      disabled={isLoading}
                                      className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 touch-button"
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
                              </form>            </div>

            {/* Mobile Footer */}
            {isMobile && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-gray-400 text-[10px]">
                    © 2025 Alfajr Umroh. All rights reserved.
                  </p>
                  <p className="text-gray-400 text-[10px] mt-1">
                    Version 1.0.0 • Mobile Optimized
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Footer */}
          {!isMobile && (
            <div className="text-center mt-6 px-2">
              <p className="text-gray-400 text-sm">
                © 2025 Alfajr Umroh. All rights reserved.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Pilihan Role */}
      {showRoleChoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`
            ${isMobile ? 'p-6' : 'p-8'}
            bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center animate-slideUp
          `}>
            <div className="mb-6">
              <div className="w-12 h-12 bg-[#C5A059]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-[#C5A059]" size={24} />
              </div>
              <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-black mb-2`}>
                Login sebagai Admin
              </h2>
              <p className="text-gray-600 text-sm">
                Anda memiliki akses admin. Pilih tampilan dasbor yang ingin Anda buka.
              </p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-[#C5A059] text-black font-bold rounded-lg hover:bg-[#B08F4A] transition-colors shadow-lg touch-button"
              >
                <Shield size={20} />
                Buka Dasbor Admin
              </button>
              
              <button
                onClick={() => router.push('/learning/dashboard')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 touch-button"
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
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader className="animate-spin text-[#C5A059]" /></div>}>
            <LoginForm />
        </Suspense>
    );
}

export default LoginPage;