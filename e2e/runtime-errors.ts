import {
  expect,
  test as base,
  type ConsoleMessage,
  type Page,
  type Request,
} from "@playwright/test";

type RuntimeErrorCollector = {
  assertEmpty: () => void;
};

function formatConsoleError(message: ConsoleMessage) {
  const location = message.location();
  const source = location.url
    ? ` (${location.url}:${location.lineNumber}:${location.columnNumber})`
    : "";

  return `${message.text()}${source}`;
}

function formatFailedRequest(request: Request) {
  const failure = request.failure()?.errorText ?? "unknown request failure";
  return `${request.method()} ${request.url()} — ${failure}`;
}

function isSameOriginRequest(page: Page, request: Request) {
  try {
    const pageOrigin = new URL(page.url()).origin;
    return (
      pageOrigin !== "null" && new URL(request.url()).origin === pageOrigin
    );
  } catch {
    return false;
  }
}

export function attachRuntimeErrorCollector(page: Page): RuntimeErrorCollector {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedSameOriginRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(formatConsoleError(message));
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.stack ?? error.message);
  });

  page.on("requestfailed", (request) => {
    if (isSameOriginRequest(page, request)) {
      failedSameOriginRequests.push(formatFailedRequest(request));
    }
  });

  return {
    assertEmpty() {
      expect(consoleErrors, "console.error messages").toEqual([]);
      expect(pageErrors, "uncaught page errors").toEqual([]);
      expect(
        failedSameOriginRequests,
        "failed same-origin requests",
      ).toEqual([]);
    },
  };
}

type RuntimeFixtures = {
  runtimeErrorCollector: RuntimeErrorCollector;
};

export const test = base.extend<RuntimeFixtures>({
  runtimeErrorCollector: [
    async ({ page }, use) => {
      const collector = attachRuntimeErrorCollector(page);
      await use(collector);
      collector.assertEmpty();
    },
    { auto: true },
  ],
});

export { expect };
