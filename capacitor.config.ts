import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fasttype.ai',
  appName: 'FastType AI Fixer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Add plugin configurations here if needed
  }
};

export default config;