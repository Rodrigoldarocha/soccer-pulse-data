import { describe, it, expect } from "vitest";
import {
  BzzoiroApiError,
  BzzoiroTokenError,
  BzzoiroTimeoutError,
} from "../lib/bzzoiro/client.server";

describe("BzzoiroApiError", () => {
  it("creates error with correct name and message", () => {
    const err = new BzzoiroApiError(404, "Not Found", "/api/v2/predictions/", "body text");
    expect(err.name).toBe("BzzoiroApiError");
    expect(err.message).toContain("404");
    expect(err.message).toContain("Not Found");
    expect(err.message).toContain("/api/v2/predictions/");
    expect(err.statusCode).toBe(404);
    expect(err.responseBody).toBe("body text");
  });

  it("is instance of Error", () => {
    const err = new BzzoiroApiError(500, "Server Error", "/path", "");
    expect(err).toBeInstanceOf(Error);
  });

  it("isRetryable returns true for 429 and 5xx", () => {
    expect(new BzzoiroApiError(429, "", "/p").isRetryable()).toBe(true);
    expect(new BzzoiroApiError(500, "", "/p").isRetryable()).toBe(true);
    expect(new BzzoiroApiError(503, "", "/p").isRetryable()).toBe(true);
    expect(new BzzoiroApiError(404, "", "/p").isRetryable()).toBe(false);
    expect(new BzzoiroApiError(401, "", "/p").isRetryable()).toBe(false);
  });

  it("isAuthError returns true for 401 and 403", () => {
    expect(new BzzoiroApiError(401, "", "/p").isAuthError()).toBe(true);
    expect(new BzzoiroApiError(403, "", "/p").isAuthError()).toBe(true);
    expect(new BzzoiroApiError(404, "", "/p").isAuthError()).toBe(false);
  });

  it("isRateLimit returns true for 429", () => {
    expect(new BzzoiroApiError(429, "", "/p").isRateLimit()).toBe(true);
    expect(new BzzoiroApiError(404, "", "/p").isRateLimit()).toBe(false);
  });

  it("getUserMessage returns friendly message per status", () => {
    expect(new BzzoiroApiError(401, "Unauthorized", "/p").getUserMessage()).toContain(
      "Credenciais",
    );
    expect(new BzzoiroApiError(403, "Forbidden", "/p").getUserMessage()).toContain("Pro");
    expect(new BzzoiroApiError(429, "", "/p").getUserMessage()).toContain("Muitas");
    expect(new BzzoiroApiError(503, "", "/p").getUserMessage()).toContain("indisponível");
    expect(new BzzoiroApiError(418, "Teapot", "/p").getUserMessage()).toContain("Teapot");
  });
});

describe("BzzoiroTokenError", () => {
  it("creates error with correct name and message", () => {
    const err = new BzzoiroTokenError();
    expect(err.name).toBe("BzzoiroTokenError");
    expect(err.message).toContain("BZZOIRO_TOKEN");
  });
});

describe("BzzoiroTimeoutError", () => {
  it("creates error with correct name and message", () => {
    const err = new BzzoiroTimeoutError("/api/v2/predictions/", 10_000);
    expect(err.name).toBe("BzzoiroTimeoutError");
    expect(err.message).toContain("timeout");
    expect(err.message).toContain("/api/v2/predictions/");
    expect(err.message).toContain("10000");
  });
});
