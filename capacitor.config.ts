import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.groupbuild.app',
  appName: 'GroupBuild',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
  launchShowDuration: 2000,
  launchAutoHide: true,
  backgroundColor: "#0A1F3D",
  androidSplashResourceName: "splash",
  androidScaleType: "CENTER_CROP",
  showSpinner: false,
  splashFullScreen: true,
  splashImmersive: true,
},
Keyboard: {
      // "native" lets iOS smoothly resize the webview so inputs stay visible
      // and the page slides up instead of getting covered.
      resize: KeyboardResize.Native,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
