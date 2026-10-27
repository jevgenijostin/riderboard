import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://127.0.0.1:4173/riderboard/', browserName: 'chromium' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://127.0.0.1:4173/riderboard/',
    reuseExistingServer: false,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  workers: 1,
});
