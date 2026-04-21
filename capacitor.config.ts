import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.camilo.mydigitalwallet',
  appName: 'MyDigitalWallet',
  webDir: 'www',
  plugins: {
    SocialLogin: {
      google: {
        clientId: "539926553036-78lha7ur6odhnb5f8c94evnid1bcprgc.apps.googleusercontent.com"
      }
    },
    SplashScreen: {
      launchShowDuration: 2000,        // cuánto dura en ms
      launchAutoHide: true,            // se oculta automáticamente
      backgroundColor: "#0d1b2a",      // fondo azul oscuro igual al header
      androidSplashResourceName: "splash",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#4caf50"          // verde igual al acento de la app
    }
  }
};

export default config;