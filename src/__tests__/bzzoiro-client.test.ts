import { describe, it, expect } from "vitest";
import { BzzoiroApiError } from "../lib/bzzoiro/client.server";

describe("BzzoiroApiError", () => {
  it("creates error with correct name and message", () => {
    const err = new BzzoiroApiError(404, "Not Found", "/api/v2/predictions/", "body text");
    expect(err.name).toBe("BzzoiroApiError");
    expect(err.message).toContain("404");
    expect(err.message).toContain("Not Found");
    expect(err.message).toContain("/api/v2/predictions/");
    expect(err.status).toBe(404);
    expect(err.body).toBe("body text");
  });

  it("is instance of Error", () => {
    const err = new BzzoiroApiError(500, "Server Error", "/path", "");
    expect(err).toBeInstanceOf(Error);
  });
});
