import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alfajr.elearning',
  appName: 'Alfajr E-Learning',
  webDir: 'public', // Set to public due to PWA build config
  server: {
    // LOCAL DEVELOPMENT MODE (Emulator)
    url: 'http://10.0.2.2:3000',
    cleartext: true,
    allowNavigation: [
      "10.0.2.2",
      "alfajr-elearning.vercel.app",
      "*.alfajr-elearning.vercel.app"
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