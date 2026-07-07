import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elearninginternasionalkomp',
  appName: 'Internasional Komputer E-Learning',
  webDir: 'public', // Set to public due to PWA build config
  server: {
    // PRODUCTION MODE: Menggunakan domain sendiri (Ubuntu VPS)
    url: 'https://elearninginternasionalkomp.web.id',
    allowNavigation: [
      "elearninginternasionalkomp.web.id",
      "*.elearninginternasionalkomp.web.id",
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
      serverClientId: "237681279253-tu2j5l7pdpti9lsm707c429gkvc0bqai.apps.googleusercontent.com", 
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