import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = 3100;
const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`;

const artifactRunId =
  process.env.PLAYWRIGHT_ARTIFACT_RUN_ID ??
  `task-10-${new Date().toISOString().replace(/[:.]/g, "-")}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir:
    process.env.PLAYWRIGHT_OUTPUT_DIR ?? `test-results/${artifactRunId}`,
  retries: 0,
  reporter: [
    ["line"],
    [
      "html",
      {
        open: "never",
        outputFolder:
          process.env.PLAYWRIGHT_HTML_REPORT ??
          `playwright-report/${artifactRunId}`,
      },
    ],
  ],
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
