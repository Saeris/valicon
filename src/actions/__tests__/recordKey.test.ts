import { describe, expect, it } from "vitest";
import * as v from "valibot";
import { readInteropFixture } from "../../__tests__/fixtures/interop.js";
import { recordKey } from "../recordKey.js";

describe("recordKey", () => {
  const schema = v.pipe(v.string(), recordKey());

  it("should return action object", () => {
    expect(recordKey("message")).toMatchObject({
      kind: "validation",
      type: "record_key",
      reference: recordKey,
      expects: null,
      async: false,
      message: "message"
    });
  });

  describe("should accept valid interop record keys", () => {
    it.each(readInteropFixture("recordkey_syntax_valid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(true);
    });
  });

  describe("should reject invalid interop record keys", () => {
    it.each(readInteropFixture("recordkey_syntax_invalid"))("%s", (value) => {
      expect(v.safeParse(schema, value).success).toBe(false);
    });
  });

  it("should reject the path traversal values", () => {
    // "." and "..." pass the character rules but are reserved by the spec
    // because they would be ambiguous as repository path segments.
    expect(v.safeParse(schema, ".").success).toBe(false);
    expect(v.safeParse(schema, "..").success).toBe(false);
    expect(v.safeParse(schema, "...").success).toBe(true);
  });
});
