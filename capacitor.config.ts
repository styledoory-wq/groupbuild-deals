import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6b860cbcd9e9429eb2ee0ed4e79df143',
  appName: 'groupbuild-deals',
  webDir: 'dist',
  server: {
    url: 'https://6b860cbc-d9e9-429e-b2ee-0ed4e79df143.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
