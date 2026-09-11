import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: "http://localhost:3217", headless: true },
  webServer: {
    command: "npm run start -- --port 3217",
    url: "http://localhost:3217",
    reuseExistingServer: false,
    timeout: 60000,
  },
  reporter: "list",
});
