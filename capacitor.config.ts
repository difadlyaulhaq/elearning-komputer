import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alfajr.elearning',
  appName: 'Alfajr E-Learning',
  webDir: 'public', // Set to public due to PWA build config
  server: {
    // PRODUCTION MODE: Menggunakan domain sendiri (Ubuntu VPS)
    url: 'https://elearningalfajrumroh.com',
    allowNavigation: [
      "elearningalfajrumroh.com",
      "*.elearningalfajrumroh.com",
      "alfajr-elearning.vercel.app",
      "*.alfajr-elearning.vercel.app",
      "firebasestorage.googleapis.com",
      "*.googleapis.com",
      "*.firebaseapp.com",
      "*"
    ],
  },
  android: {
    appendUserAgent: " AlfajrApp/1.0"
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"],
      // Tambahkan konfigurasi ini
      // @ts-ignore
      serverClientId: "342608432294-6okq9uilstspcmrs7av1obn5859ktr32.apps.googleusercontent.com", 
    },
    PrivacyScreen: {
      enable: true,
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