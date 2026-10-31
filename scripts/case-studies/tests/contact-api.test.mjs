import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { afterEach, test } from "node:test";

const require = createRequire(import.meta.url);
const handler = require("../../../api/contact.js");
const originalFetch = globalThis.fetch;
const originalApiKey = process.env.EMAIL_SERVICE_API_KEY;
const originalRecipient = process.env.TO_EMAIL;

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.EMAIL_SERVICE_API_KEY;
  else process.env.EMAIL_SERVICE_API_KEY = originalApiKey;
  if (originalRecipient === undefined) delete process.env.TO_EMAIL;
  else process.env.TO_EMAIL = originalRecipient;
});

test("contact handler accepts a mocked provider response without making a network request", async () => {
  process.env.EMAIL_SERVICE_API_KEY = "test-only-api-key";
  process.env.TO_EMAIL = "test@example.test";
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return { ok: true };
  };
  const res = createResponse();

  await handler({
    method: "POST",
    body: { name: "Test User", email: "user@example.test", message: "No real email" }
  }, res);

  assert.equal(requestUrl, "https://api.resend.com/emails");
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.headers.Authorization, "Bearer test-only-api-key");
  assert.deepEqual(res.body, { success: true });
  assert.equal(res.statusCode, 200);
});

test("contact handler returns a sanitized provider error", async () => {
  process.env.EMAIL_SERVICE_API_KEY = "test-only-api-key";
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    text: async () => "sensitive provider diagnostics"
  });
  const res = createResponse();

  await handler({
    method: "POST",
    body: { name: "Test User", email: "user@example.test" }
  }, res);

  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.body, { error: "Email provider error" });
  assert.equal(JSON.stringify(res.body).includes("sensitive"), false);
});

test("contact handler does not call the provider for invalid requests", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Unexpected network request");
  };
  const res = createResponse();

  await handler({ method: "GET" }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { error: "Method Not Allowed" });
  assert.equal(fetchCalled, false);
});
