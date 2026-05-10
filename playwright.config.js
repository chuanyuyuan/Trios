const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 15000,
  retries: 0,
  workers: 4,
  use: {
    baseURL: 'http://localhost:8080',
    browserName: 'chromium',
    headless: true,
    locale: 'zh-CN',
  },
  webServer: {
    command: 'npx http-server . -p 8080 --silent',
    port: 8080,
    timeout: 10000,
    reuseExistingServer: true,
  },
});
