import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { accept, matchesAccept } from "../accept.js";

describe("accept", () => {
  it("should return action object", () => {
    expect(accept(["image/png", "image/*"], "message")).toMatchObject({
      kind: "validation",
      type: "accept",
      reference: accept,
      expects: '("image/png" | "image/*")',
      requirement: ["image/png", "image/*"],
      async: false,
      message: "message"
    });
  });

  it("should match exact types and globs like a PDS does", () => {
    expect(matchesAccept(["image/png"], "image/png")).toBe(true);
    expect(matchesAccept(["image/png"], "image/jpeg")).toBe(false);
    expect(matchesAccept(["image/*"], "image/jpeg")).toBe(true);
    expect(matchesAccept(["image/*"], "video/mp4")).toBe(false);
    expect(matchesAccept(["*/*"], "application/octet-stream")).toBe(true);
    // A glob only matches whole subtypes, never a prefix of the type.
    expect(matchesAccept(["image/*"], "imagex/png")).toBe(false);
  });

  it("should validate MIME type strings", () => {
    const schema = v.pipe(v.string(), accept(["image/*"]));
    expect(v.safeParse(schema, "image/webp").success).toBe(true);
    const result = v.safeParse(schema, "text/plain");
    expect(result.success).toBe(false);
    expect(result.issues?.[0]?.message).toBe(
      'Invalid MIME type: Expected "image/*" but received "text/plain"'
    );
  });
});
