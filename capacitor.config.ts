import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alfajr.elearning',
  appName: 'Alfajr E-Learning',
  webDir: 'public',
  server: {
    // 🔴 UNTUK DEVELOPMENT: Ganti URL dengan IP lokal Anda.
    // Jalankan `ipconfig` (Windows) atau `ifconfig` (Mac/Linux) untuk menemukan IP Anda.
    // Contoh: 'http://192.168.1.10:3000'
    url: 'http://10.107.217.17:3000',
    cleartext: true,
    androidScheme: 'http'
  },
  plugins: {
    PrivacyScreen: {
      enable: false,
      imageName: 'Splash',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false
    },
  },
};

export default config;
